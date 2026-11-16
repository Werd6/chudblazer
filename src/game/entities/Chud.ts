import { GameObjects, Math as PMath, Scene, TintModes } from 'phaser';
import { CHUD_ANIM, CHUD_HIT_FLASH_SECONDS, ChudKind, CHUDS, DEPTH, EFFECTS, TEXTURES, WORLD_HEIGHT } from '../config';

export class Chud
{
    readonly sprite: GameObjects.Image;
    kind: ChudKind = 'goblin';
    radius = 0;
    speed = 0;
    /** Base speed before boss alive-time ramps (set at spawn). */
    baseSpeed = 0;
    hp = 0;
    maxHp = 0;
    contactDamage = 0;
    dead = false;
    private flashTimer = 0;
    private slowTimer = 0;
    private slowFactor = 1;
    private walkPhase = 0;

    constructor (scene: Scene)
    {
        this.sprite = scene.add.image(0, 0, TEXTURES.goblin)
            .setDepth(DEPTH.chuds)
            .setActive(false)
            .setVisible(false);
    }

    get x () { return this.sprite.x; }
    get y () { return this.sprite.y; }
    get alive () { return this.sprite.active && !this.dead; }

    spawn (
        kind: ChudKind,
        x: number,
        y: number,
        scale: { hp?: number; damage?: number } = {},
    )
    {
        const def = CHUDS[kind];
        const hpScale = scale.hp ?? 1;
        const damageScale = scale.damage ?? 1;

        this.kind = kind;
        this.radius = def.radius;
        this.baseSpeed = def.speed;
        this.speed = def.speed;
        this.maxHp = Math.max(1, Math.round(def.hp * hpScale));
        this.hp = this.maxHp;
        this.contactDamage = Math.max(1, Math.round(def.contactDamage * damageScale));
        this.dead = false;
        this.flashTimer = 0;
        this.slowTimer = 0;
        this.slowFactor = 1;
        this.walkPhase = Math.random() * PMath.TAU;

        this.sprite.clearTint().setTexture(def.texture);

        const frame = this.sprite.frame;

        this.sprite
            .setScale(def.spriteSize / Math.sqrt(frame.realWidth * frame.realHeight))
            .setRotation(0)
            .setFlipX(false)
            .setPosition(x, y)
            .setActive(true)
            .setVisible(true);
    }

    /** Face along dx, waddle by distance moved, and draw lower chuds in front. */
    animate (dx: number, moved: number)
    {
        if (Math.abs(dx) > CHUD_ANIM.faceDeadzone)
        {
            this.sprite.setFlipX(dx < 0);
        }

        if (moved > 0)
        {
            this.walkPhase += moved * CHUD_ANIM.waddlePerPixel;
            this.sprite.setRotation(Math.sin(this.walkPhase) * CHUD_ANIM.waddleAngle);
        }

        const feet = this.sprite.y + this.sprite.displayHeight / 2;
        this.sprite.setDepth(DEPTH.chuds + feet / (WORLD_HEIGHT + 1000));
    }

    takeDamage (amount: number): boolean
    {
        if (this.dead)
        {
            return false;
        }

        this.hp -= amount;
        this.flashTimer = CHUD_HIT_FLASH_SECONDS;
        this.refreshTint();

        if (this.hp <= 0)
        {
            this.dead = true;
            this.sprite.setVisible(false);
            return true;
        }

        return false;
    }

    /** Slows movement to `factor` of normal speed; the strongest and longest slow wins. */
    slow (factor: number, seconds: number)
    {
        this.slowFactor = this.slowTimer > 0 ? Math.min(this.slowFactor, factor) : factor;
        this.slowTimer = Math.max(this.slowTimer, seconds);

        if (this.flashTimer <= 0)
        {
            this.refreshTint();
        }
    }

    get currentSpeed () { return this.slowTimer > 0 ? this.speed * this.slowFactor : this.speed; }

    tickStatus (dt: number)
    {
        const wasFlashing = this.flashTimer > 0;
        const wasSlowed = this.slowTimer > 0;

        this.flashTimer -= dt;
        this.slowTimer -= dt;

        if ((wasFlashing && this.flashTimer <= 0) || (wasSlowed && this.slowTimer <= 0))
        {
            this.refreshTint();
        }
    }

    private refreshTint ()
    {
        if (this.flashTimer > 0)
        {
            this.sprite.setTint(0xffffff).setTintMode(TintModes.FILL);
        }
        else if (this.slowTimer > 0)
        {
            this.sprite.setTint(EFFECTS.slowTint).setTintMode(TintModes.MULTIPLY);
        }
        else
        {
            this.sprite.clearTint();
        }
    }

    despawn ()
    {
        this.sprite.setActive(false).setVisible(false);
    }
}
