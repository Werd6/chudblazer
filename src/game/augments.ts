import { AUGMENTS, LEVEL_UP, WeaponKind, WEAPONS } from './config';
import type { Player } from './entities/Player';
import type { ChoiceCard } from './upgrades';
import type { WeaponRack } from './systems/WeaponRack';

export type AugmentId =
    | 'steroids'
    | 'vampirism'
    | 'savant'
    | 'singleMinded'
    | 'farmer'
    | 'splitter'
    | 'warrior'
    | 'chudness'
    | 'gluttony';

export type AugmentDef = {
    id: AugmentId;
    name: string;
    blurb: string;
    badge: string;
};

export const AUGMENT_DEFS: AugmentDef[] = [
    {
        id: 'steroids', name: 'Steroids', badge: 'STR',
        blurb: '+50% fire rate and damage.\n\nTake 2 damage every second.',
    },
    {
        id: 'vampirism', name: 'Vampirism', badge: 'VMP',
        blurb: 'Max HP becomes half.\n\nGain +20% lifesteal chance.',
    },
    {
        id: 'savant', name: 'The Savant', badge: 'SVT',
        blurb: `+${AUGMENTS.savantSlots} weapon slots.\n\nMore room for ridiculous loadouts.`,
    },
    {
        id: 'singleMinded', name: 'Single Minded', badge: '1',
        blurb: 'Keep one weapon.\n\nThat weapon gets 10x fire rate and 2x damage.',
    },
    {
        id: 'farmer', name: 'The Farmer', badge: 'FRM',
        blurb: 'Enemies drop double oranges\n50% of the time.',
    },
    {
        id: 'splitter', name: 'Splitter', badge: 'SPL',
        blurb: 'Enemies explode into a star\nof bullets when they die.',
    },
    {
        id: 'warrior', name: 'Warrior', badge: 'WAR',
        blurb: 'All guns become melee.\n\nLevel-ups only offer melee weapons.',
    },
    {
        id: 'chudness', name: 'The Chudness', badge: 'CHD',
        blurb: `+${AUGMENTS.chudness.maxHpBonus} max HP.\n\nTouching chuds hurts them.`,
    },
    {
        id: 'gluttony', name: 'Gluttony', badge: 'GLT',
        blurb: 'Eating an orange fires an\nexploding orange bullet.',
    },
];

export const isMythicalLevel = (level: number) =>
    level > 0 && level % LEVEL_UP.mythicalEvery === 0;

export function rollMythicalChoices (player: Player): AugmentId[]
{
    const pool = AUGMENT_DEFS
        .map(def => def.id)
        .filter(id => !player.hasAugment(id))
        // Single Minded locks you to one slot — Savant would undo that.
        .filter(id => !(id === 'savant' && player.hasAugment('singleMinded')));

    const picks: AugmentId[] = [];

    while (picks.length < LEVEL_UP.choices && pool.length > 0)
    {
        const i = Math.floor(Math.random() * pool.length);
        picks.push(pool.splice(i, 1)[0]);
    }

    return picks;
}

export function describeAugment (id: AugmentId): ChoiceCard
{
    const def = AUGMENT_DEFS.find(entry => entry.id === id)!;

    return {
        tag: 'MYTHICAL ORANGE',
        title: def.name,
        body: def.blurb,
        footer: 'Build-defining',
        color: AUGMENTS.color,
        badge: def.badge,
    };
}

/** Applies an augment immediately. Single Minded only marks ownership — weapon pick is separate. */
export function applyAugment (id: AugmentId, player: Player, rack: WeaponRack)
{
    if (player.hasAugment(id) && id !== 'singleMinded')
    {
        return;
    }

    player.grantAugment(id);

    switch (id)
    {
        case 'steroids':
            player.stats.fireRate += AUGMENTS.steroids.fireRate;
            player.stats.damage += AUGMENTS.steroids.damage;
            break;
        case 'vampirism':
            player.setMaxHp(Math.max(1, Math.floor(player.maxHp * AUGMENTS.vampirism.maxHpFactor)));
            player.stats.lifesteal += AUGMENTS.vampirism.lifesteal;
            break;
        case 'savant':
            if (!player.hasAugment('singleMinded'))
            {
                rack.addSlots(AUGMENTS.savantSlots);
            }
            break;
        case 'singleMinded':
            // Weapon choice handled by Game after this returns.
            break;
        case 'farmer':
        case 'splitter':
        case 'gluttony':
            break;
        case 'warrior':
            rack.replaceRangedWithMelee();
            break;
        case 'chudness':
            player.setMaxHp(player.maxHp + AUGMENTS.chudness.maxHpBonus, true);
            break;
    }
}

export function applySingleMindedWeapon (kind: WeaponKind, player: Player, rack: WeaponRack)
{
    rack.setSlots(1);
    rack.clear();
    rack.add(kind);
    player.stats.fireRate *= AUGMENTS.singleMinded.fireRate;
    player.stats.damage *= AUGMENTS.singleMinded.damage;
}

export function meleeWeaponKinds (): WeaponKind[]
{
    return (Object.keys(WEAPONS) as WeaponKind[]).filter(kind => WEAPONS[kind].attack === 'melee');
}

export function describeWeaponKeep (kind: WeaponKind): ChoiceCard
{
    const def = WEAPONS[kind];

    return {
        tag: 'KEEP THIS',
        title: def.name,
        body: `${def.blurb}\n\nBecomes your only weapon:\n10x fire rate, 2x damage.`,
        footer: 'Single Minded',
        color: AUGMENTS.color,
        texture: def.texture,
    };
}
