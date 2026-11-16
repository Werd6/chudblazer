import { GameObjects, Math as PMath, Scene } from 'phaser';
import { BULLETS, DEPTH, MAX_CHUD_RADIUS, TEXTURES, WEAPON_RACK, WeaponDef, WeaponKind, WEAPONS } from '../config';
import type { PlayerStats } from '../stats';
import type { Chud } from './Chud';
import { type Bullets, createShot } from '../systems/Bullets';
import type { ChudHorde } from '../systems/ChudHorde';
import type { Combat } from '../systems/Combat';
import { playWeaponFire } from '../systems/Sfx';
import type { Positioned } from '../systems/SpatialGrid';

export class Weapon
{
    readonly sprite: GameObjects.Image;
    readonly def: WeaponDef;
    slotAngle = 0;
    orbitRadius = WEAPON_RACK.orbitRadius;

    private offsetX = 0;
    private offsetY = 0;
    private cooldownLeft: number;
    private recoil = 0;
    private swingLeft = 0;
    private swingAim = 0;
    private bobPhase = Math.random() * PMath.TAU;
    private readonly shot = createShot();

    constructor (scene: Scene, readonly kind: WeaponKind, anchor: Positioned)
    {
        this.def = WEAPONS[kind];
        this.cooldownLeft = Math.random() * this.def.cooldown;
        this.sprite = scene.add.image(anchor.x, anchor.y, this.def.texture)
            .setOrigin(0.25, 0.5)
            .setDepth(DEPTH.guns);

        if (this.def.attack === 'gun')
        {
            const { projectile, slow, explosion } = this.def;
            Object.assign(this.shot, {
                speed: this.def.bulletSpeed,
                texture: projectile?.texture ?? TEXTURES.bullet,
                hitRadius: projectile?.hitRadius ?? BULLETS.radius,
                spin: projectile?.spin ?? 0,
                faceVelocity: projectile?.faceVelocity ?? false,
                slowFactor: slow?.factor ?? 1,
                slowSeconds: slow?.seconds ?? 0,
                explodeRadius: explosion?.radius ?? 0,
            });
        }
    }

    update (dt: number, anchor: Positioned, combat: Combat, bullets: Bullets, stats: PlayerStats)
    {
        const ease = 1 - Math.pow(1 - WEAPON_RACK.slotLerp, dt * 60);
        this.offsetX += (Math.cos(this.slotAngle) * this.orbitRadius - this.offsetX) * ease;
        this.offsetY += (Math.sin(this.slotAngle) * this.orbitRadius - this.offsetY) * ease;

        this.bobPhase += dt * WEAPON_RACK.bobSpeed;

        const baseX = anchor.x + this.offsetX;
        const baseY = anchor.y + this.offsetY + Math.sin(this.bobPhase) * WEAPON_RACK.bobAmplitude;

        const range = this.def.range * stats.range;
        const target = this.findTarget(baseX, baseY, range, combat.horde);
        const aim = target ? Math.atan2(target.y - baseY, target.x - baseX) : this.slotAngle;

        this.recoil = Math.max(0, this.recoil - WEAPON_RACK.recoilRecovery * dt);
        this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
        this.swingLeft = Math.max(0, this.swingLeft - dt);

        const x = baseX - Math.cos(aim) * this.recoil;
        const y = baseY - Math.sin(aim) * this.recoil;

        if (target && this.cooldownLeft === 0)
        {
            this.attack(x, y, aim, range, target, combat, bullets, stats);
            this.cooldownLeft = this.def.cooldown / stats.fireRate;
        }

        let pose = aim;

        if (this.def.attack === 'melee' && this.swingLeft > 0)
        {
            const progress = 1 - this.swingLeft / this.def.swingSeconds;
            pose = this.swingAim - this.def.arc / 2 + this.def.arc * progress;
        }

        this.sprite
            .setPosition(x, y)
            .setRotation(pose)
            .setFlipY(Math.cos(pose) < 0);
    }

    private attack (
        x: number, y: number, aim: number, range: number, target: Chud,
        combat: Combat, bullets: Bullets, stats: PlayerStats,
    )
    {
        const def = this.def;
        const damage = def.damage * stats.damage;
        const muzzleX = x + Math.cos(aim) * def.barrelLength;
        const muzzleY = y + Math.sin(aim) * def.barrelLength;

        playWeaponFire(this.sprite.scene, this.kind);

        switch (def.attack)
        {
            case 'gun':
            {
                this.shot.damage = damage;
                this.shot.pierce = def.pierce + stats.pierce;
                this.shot.range = def.explosion
                    ? Math.min(range, Math.hypot(target.x - muzzleX, target.y - muzzleY))
                    : range * BULLETS.rangeMultiplier;

                for (let i = 0; i < def.projectiles; i++)
                {
                    const fan = def.projectiles > 1 ? (i / (def.projectiles - 1) - 0.5) * def.spread : 0;
                    const wobble = def.jitter > 0 ? PMath.FloatBetween(-def.jitter, def.jitter) : 0;
                    bullets.fire(muzzleX, muzzleY, aim + fan + wobble, this.shot);
                }

                this.recoil = WEAPON_RACK.recoilKick;
                break;
            }
            case 'melee':
            {
                combat.slash(x, y, aim, range, def.arc, damage);
                combat.effects.slash(x, y, aim, range, def.slashColor, def.swingSeconds);
                this.swingLeft = def.swingSeconds;
                this.swingAim = aim;
                break;
            }
            case 'beam':
            {
                combat.beam(muzzleX, muzzleY, aim, range, def.width, damage);
                combat.effects.beam(muzzleX, muzzleY, aim, range, def.width, def.color, def.beamSeconds);
                this.recoil = WEAPON_RACK.recoilKick;
                break;
            }
        }
    }

    /** Nearest chud by distance to its edge, so a big body pressed up against you counts as close. */
    private findTarget (x: number, y: number, range: number, horde: ChudHorde)
    {
        let best: Chud | null = null;
        let bestEdge = range;

        horde.grid.forEachInRadius(x, y, range + MAX_CHUD_RADIUS, chud => {
            if (!chud.alive)
            {
                return;
            }

            const edge = Math.hypot(chud.x - x, chud.y - y) - chud.radius;

            if (edge < bestEdge)
            {
                bestEdge = edge;
                best = chud;
            }
        });

        return best as Chud | null;
    }

    destroy ()
    {
        this.sprite.destroy();
    }
}
