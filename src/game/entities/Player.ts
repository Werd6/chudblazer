import { GameObjects, Input, Math as PMath, Scene, TintModes } from 'phaser';
import type { AugmentId } from '../augments';
import { AUGMENTS, DEPTH, PLAYER, PLAYER_SPEED, PLAYER_SPRITE, TEXTURES, WORLD_HEIGHT, WORLD_WIDTH } from '../config';
import { createStats } from '../stats';

type MoveKeys = {
    up: Input.Keyboard.Key[];
    down: Input.Keyboard.Key[];
    left: Input.Keyboard.Key[];
    right: Input.Keyboard.Key[];
};

export class Player
{
    readonly sprite: GameObjects.Image;
    readonly stats = createStats();
    oranges = 0;
    maxHp = PLAYER.maxHp;
    hp = PLAYER.maxHp;
    extraLives = 0;
    private readonly augments = new Set<AugmentId>();
    private invulnLeft = 0;
    private flashLeft = 0;
    private dodgedFlash = false;
    private steroidsAcc = 0;
    private readonly keys: MoveKeys;
    private readonly dir = new PMath.Vector2();
    private readonly stick = new PMath.Vector2();
    private stickActive = false;
    private walkPhase = 0;

    constructor (scene: Scene, x: number, y: number)
    {
        this.sprite = scene.add.image(x, y, TEXTURES.capybaraStand)
            .setScale(PLAYER_SPRITE.textureScale)
            .setDepth(DEPTH.player);

        const keyboard = scene.input.keyboard;
        const k = Input.Keyboard.KeyCodes;
        const add = (code: number) => (keyboard ? keyboard.addKey(code) : null);

        this.keys = {
            up: [add(k.W), add(k.UP)].filter((key): key is Input.Keyboard.Key => key !== null),
            down: [add(k.S), add(k.DOWN)].filter((key): key is Input.Keyboard.Key => key !== null),
            left: [add(k.A), add(k.LEFT)].filter((key): key is Input.Keyboard.Key => key !== null),
            right: [add(k.D), add(k.RIGHT)].filter((key): key is Input.Keyboard.Key => key !== null),
        };
    }

    get x () { return this.sprite.x; }
    get y () { return this.sprite.y; }
    get alive () { return this.hp > 0; }
    get invulnerable () { return this.invulnLeft > 0; }
    get ownedAugments () { return [...this.augments]; }

    hasAugment (id: AugmentId) { return this.augments.has(id); }

    grantAugment (id: AugmentId)
    {
        this.augments.add(id);
    }

    /** Virtual joystick / touch stick. When active, stick overrides keyboard. */
    setStick (x: number, y: number, active: boolean)
    {
        this.stickActive = active;
        this.stick.set(x, y);

        if (this.stick.lengthSq() > 1)
        {
            this.stick.normalize();
        }
    }

    update (dtSeconds: number)
    {
        this.tickStatus(dtSeconds);
        this.tickSteroids(dtSeconds);

        if (this.stickActive)
        {
            this.dir.copy(this.stick);
        }
        else
        {
            const held = (keys: Input.Keyboard.Key[]) => keys.some(key => key.isDown);

            this.dir.set(
                Number(held(this.keys.right)) - Number(held(this.keys.left)),
                Number(held(this.keys.down)) - Number(held(this.keys.up)),
            );
        }

        if (this.dir.lengthSq() === 0)
        {
            this.walkPhase = 0;
            this.pose(TEXTURES.capybaraStand, 0, 0);
            return;
        }

        this.dir.normalize();

        this.walkPhase += dtSeconds * PLAYER_SPRITE.waddleSpeed * this.stats.moveSpeed;
        this.pose(
            TEXTURES.capybaraWalk,
            Math.sin(this.walkPhase) * PLAYER_SPRITE.waddleAngle,
            Math.abs(Math.sin(this.walkPhase)) * PLAYER_SPRITE.hopHeight,
        );

        if (this.dir.x !== 0)
        {
            this.sprite.setFlipX(this.dir.x < 0);
        }

        const halfW = this.sprite.displayWidth / 2;
        const halfH = this.sprite.displayHeight / 2;

        const speed = PLAYER_SPEED * this.stats.moveSpeed;

        this.sprite.x = PMath.Clamp(this.sprite.x + this.dir.x * speed * dtSeconds, halfW, WORLD_WIDTH - halfW);
        this.sprite.y = PMath.Clamp(this.sprite.y + this.dir.y * speed * dtSeconds, halfH, WORLD_HEIGHT - halfH);
    }

    /** Returns true if this hit killed the player. */
    takeDamage (amount: number): boolean
    {
        if (!this.alive || this.invulnerable || amount <= 0)
        {
            return false;
        }

        if (this.stats.dodge > 0 && Math.random() < Math.min(1, this.stats.dodge))
        {
            this.invulnLeft = PLAYER.invulnSeconds;
            this.flashLeft = PLAYER.hitFlashSeconds;
            this.dodgedFlash = true;
            this.refreshTint();
            return false;
        }

        this.hp = Math.max(0, this.hp - amount);
        this.invulnLeft = PLAYER.invulnSeconds;
        this.flashLeft = PLAYER.hitFlashSeconds;
        this.dodgedFlash = false;
        this.refreshTint();
        return this.hp <= 0;
    }

    heal (amount: number)
    {
        if (!this.alive || amount <= 0)
        {
            return;
        }

        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    /** Restore a fraction of max HP (e.g. level-up heal). */
    healFraction (fraction: number)
    {
        this.heal(this.maxHp * fraction);
    }

    /** Change max HP; optionally heal for the gained amount. */
    setMaxHp (next: number, healDelta = false)
    {
        const clamped = Math.max(1, Math.round(next));
        const delta = clamped - this.maxHp;
        this.maxHp = clamped;

        if (healDelta && delta > 0)
        {
            this.hp = Math.min(this.maxHp, this.hp + delta);
        }
        else
        {
            this.hp = Math.min(this.hp, this.maxHp);
        }
    }

    /** True damage that ignores dodge and invulnerability (Steroids DoT). */
    drain (amount: number): boolean
    {
        if (!this.alive || amount <= 0)
        {
            return false;
        }

        this.hp = Math.max(0, this.hp - amount);
        return this.hp <= 0;
    }

    /** Spend one extra life to come back. Returns false if none left. */
    tryExtraLife (): boolean
    {
        if (this.extraLives <= 0)
        {
            return false;
        }

        this.extraLives -= 1;
        this.hp = Math.max(1, Math.round(this.maxHp * PLAYER.extraLifeHeal));
        this.invulnLeft = PLAYER.extraLifeInvulnSeconds;
        this.flashLeft = 0;
        this.dodgedFlash = false;
        this.sprite.setAlpha(1);
        this.refreshTint();
        return true;
    }

    private tickStatus (dt: number)
    {
        const wasFlashing = this.flashLeft > 0;
        const wasInvuln = this.invulnLeft > 0;

        this.flashLeft -= dt;
        this.invulnLeft -= dt;

        if (wasFlashing && this.flashLeft <= 0)
        {
            this.dodgedFlash = false;
            this.refreshTint();
        }

        if (wasInvuln || this.invulnLeft > 0)
        {
            // Blink while invulnerable so hits are obvious.
            this.sprite.setAlpha(this.invulnLeft > 0 && Math.floor(this.invulnLeft * 12) % 2 === 0 ? 0.45 : 1);
        }
    }

    private tickSteroids (dt: number)
    {
        if (!this.hasAugment('steroids') || !this.alive)
        {
            return;
        }

        this.steroidsAcc += dt;

        while (this.steroidsAcc >= 1)
        {
            this.steroidsAcc -= 1;
            this.drain(AUGMENTS.steroids.dps);
        }
    }

    private refreshTint ()
    {
        if (this.flashLeft > 0)
        {
            this.sprite
                .setTint(this.dodgedFlash ? PLAYER.dodgeTint : PLAYER.hitTint)
                .setTintMode(TintModes.FILL);
        }
        else
        {
            this.sprite.clearTint();
        }
    }

    // Hop lifts the art via the origin so the player's position (and the camera) stay put.
    private pose (texture: string, angle: number, hop: number)
    {
        if (this.sprite.texture.key !== texture)
        {
            this.sprite.setTexture(texture);
        }

        this.sprite
            .setRotation(angle)
            .setOrigin(0.5, 0.5 + hop / this.sprite.displayHeight);
    }
}
