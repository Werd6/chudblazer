import { Math as PMath, Scene } from 'phaser';
import { WEAPON_RACK, WeaponKind, WEAPONS } from '../config';
import { meleeWeaponKinds } from '../augments';
import { Weapon } from '../entities/Weapon';
import type { PlayerStats } from '../stats';
import type { Bullets } from './Bullets';
import type { Combat } from './Combat';
import type { Positioned } from './SpatialGrid';

export class WeaponRack
{
    private readonly weapons: Weapon[] = [];
    private slotCount = WEAPON_RACK.startSlots;

    constructor (private readonly scene: Scene, private readonly anchor: Positioned) {}

    get count () { return this.weapons.length; }
    get slots () { return this.slotCount; }
    get full () { return this.weapons.length >= this.slotCount; }
    get canAddSlot () { return this.slotCount < WEAPON_RACK.slotCap; }
    get kinds () { return this.weapons.map(weapon => weapon.kind); }
    get uniqueKinds () { return [...new Set(this.kinds)]; }

    addSlot (): boolean
    {
        return this.addSlots(1) > 0;
    }

    addSlots (count: number): number
    {
        let added = 0;

        while (added < count && this.slotCount < WEAPON_RACK.slotCap)
        {
            this.slotCount++;
            added++;
        }

        return added;
    }

    setSlots (count: number)
    {
        this.slotCount = Math.max(1, Math.min(WEAPON_RACK.slotCap, count));
    }

    add (kind: WeaponKind): boolean
    {
        if (this.full)
        {
            return false;
        }

        this.weapons.push(new Weapon(this.scene, kind, this.anchor));
        this.layout();
        return true;
    }

    clear ()
    {
        for (const weapon of this.weapons)
        {
            weapon.destroy();
        }

        this.weapons.length = 0;
    }

    /** Turns every non-melee gun into a melee weapon; keeps existing melee. */
    replaceRangedWithMelee ()
    {
        const melee = meleeWeaponKinds();
        const kept = this.weapons.filter(weapon => WEAPONS[weapon.kind].attack === 'melee');
        const rangedCount = this.weapons.length - kept.length;

        for (const weapon of this.weapons)
        {
            if (WEAPONS[weapon.kind].attack !== 'melee')
            {
                weapon.destroy();
            }
        }

        this.weapons.length = 0;
        this.weapons.push(...kept);

        for (let i = 0; i < rangedCount; i++)
        {
            const kind = melee[i % melee.length];
            this.weapons.push(new Weapon(this.scene, kind, this.anchor));
        }

        this.layout();
    }

    update (dt: number, combat: Combat, bullets: Bullets, stats: PlayerStats)
    {
        for (const weapon of this.weapons)
        {
            weapon.update(dt, this.anchor, combat, bullets, stats);
        }
    }

    private layout ()
    {
        const n = this.weapons.length;

        if (n === 0)
        {
            return;
        }

        const extra = Math.max(0, n - WEAPON_RACK.startSlots);
        const radius = WEAPON_RACK.orbitRadius + extra * WEAPON_RACK.orbitRadiusPerExtraGun;

        this.weapons.forEach((weapon, i) => {
            weapon.slotAngle = (i * PMath.TAU) / n;
            weapon.orbitRadius = radius;
        });
    }
}
