import { GameObjects, Math as PMath, Scene } from 'phaser';
import { BOSS, CHUDS, DEPTH, VIEW_WIDTH } from '../config';
import type { Chud } from '../entities/Chud';
import type { ChudHorde } from './ChudHorde';
import type { Oranges } from './Oranges';
import type { Positioned } from './SpatialGrid';

const BAR_BORDER = 2;
const BAR_GAP_ABOVE_SPRITE = 4;
const BANNER_FADE_MS = 600;

export class BossDirector
{
    private boss: Chud | null = null;
    private nextAt = BOSS.firstAt;
    private appearances = 0;
    private elapsed = 0;
    private aliveFor = 0;
    private readonly ui: GameObjects.Container;
    private readonly fill: GameObjects.Rectangle;
    private readonly nameText: GameObjects.Text;
    private readonly banner: GameObjects.Text;

    constructor (private readonly scene: Scene, private readonly horde: ChudHorde, private readonly oranges: Oranges)
    {
        const { barWidth: w, barHeight: h } = BOSS;

        this.nameText = scene.add.text(0, -h - BAR_BORDER * 2, '', {
            fontFamily: 'Arial Black', fontSize: 13, color: '#ffd84a',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5, 1);

        const back = scene.add.rectangle(0, -h / 2, w + BAR_BORDER * 2, h + BAR_BORDER * 2, 0x000000);
        const missing = scene.add.rectangle(-w / 2, -h / 2, w, h, 0x4a1410).setOrigin(0, 0.5);
        this.fill = scene.add.rectangle(-w / 2, -h / 2, w, h, 0xd9483b).setOrigin(0, 0.5);

        this.ui = scene.add.container(0, 0, [back, missing, this.fill, this.nameText])
            .setDepth(DEPTH.bossBar)
            .setVisible(false);

        this.banner = scene.add.text(VIEW_WIDTH / 2, 84, '', {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffd84a',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud).setAlpha(0);
    }

    update (elapsed: number, target: Positioned)
    {
        const dt = Math.max(0, elapsed - this.elapsed);
        this.elapsed = elapsed;

        if (!this.boss && elapsed >= this.nextAt)
        {
            this.spawn(target);
        }

        if (this.boss)
        {
            this.aliveFor += dt;
            const mult = Math.min(
                BOSS.speedMaxMultiplier,
                1 + this.aliveFor * BOSS.speedGainPerSecond,
            );
            this.boss.speed = this.boss.baseSpeed * mult;

            const sprite = this.boss.sprite;

            this.ui.setPosition(sprite.x, sprite.y - sprite.displayHeight / 2 - BAR_GAP_ABOVE_SPRITE);
            this.fill.setScale(Math.max(0, this.boss.hp / this.boss.maxHp), 1);
        }
    }

    forceSpawn (target: Positioned)
    {
        if (!this.boss)
        {
            this.spawn(target);
        }
    }

    /** Returns true if the kill was the boss (and its reward has been dropped). */
    onKill (chud: Chud): boolean
    {
        if (chud !== this.boss)
        {
            return false;
        }

        for (let i = 0; i < BOSS.orangeCount; i++)
        {
            const angle = Math.random() * PMath.TAU;
            const r = Math.sqrt(Math.random()) * BOSS.orangeScatter;
            this.oranges.drop(chud.x + Math.cos(angle) * r, chud.y + Math.sin(angle) * r, BOSS.orangeValue);
        }

        this.boss = null;
        this.aliveFor = 0;
        this.ui.setVisible(false);
        this.nextAt = this.elapsed + BOSS.respawnAfter;
        this.announce(`${CHUDS[chud.kind].bossName} has been flushed!`);
        return true;
    }

    private spawn (target: Positioned)
    {
        const kind = BOSS.order[this.appearances % BOSS.order.length];
        const lap = Math.floor(this.appearances / BOSS.order.length);
        const def = CHUDS[kind];
        const boss = this.horde.spawnAtEdge(kind, target, this.elapsed);

        if (!boss)
        {
            return;
        }

        // Lap growth stacks on top of the run-time scale applied in spawnAtEdge.
        const lapMult = BOSS.hpGrowthPerLap ** lap;
        boss.maxHp = Math.max(1, Math.round(boss.maxHp * lapMult));
        boss.hp = boss.maxHp;
        boss.speed = boss.baseSpeed;
        this.aliveFor = 0;
        this.appearances++;
        this.boss = boss;

        this.nameText.setText(def.bossName ?? '');
        this.ui.setVisible(true);
        this.announce(`${def.bossName} approaches!`);
    }

    private announce (text: string)
    {
        this.scene.tweens.killTweensOf(this.banner);
        this.banner.setText(text).setAlpha(1);
        this.scene.tweens.add({
            targets: this.banner,
            alpha: 0,
            delay: BOSS.bannerSeconds * 1000,
            duration: BANNER_FADE_MS,
        });
    }
}
