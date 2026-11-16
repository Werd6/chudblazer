import { GameObjects, Math as PMath, Scene } from 'phaser';
import { DEPTH, EFFECTS, TEXTURES } from '../config';

const PIXEL_SIZE = 4;
const SLASH_RADIUS = 56;
const BOOM_SIZE = 64;

class Effect
{
    readonly sprite: GameObjects.Image;
    life = 0;
    maxLife = 0;
    scaleX = 1;
    scaleY = 1;
    growth = 0;

    constructor (scene: Scene)
    {
        this.sprite = scene.add.image(0, 0, TEXTURES.fxPixel).setDepth(DEPTH.effects);
    }
}

/** Short-lived, fading visuals for melee swings, lasers and explosions. */
export class Effects
{
    private readonly active: Effect[] = [];
    private readonly free: Effect[] = [];

    constructor (private readonly scene: Scene) {}

    slash (x: number, y: number, angle: number, reach: number, color: number, seconds: number)
    {
        const scale = reach / SLASH_RADIUS;
        this.spawn(TEXTURES.fxSlash, x, y, angle, seconds + EFFECTS.slashTailSeconds, 0.15, scale, scale)
            .setOrigin(0, 0.5)
            .setTint(color);
    }

    beam (x: number, y: number, angle: number, length: number, width: number, color: number, seconds: number)
    {
        this.spawn(TEXTURES.fxPixel, x, y, angle, seconds, 0, length / PIXEL_SIZE, width / PIXEL_SIZE)
            .setOrigin(0, 0.5)
            .setTint(color);
        this.spawn(TEXTURES.fxPixel, x, y, angle, seconds, 0, length / PIXEL_SIZE, Math.max(2, width / 3) / PIXEL_SIZE)
            .setOrigin(0, 0.5);
    }

    explosion (x: number, y: number, radius: number)
    {
        const scale = (radius * 2) / BOOM_SIZE;
        this.spawn(TEXTURES.fxBoom, x, y, Math.random() * PMath.TAU, EFFECTS.explosionSeconds, 0.35, scale, scale);
    }

    update (dt: number)
    {
        for (let i = this.active.length - 1; i >= 0; i--)
        {
            const effect = this.active[i];
            effect.life -= dt;

            if (effect.life <= 0)
            {
                this.release(i);
                continue;
            }

            const t = effect.life / effect.maxLife;
            const grow = 1 + effect.growth * (1 - t);

            effect.sprite
                .setAlpha(t)
                .setScale(effect.scaleX * grow, effect.scaleY * grow);
        }
    }

    private spawn (
        texture: string, x: number, y: number, angle: number,
        seconds: number, growth: number, scaleX: number, scaleY: number,
    )
    {
        const effect = this.free.pop() ?? new Effect(this.scene);
        this.active.push(effect);

        effect.life = seconds;
        effect.maxLife = seconds;
        effect.growth = growth;
        effect.scaleX = scaleX;
        effect.scaleY = scaleY;

        return effect.sprite
            .setTexture(texture)
            .setPosition(x, y)
            .setOrigin(0.5)
            .setRotation(angle)
            .setScale(scaleX, scaleY)
            .setAlpha(1)
            .clearTint()
            .setActive(true)
            .setVisible(true);
    }

    private release (index: number)
    {
        const effect = this.active[index];
        const last = this.active.pop()!;

        if (index < this.active.length)
        {
            this.active[index] = last;
        }

        effect.sprite.setActive(false).setVisible(false);
        this.free.push(effect);
    }
}
