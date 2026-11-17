import { Math as PMath, type Scene } from 'phaser';
import { MAX_CHUD_RADIUS, PLAYER } from '../config';
import type { Chud } from '../entities/Chud';
import type { Player } from '../entities/Player';
import type { ChudHorde } from './ChudHorde';
import type { Effects } from './Effects';
import { playChudHit } from './Sfx';

/** Everything weapons need to hurt chuds: the horde, hit effects, and the kill callback. */
export class Combat
{
    constructor (
        private readonly scene: Scene,
        readonly horde: ChudHorde,
        readonly effects: Effects,
        private readonly player: Player,
        private readonly onKill: (chud: Chud) => void,
    ) {}

    hit (chud: Chud, damage: number, slowFactor = 1, slowSeconds = 0)
    {
        if (slowSeconds > 0)
        {
            chud.slow(slowFactor, slowSeconds);
        }

        const dealt = Math.min(damage, Math.max(0, chud.hp));

        playChudHit(this.scene, chud.kind);

        if (dealt > 0 && this.player.stats.lifesteal > 0
            && Math.random() < Math.min(1, this.player.stats.lifesteal))
        {
            this.player.heal(PLAYER.lifestealHeal);
        }

        if (chud.takeDamage(damage))
        {
            this.onKill(chud);
        }
    }

    /** Hits every chud whose body overlaps the arc of radius `reach` centred on `aim`. */
    slash (x: number, y: number, aim: number, reach: number, arc: number, damage: number)
    {
        this.horde.grid.forEachInRadius(x, y, reach + MAX_CHUD_RADIUS, chud => {
            if (!chud.alive)
            {
                return;
            }

            const dx = chud.x - x;
            const dy = chud.y - y;
            const dist = Math.hypot(dx, dy);

            if (dist - chud.radius > reach)
            {
                return;
            }

            const bodyAngle = dist > chud.radius ? Math.asin(chud.radius / dist) : Math.PI;
            const off = Math.abs(PMath.Angle.Wrap(Math.atan2(dy, dx) - aim));

            if (off <= arc / 2 + bodyAngle)
            {
                this.hit(chud, damage);
            }
        });
    }

    /** Hits every chud touching the line from (x, y) along `aim`. */
    beam (x: number, y: number, aim: number, length: number, width: number, damage: number)
    {
        const cos = Math.cos(aim);
        const sin = Math.sin(aim);
        const midX = x + cos * length / 2;
        const midY = y + sin * length / 2;

        this.horde.grid.forEachInRadius(midX, midY, length / 2 + MAX_CHUD_RADIUS + width, chud => {
            if (!chud.alive)
            {
                return;
            }

            const along = PMath.Clamp((chud.x - x) * cos + (chud.y - y) * sin, 0, length);
            const px = x + cos * along;
            const py = y + sin * along;
            const reach = chud.radius + width / 2;

            if ((chud.x - px) ** 2 + (chud.y - py) ** 2 <= reach * reach)
            {
                this.hit(chud, damage);
            }
        });
    }

    explode (x: number, y: number, radius: number, damage: number)
    {
        this.effects.explosion(x, y, radius);

        this.horde.grid.forEachInRadius(x, y, radius + MAX_CHUD_RADIUS, chud => {
            if (chud.alive && Math.hypot(chud.x - x, chud.y - y) - chud.radius <= radius)
            {
                this.hit(chud, damage);
            }
        });
    }
}
