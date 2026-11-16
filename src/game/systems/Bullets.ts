import { GameObjects, Scene } from 'phaser';
import { BULLETS, DEPTH, MAX_CHUD_RADIUS, TEXTURES } from '../config';
import type { Chud } from '../entities/Chud';
import type { Combat } from './Combat';

export type Shot = {
    damage: number;
    speed: number;
    pierce: number;
    /** Total travel distance in px. */
    range: number;
    texture: string;
    hitRadius: number;
    /** Radians per second; 0 keeps the sprite still. */
    spin: number;
    faceVelocity: boolean;
    slowFactor: number;
    slowSeconds: number;
    /** > 0 makes the shot lobbed: it ignores chuds in flight and explodes where it lands. */
    explodeRadius: number;
};

export const createShot = (): Shot => ({
    damage: 0, speed: 0, pierce: 0, range: 0,
    texture: TEXTURES.bullet, hitRadius: BULLETS.radius, spin: 0, faceVelocity: false,
    slowFactor: 1, slowSeconds: 0, explodeRadius: 0,
});

const MAX_SUBSTEP = 8;

class Bullet
{
    readonly sprite: GameObjects.Image;
    vx = 0;
    vy = 0;
    distanceLeft = 0;
    pierceLeft = 0;
    readonly shot = createShot();
    readonly hits: Chud[] = [];

    constructor (scene: Scene)
    {
        this.sprite = scene.add.image(0, 0, TEXTURES.bullet).setDepth(DEPTH.bullets);
    }
}

export class Bullets
{
    readonly active: Bullet[] = [];
    private readonly free: Bullet[] = [];

    constructor (private readonly scene: Scene) {}

    fire (x: number, y: number, angle: number, shot: Shot)
    {
        if (this.active.length >= BULLETS.maxActive)
        {
            return;
        }

        const bullet = this.free.pop() ?? new Bullet(this.scene);
        this.active.push(bullet);

        Object.assign(bullet.shot, shot);
        bullet.vx = Math.cos(angle) * shot.speed;
        bullet.vy = Math.sin(angle) * shot.speed;
        bullet.pierceLeft = shot.pierce;
        bullet.distanceLeft = shot.range;
        bullet.hits.length = 0;
        bullet.sprite
            .setTexture(shot.texture)
            .setRotation(shot.faceVelocity ? angle : 0)
            .setPosition(x, y)
            .setActive(true)
            .setVisible(true);
    }

    update (dt: number, combat: Combat)
    {
        for (let i = this.active.length - 1; i >= 0; i--)
        {
            const bullet = this.active[i];
            const { shot, sprite } = bullet;
            const travel = Math.min(shot.speed * dt, bullet.distanceLeft);
            const fraction = shot.speed > 0 ? travel / (shot.speed * dt) : 0;
            const steps = Math.max(1, Math.ceil(travel / MAX_SUBSTEP));
            let spent = false;

            for (let s = 0; s < steps && !spent; s++)
            {
                sprite.x += (bullet.vx * dt * fraction) / steps;
                sprite.y += (bullet.vy * dt * fraction) / steps;
                spent = shot.explodeRadius === 0 && this.collide(bullet, combat);
            }

            if (shot.spin !== 0)
            {
                sprite.rotation += shot.spin * dt;
            }

            bullet.distanceLeft -= travel;

            if (!spent && bullet.distanceLeft <= 0 && shot.explodeRadius > 0)
            {
                combat.explode(sprite.x, sprite.y, shot.explodeRadius, shot.damage);
                spent = true;
            }

            if (spent || bullet.distanceLeft <= 0)
            {
                this.release(i);
            }
        }
    }

    private collide (bullet: Bullet, combat: Combat): boolean
    {
        const { shot, sprite } = bullet;
        let spent = false;

        combat.horde.grid.forEachInRadius(sprite.x, sprite.y, shot.hitRadius + MAX_CHUD_RADIUS, chud => {
            if (spent || !chud.alive || bullet.hits.includes(chud))
            {
                return;
            }

            const reach = chud.radius + shot.hitRadius;
            const dx = chud.x - sprite.x;
            const dy = chud.y - sprite.y;

            if (dx * dx + dy * dy > reach * reach)
            {
                return;
            }

            bullet.hits.push(chud);
            combat.hit(chud, shot.damage, shot.slowFactor, shot.slowSeconds);

            if (bullet.pierceLeft === 0)
            {
                spent = true;
            }
            else
            {
                bullet.pierceLeft--;
            }
        });

        return spent;
    }

    private release (index: number)
    {
        const bullet = this.active[index];
        const last = this.active.pop()!;

        if (index < this.active.length)
        {
            this.active[index] = last;
        }

        bullet.sprite.setActive(false).setVisible(false);
        this.free.push(bullet);
    }
}
