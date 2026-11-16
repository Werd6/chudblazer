import { GameObjects, Math as PMath, Scene } from 'phaser';
import { DEPTH, ORANGES, TEXTURES } from '../config';
import type { Player } from '../entities/Player';

class Orange
{
    readonly sprite: GameObjects.Image;
    value = 0;
    magnet = false;

    constructor (scene: Scene)
    {
        this.sprite = scene.add.image(0, 0, TEXTURES.orange).setDepth(DEPTH.oranges);
    }
}

export class Oranges
{
    readonly active: Orange[] = [];
    private readonly free: Orange[] = [];

    constructor (private readonly scene: Scene) {}

    drop (x: number, y: number, value: number)
    {
        if (this.active.length >= ORANGES.maxOnGround)
        {
            const target = this.active[Math.floor(Math.random() * this.active.length)];
            target.value += value;
            target.sprite.setScale(Math.min(ORANGES.maxScale, target.sprite.scale + ORANGES.mergeScale));
            return;
        }

        const orange = this.free.pop() ?? new Orange(this.scene);
        this.active.push(orange);

        orange.value = value;
        orange.magnet = false;
        orange.sprite
            .setPosition(
                x + PMath.FloatBetween(-ORANGES.dropScatter, ORANGES.dropScatter),
                y + PMath.FloatBetween(-ORANGES.dropScatter, ORANGES.dropScatter),
            )
            .setScale(1)
            .setActive(true)
            .setVisible(true);
    }

    update (dt: number, player: Player, onCollect: (value: number) => void)
    {
        const step = ORANGES.magnetSpeed * dt;
        const magnetRadius = ORANGES.magnetRadius * player.stats.pickupRadius;

        for (let i = this.active.length - 1; i >= 0; i--)
        {
            const orange = this.active[i];
            const dx = player.x - orange.sprite.x;
            const dy = player.y - orange.sprite.y;
            const dist = Math.hypot(dx, dy);

            if (!orange.magnet && dist < magnetRadius)
            {
                orange.magnet = true;
            }

            if (!orange.magnet)
            {
                continue;
            }

            if (dist <= ORANGES.collectRadius || dist <= step)
            {
                player.oranges++;
                onCollect(orange.value);
                this.release(i);
                continue;
            }

            orange.sprite.x += (dx / dist) * step;
            orange.sprite.y += (dy / dist) * step;
        }
    }

    private release (index: number)
    {
        const orange = this.active[index];
        const last = this.active.pop()!;

        if (index < this.active.length)
        {
            this.active[index] = last;
        }

        orange.sprite.setActive(false).setVisible(false);
        this.free.push(orange);
    }
}
