import { GameObjects, Math as PMath, Scene, Scenes } from 'phaser';
import {
    applyAugment,
    applySingleMindedWeapon,
    describeAugment,
    describeWeaponKeep,
    isMythicalLevel,
    rollMythicalChoices,
} from '../augments';
import {
    AUGMENTS, CAMERA_LERP, CHUDS, DEPTH, MAX_CHUD_RADIUS, PLAYER, PLAYER_RADIUS,
    TEXTURES, VIEW_WIDTH, WEAPONS, WORLD_HEIGHT, WORLD_WIDTH,
} from '../config';
import type { Chud } from '../entities/Chud';
import { Player } from '../entities/Player';
import { BossDirector } from '../systems/BossDirector';
import { Bullets, createShot } from '../systems/Bullets';
import { ChudHorde } from '../systems/ChudHorde';
import { Combat } from '../systems/Combat';
import { Effects } from '../systems/Effects';
import { ensureMusic } from '../systems/Music';
import { Oranges } from '../systems/Oranges';
import { Progression } from '../systems/Progression';
import { WeaponRack } from '../systems/WeaponRack';
import { playLevelUp, playOrangePickup } from '../systems/Sfx';
import { VirtualJoystick } from '../systems/VirtualJoystick';
import { applyChoice, describeChoice, rollChoices, summarizeStats } from '../upgrades';
import { isTouchUi } from '../../mobile';
import type { LevelUpData } from './LevelUp';
import type { PauseData } from './Pause';

const MAX_FRAME_SECONDS = 0.1;
const XP_BAR = { x: 12, y: 12, width: 220, height: 16 };
const HP_BAR = { x: 12, y: 34, width: 220, height: 12 };

export class Game extends Scene
{
    private player: Player;
    private horde: ChudHorde;
    private boss: BossDirector;
    private rack: WeaponRack;
    private bullets: Bullets;
    private effects: Effects;
    private combat: Combat;
    private oranges: Oranges;
    private progression: Progression;
    private elapsed: number;
    private timerText: GameObjects.Text;
    private orangeText: GameObjects.Text;
    private levelText: GameObjects.Text;
    private xpFill: GameObjects.Rectangle;
    private hpFill: GameObjects.Rectangle;
    private livesText: GameObjects.Text;
    private chudnessAcc = 0;
    private joystick: VirtualJoystick | null = null;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.elapsed = 0;
        this.chudnessAcc = 0;

        this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, TEXTURES.ground).setOrigin(0);

        this.progression = new Progression();
        this.oranges = new Oranges(this);
        this.horde = new ChudHorde(this);
        this.bullets = new Bullets(this);
        this.effects = new Effects(this);
        this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.combat = new Combat(this, this.horde, this.effects, this.player, this.onKill);
        this.rack = new WeaponRack(this, this.player);
        this.rack.add('pistol');

        const camera = this.cameras.main;
        camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        camera.startFollow(this.player.sprite, true, CAMERA_LERP, CAMERA_LERP);

        this.createHud();
        this.createPauseButton();
        this.boss = new BossDirector(this, this.horde, this.oranges);
        ensureMusic(this);

        if (isTouchUi())
        {
            this.joystick = new VirtualJoystick(this);
        }

        this.events.on(Scenes.Events.RESUME, () => {
            this.input.keyboard?.resetKeys();
            this.player.setStick(0, 0, false);
        });
        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.joystick?.destroy();
            this.joystick = null;
        });

        this.input.keyboard?.on('keydown-ESC', () => this.openPause());
        this.input.keyboard?.on('keydown-P', () => this.openPause());

        if (import.meta.env.DEV)
        {
            this.input.keyboard?.on('keydown-G', () => this.rack.add('pistol'));
            this.input.keyboard?.on('keydown-B', () => this.boss.forceSpawn(this.player));
            this.input.keyboard?.on('keydown-M', () => this.debugMythical());
        }
    }

    update (_time: number, delta: number)
    {
        if (this.openLevelUp())
        {
            return;
        }

        const dt = Math.min(delta / 1000, MAX_FRAME_SECONDS);
        this.elapsed += dt;

        if (this.joystick)
        {
            this.player.setStick(this.joystick.vector.x, this.joystick.vector.y, this.joystick.active);
        }

        this.player.update(dt);
        this.horde.update(dt, this.elapsed, this.player);
        this.resolveContact(dt);
        this.rack.update(dt, this.combat, this.bullets, this.player.stats);
        this.bullets.update(dt, this.combat);
        this.effects.update(dt);
        this.boss.update(this.elapsed, this.player);
        this.oranges.update(dt, this.player, this.onCollect);

        this.updateHud();

        if (!this.player.alive && !this.player.tryExtraLife())
        {
            this.scene.start('GameOver', { oranges: this.player.oranges });
        }
    }

    /** Highest contact damage among overlapping chuds wins for this invuln window. */
    private resolveContact (dt: number)
    {
        if (!this.player.alive)
        {
            return;
        }

        let worst = 0;
        const touching: Chud[] = [];

        this.horde.grid.forEachInRadius(
            this.player.x,
            this.player.y,
            PLAYER_RADIUS + MAX_CHUD_RADIUS,
            chud => {
                if (!chud.alive)
                {
                    return;
                }

                const reach = PLAYER_RADIUS + chud.radius;

                if ((chud.x - this.player.x) ** 2 + (chud.y - this.player.y) ** 2 <= reach * reach)
                {
                    worst = Math.max(worst, chud.contactDamage);
                    touching.push(chud);
                }
            },
        );

        if (this.player.hasAugment('chudness') && touching.length > 0)
        {
            this.chudnessAcc += dt;

            while (this.chudnessAcc >= 0.2)
            {
                this.chudnessAcc -= 0.2;

                for (const chud of touching)
                {
                    if (chud.alive)
                    {
                        this.combat.hit(chud, AUGMENTS.chudness.contactDamage);
                    }
                }
            }
        }

        if (worst > 0 && !this.player.invulnerable)
        {
            this.player.takeDamage(worst);
        }
    }

    private openLevelUp (): boolean
    {
        const level = this.progression.takePendingLevel();

        if (level === null)
        {
            return false;
        }

        this.player.healFraction(PLAYER.levelUpHeal);

        if (isMythicalLevel(level))
        {
            this.openMythicalLevelUp(level);
        }
        else
        {
            this.openNormalLevelUp(level);
        }

        return true;
    }

    private openNormalLevelUp (level: number)
    {
        const { stats } = this.player;
        const choices = rollChoices(this.rack, this.player);
        const data: LevelUpData = {
            level,
            cards: choices.map(choice => describeChoice(choice, stats, this.rack, this.player)),
            statsLine: this.statsLine(),
            onPick: index => {
                applyChoice(choices[index], stats, this.rack, this.player);
                this.scene.resume();
            },
        };

        this.updateHud();
        playLevelUp(this);
        this.scene.pause();
        this.scene.launch('LevelUp', data);
    }

    private openMythicalLevelUp (level: number)
    {
        const picks = rollMythicalChoices(this.player);

        if (picks.length === 0)
        {
            this.openNormalLevelUp(level);
            return;
        }

        const data: LevelUpData = {
            level,
            mythical: true,
            cards: picks.map(describeAugment),
            statsLine: this.statsLine(),
            onPick: index => {
                const id = picks[index];
                applyAugment(id, this.player, this.rack);

                if (id === 'singleMinded')
                {
                    return this.singleMindedFollowUp();
                }

                this.scene.resume();
            },
        };

        this.updateHud();
        playLevelUp(this);
        this.scene.pause();
        this.scene.launch('LevelUp', data);
    }

    private createPauseButton ()
    {
        const x = VIEW_WIDTH - 28;
        const y = 28;
        const bg = this.add.circle(x, y, 18, 0x101610, 0.85)
            .setStrokeStyle(2, 0xffa500)
            .setScrollFactor(0)
            .setDepth(DEPTH.hud)
            .setInteractive({ useHandCursor: true });

        this.add.text(x, y - 1, '||', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud);

        bg.on('pointerup', () => this.openPause());
    }

    private openPause ()
    {
        if (
            this.scene.isPaused()
            || this.scene.isActive('LevelUp')
            || this.scene.isActive('Pause')
        )
        {
            return;
        }

        const data: PauseData = {
            oranges: this.player.oranges,
            level: this.progression.level - this.progression.pendingLevelUps,
            elapsed: this.elapsed,
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            extraLives: this.player.extraLives,
            statsLine: this.statsLine(),
            weapons: this.rack.kinds.map(kind => WEAPONS[kind].name),
            augments: this.player.ownedAugments.map(id => id.toUpperCase()),
            onResume: () => {
                this.scene.resume();
            },
            onRestart: () => {
                this.scene.stop('Pause');
                this.scene.start('Game');
            },
            onEnd: () => {
                this.scene.stop('Pause');
                this.scene.start('GameOver', { oranges: this.player.oranges });
            },
        };

        this.player.setStick(0, 0, false);
        this.scene.pause();
        this.scene.launch('Pause', data);
    }

    private singleMindedFollowUp (): LevelUpData
    {
        const kinds = this.rack.uniqueKinds.length > 0 ? this.rack.uniqueKinds : ['pistol' as const];

        return {
            level: this.progression.level,
            mythical: true,
            title: 'SINGLE MINDED',
            subtitle: 'Pick the weapon you keep',
            cards: kinds.map(describeWeaponKeep),
            statsLine: this.statsLine(),
            onPick: index => {
                applySingleMindedWeapon(kinds[index], this.player, this.rack);
                this.scene.resume();
            },
        };
    }

    private statsLine ()
    {
        return summarizeStats(
            this.player.stats,
            this.player.extraLives,
            this.player.ownedAugments.map(id => id.toUpperCase()),
        );
    }

    private createHud ()
    {
        const xp = XP_BAR;
        const hp = HP_BAR;

        this.add.rectangle(xp.x - 2, xp.y - 2, xp.width + 4, xp.height + 4, 0x000000)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.hud);
        this.add.rectangle(xp.x, xp.y, xp.width, xp.height, 0x3a2a10)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.hud);
        this.xpFill = this.add.rectangle(xp.x, xp.y, xp.width, xp.height, 0xffa500)
            .setOrigin(0).setScale(0, 1).setScrollFactor(0).setDepth(DEPTH.hud);

        this.add.rectangle(hp.x - 2, hp.y - 2, hp.width + 4, hp.height + 4, 0x000000)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.hud);
        this.add.rectangle(hp.x, hp.y, hp.width, hp.height, 0x3a1010)
            .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.hud);
        this.hpFill = this.add.rectangle(hp.x, hp.y, hp.width, hp.height, 0xe23b3b)
            .setOrigin(0).setScale(1, 1).setScrollFactor(0).setDepth(DEPTH.hud);

        this.levelText = this.add.text(xp.x + xp.width + 10, xp.y - 4, 'LV 1', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5,
        }).setScrollFactor(0).setDepth(DEPTH.hud);

        this.add.image(24, 66, TEXTURES.orange).setScale(2).setScrollFactor(0).setDepth(DEPTH.hud);

        this.orangeText = this.add.text(42, 53, 'x 0', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5,
        }).setScrollFactor(0).setDepth(DEPTH.hud);

        this.livesText = this.add.text(xp.x + xp.width + 10, hp.y - 2, '', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ff6b9d',
            stroke: '#000000', strokeThickness: 4,
        }).setScrollFactor(0).setDepth(DEPTH.hud);

        this.timerText = this.add.text(VIEW_WIDTH / 2, 12, '00:00', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    }

    private updateHud ()
    {
        this.xpFill.setScale(Math.min(1, this.progression.progress), 1);
        this.hpFill.setScale(Math.max(0, this.player.hp / this.player.maxHp), 1);
        this.levelText.setText(`LV ${this.progression.level - this.progression.pendingLevelUps}`);
        this.orangeText.setText(`x ${this.player.oranges}`);
        this.livesText.setText(this.player.extraLives > 0 ? `+${this.player.extraLives} LIFE` : '');
        this.timerText.setText(formatTime(this.elapsed));
    }

    private fireSplitterStar (x: number, y: number)
    {
        const shot = createShot();
        Object.assign(shot, {
            damage: AUGMENTS.splitter.damage * this.player.stats.damage,
            speed: AUGMENTS.splitter.speed,
            pierce: AUGMENTS.splitter.pierce,
            range: AUGMENTS.splitter.range,
            texture: TEXTURES.bullet,
            hitRadius: 4,
            faceVelocity: true,
        });

        for (let i = 0; i < AUGMENTS.splitter.rays; i++)
        {
            this.bullets.fire(x, y, (i * PMath.TAU) / AUGMENTS.splitter.rays, shot);
        }
    }

    private fireGluttonyShot ()
    {
        let aim = Math.random() * PMath.TAU;
        let best = Infinity;

        this.horde.grid.forEachInRadius(
            this.player.x, this.player.y, AUGMENTS.gluttony.range + MAX_CHUD_RADIUS, chud => {
                if (!chud.alive)
                {
                    return;
                }

                const dist = Math.hypot(chud.x - this.player.x, chud.y - this.player.y);

                if (dist < best)
                {
                    best = dist;
                    aim = Math.atan2(chud.y - this.player.y, chud.x - this.player.x);
                }
            },
        );

        // Lobbed shots only explode at end of travel — land on the target, not past them.
        const range = Number.isFinite(best)
            ? Math.min(AUGMENTS.gluttony.range, Math.max(24, best))
            : AUGMENTS.gluttony.range;

        const shot = createShot();
        Object.assign(shot, {
            damage: AUGMENTS.gluttony.damage * this.player.stats.damage,
            speed: AUGMENTS.gluttony.speed,
            pierce: 0,
            range,
            texture: TEXTURES.orange,
            hitRadius: 7,
            spin: 8,
            explodeRadius: AUGMENTS.gluttony.explodeRadius,
        });

        this.bullets.fire(this.player.x, this.player.y, aim, shot);
    }

    private readonly onKill = (chud: Chud) => {
        if (this.player.hasAugment('splitter'))
        {
            this.fireSplitterStar(chud.x, chud.y);
        }

        if (!this.boss.onKill(chud))
        {
            let value = CHUDS[chud.kind].xp;

            if (this.player.hasAugment('farmer') && Math.random() < AUGMENTS.farmerDoubleChance)
            {
                value *= 2;
            }

            this.oranges.drop(chud.x, chud.y, value);
        }
    };

    private readonly onCollect = (value: number) => {
        playOrangePickup(this);
        this.progression.addXp(value);

        if (this.player.hasAugment('gluttony'))
        {
            this.fireGluttonyShot();
        }
    };

    /** Dev helper: force a mythical orange pick right now. */
    private debugMythical ()
    {
        if (this.scene.isPaused() || this.scene.isActive('LevelUp'))
        {
            return;
        }

        this.openMythicalLevelUp(this.progression.level);
    }
}

function formatTime (seconds: number)
{
    const s = Math.floor(seconds);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
}
