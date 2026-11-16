import { Math as PMath, Scene } from 'phaser';
import {
    ChudKind,
    CHUDS,
    GRID_CELL_SIZE,
    HORDE_KINDS,
    PLAYER_RADIUS,
    scaleForElapsed,
    SEPARATION,
    SPAWN,
    VIEW_HEIGHT,
    VIEW_WIDTH,
    WORLD_HEIGHT,
    WORLD_WIDTH,
} from '../config';
import { Chud } from '../entities/Chud';
import { Positioned, SpatialGrid } from './SpatialGrid';

const SPAWN_RING_RADIUS = Math.hypot(VIEW_WIDTH / 2, VIEW_HEIGHT / 2) + SPAWN.ringMargin;
const SPAWN_ATTEMPTS = 8;

export class ChudHorde
{
    readonly active: Chud[] = [];
    readonly grid = new SpatialGrid<Chud>(GRID_CELL_SIZE);

    private readonly free: Chud[] = [];
    private spawnTimer = 0;

    constructor (private readonly scene: Scene) {}

    update (dt: number, elapsed: number, target: Positioned)
    {
        this.sweepDead();
        this.spawn(dt, elapsed, target);
        this.rebuildGrid();
        this.move(dt, target);
    }

    private spawn (dt: number, elapsed: number, target: Positioned)
    {
        this.spawnTimer -= dt;

        if (this.spawnTimer > 0)
        {
            return;
        }

        // Interval and burst both ramp with time, then freeze after rampSeconds (~15 min).
        const spawnElapsed = Math.min(elapsed, SPAWN.rampSeconds);
        const ramp = spawnElapsed / SPAWN.rampSeconds;
        this.spawnTimer += PMath.Linear(SPAWN.intervalStart, SPAWN.intervalMin, ramp);

        const burst = 1 + Math.floor(spawnElapsed / SPAWN.burstEverySeconds);

        const scale = scaleForElapsed(elapsed);

        for (let i = 0; i < burst && this.active.length < SPAWN.maxActive; i++)
        {
            const point = this.pickSpawnPoint(target);

            if (point)
            {
                this.obtain().spawn(this.pickKind(elapsed), point.x, point.y, scale);
            }
        }
    }

    private pickKind (elapsed: number): ChudKind
    {
        let total = 0;
        const weights = HORDE_KINDS.map(kind => {
            const def = CHUDS[kind];
            const w = def.weight * PMath.Clamp((elapsed - def.unlockAt) / SPAWN.weightRampSeconds, 0, 1);
            total += w;
            return w;
        });

        if (total === 0)
        {
            return HORDE_KINDS[0];
        }

        let roll = Math.random() * total;

        for (let i = 0; i < HORDE_KINDS.length; i++)
        {
            roll -= weights[i];

            if (roll <= 0)
            {
                return HORDE_KINDS[i];
            }
        }

        return HORDE_KINDS[HORDE_KINDS.length - 1];
    }

    /** Spawn one chud just off-screen around the target, ignoring the active cap. */
    spawnAtEdge (kind: ChudKind, target: Positioned, elapsed = 0): Chud | null
    {
        const point = this.pickSpawnPoint(target);

        if (!point)
        {
            return null;
        }

        const chud = this.obtain();
        chud.spawn(kind, point.x, point.y, scaleForElapsed(elapsed));
        return chud;
    }

    private pickSpawnPoint (target: Positioned)
    {
        for (let i = 0; i < SPAWN_ATTEMPTS; i++)
        {
            const angle = Math.random() * Math.PI * 2;
            const x = target.x + Math.cos(angle) * SPAWN_RING_RADIUS;
            const y = target.y + Math.sin(angle) * SPAWN_RING_RADIUS;

            if (x >= 0 && x <= WORLD_WIDTH && y >= 0 && y <= WORLD_HEIGHT)
            {
                return { x, y };
            }
        }

        return null;
    }

    private obtain ()
    {
        const chud = this.free.pop() ?? new Chud(this.scene);
        this.active.push(chud);
        return chud;
    }

    private release (index: number)
    {
        const chud = this.active[index];
        const last = this.active.pop()!;

        if (index < this.active.length)
        {
            this.active[index] = last;
        }

        chud.despawn();
        this.free.push(chud);
    }

    private sweepDead ()
    {
        for (let i = this.active.length - 1; i >= 0; i--)
        {
            if (this.active[i].dead)
            {
                this.release(i);
            }
        }
    }

    private rebuildGrid ()
    {
        this.grid.clear();

        for (const chud of this.active)
        {
            this.grid.insert(chud);
        }
    }

    private move (dt: number, target: Positioned)
    {
        for (let i = this.active.length - 1; i >= 0; i--)
        {
            const chud = this.active[i];
            chud.tickStatus(dt);

            const dx = target.x - chud.x;
            const dy = target.y - chud.y;
            const dist = Math.hypot(dx, dy);

            const heavy = CHUDS[chud.kind].bossName !== undefined;

            if (dist > SPAWN.despawnDistance && !heavy)
            {
                this.release(i);
                continue;
            }

            let vx = 0;
            let vy = 0;

            if (dist > chud.radius + PLAYER_RADIUS)
            {
                vx = (dx / dist) * chud.currentSpeed;
                vy = (dy / dist) * chud.currentSpeed;
            }

            let pushX = 0;
            let pushY = 0;

            this.grid.forEachNear(chud.x, chud.y, other => {
                if (other === chud || heavy)
                {
                    return;
                }

                const ox = chud.x - other.x;
                const oy = chud.y - other.y;
                const minDist = chud.radius + other.radius;
                const d2 = ox * ox + oy * oy;

                if (d2 >= minDist * minDist)
                {
                    return;
                }

                if (d2 === 0)
                {
                    pushX += Math.random() - 0.5;
                    pushY += Math.random() - 0.5;
                    return;
                }

                const d = Math.sqrt(d2);
                const overlap = minDist - d;
                pushX += (ox / d) * overlap;
                pushY += (oy / d) * overlap;
            });

            pushX *= SEPARATION.response;
            pushY *= SEPARATION.response;

            const pushLen = Math.hypot(pushX, pushY);

            if (pushLen > SEPARATION.maxPushPerFrame)
            {
                pushX *= SEPARATION.maxPushPerFrame / pushLen;
                pushY *= SEPARATION.maxPushPerFrame / pushLen;
            }

            const prevX = chud.x;
            const prevY = chud.y;

            chud.sprite.x = PMath.Clamp(chud.x + vx * dt + pushX, chud.radius, WORLD_WIDTH - chud.radius);
            chud.sprite.y = PMath.Clamp(chud.y + vy * dt + pushY, chud.radius, WORLD_HEIGHT - chud.radius);

            chud.animate(dx, Math.hypot(chud.x - prevX, chud.y - prevY));
        }
    }
}
