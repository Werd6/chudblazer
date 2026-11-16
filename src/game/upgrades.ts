import { meleeWeaponKinds } from './augments';
import { LEVEL_UP, RARITY, WEAPON_KINDS, WEAPON_RACK, WeaponKind, WEAPONS } from './config';
import type { Player } from './entities/Player';
import { createStats, PlayerStats, StatKey } from './stats';
import type { WeaponRack } from './systems/WeaponRack';

export type StatUpgradeDef = {
    stat: StatKey;
    name: string;
    badge: string;
    color: number;
    amount: number;
    percent: boolean;
    noun: string;
};

export const STAT_UPGRADES: StatUpgradeDef[] = [
    { stat: 'damage', name: 'Damage', badge: 'DMG', color: 0xd9483b, amount: 0.15, percent: true, noun: 'damage on all guns' },
    { stat: 'fireRate', name: 'Fire Rate', badge: 'RATE', color: 0xe0a030, amount: 0.12, percent: true, noun: 'fire rate on all guns' },
    { stat: 'range', name: 'Range', badge: 'RNG', color: 0x3b8fd9, amount: 0.15, percent: true, noun: 'range and melee reach' },
    { stat: 'pierce', name: 'Pierce', badge: 'PRC', color: 0x9b59d0, amount: 1, percent: false, noun: 'pierce on all guns' },
    { stat: 'pickupRadius', name: 'Orange Magnet', badge: 'MAG', color: 0xff9a1a, amount: 0.3, percent: true, noun: 'orange pickup range' },
    { stat: 'moveSpeed', name: 'Move Speed', badge: 'SPD', color: 0x4fc06a, amount: 0.08, percent: true, noun: 'move speed' },
    { stat: 'lifesteal', name: 'Lifesteal', badge: 'LIFE', color: 0xe85d8e, amount: 0.08, percent: true, noun: 'chance to heal when you deal damage' },
    { stat: 'dodge', name: 'Dodge', badge: 'DGE', color: 0x7ec8ff, amount: 0.08, percent: true, noun: 'chance to dodge contact damage' },
];

export type UpgradeChoice =
    | { type: 'stat'; upgrade: StatUpgradeDef }
    | { type: 'weapon'; kind: WeaponKind }
    | { type: 'slot' }
    | { type: 'extraLife' };

export type ChoiceCard = {
    tag: string;
    title: string;
    body: string;
    footer: string;
    color: number;
    badge?: string;
    texture?: string;
};

const BASE_STATS = createStats();

type Weighted = { choice: UpgradeChoice; weight: number };

export function rollChoices (rack: WeaponRack, player: Player): UpgradeChoice[]
{
    const singleMinded = player.hasAugment('singleMinded');
    const offerKinds = player.hasAugment('warrior') ? meleeWeaponKinds() : WEAPON_KINDS;
    const statPool: Weighted[] = STAT_UPGRADES.map(upgrade => ({
        choice: { type: 'stat', upgrade },
        weight: LEVEL_UP.statOfferWeight,
    }));
    const weaponPool: Weighted[] = singleMinded || rack.full ? [] : offerKinds.map(kind => ({
        choice: { type: 'weapon', kind },
        weight: RARITY[WEAPONS[kind].rarity].offerWeight,
    }));
    const slotPool: Weighted[] = !singleMinded && rack.full && rack.canAddSlot
        ? [{ choice: { type: 'slot' }, weight: LEVEL_UP.slotOfferWeight }]
        : [];
    const extraLifePool: Weighted[] = [{
        choice: { type: 'extraLife' },
        weight: LEVEL_UP.extraLifeOfferWeight,
    }];
    const picks: UpgradeChoice[] = [];

    if (weaponPool.length > 0 && rack.count < LEVEL_UP.guaranteeWeaponBelowGuns)
    {
        picks.push(takeWeighted(weaponPool));
    }

    const pool = [...statPool, ...weaponPool, ...slotPool, ...extraLifePool];

    while (picks.length < LEVEL_UP.choices && pool.length > 0)
    {
        picks.push(takeWeighted(pool));
    }

    return shuffle(picks);
}

export function applyChoice (choice: UpgradeChoice, stats: PlayerStats, rack: WeaponRack, player: Player)
{
    if (choice.type === 'stat')
    {
        stats[choice.upgrade.stat] += choice.upgrade.amount;
    }
    else if (choice.type === 'weapon')
    {
        rack.add(choice.kind);
    }
    else if (choice.type === 'slot')
    {
        if (!player.hasAugment('singleMinded'))
        {
            rack.addSlot();
        }
    }
    else
    {
        player.extraLives += 1;
    }
}

export function describeChoice (choice: UpgradeChoice, stats: PlayerStats, rack: WeaponRack, player: Player): ChoiceCard
{
    if (choice.type === 'weapon')
    {
        const def = WEAPONS[choice.kind];
        const rarity = RARITY[def.rarity];
        const perHit = def.attack === 'gun' && def.projectiles > 1 ? `${def.damage} x${def.projectiles}` : `${def.damage}`;
        const reach = def.attack === 'melee' ? 'reach' : 'range';

        return {
            tag: `${rarity.label} WEAPON`,
            title: def.name,
            body: `${def.blurb}\n\n${perHit} dmg | ${(1 / def.cooldown).toFixed(1)}/s | ${def.range} ${reach}`,
            footer: `Slot ${rack.count + 1}/${rack.slots}`,
            color: rarity.color,
            texture: def.texture,
        };
    }

    if (choice.type === 'slot')
    {
        return {
            tag: 'POWER UP',
            title: 'Extra Slot',
            body: '+1 weapon slot.\n\nNew guns show up in level-ups again.',
            footer: `${rack.slots} -> ${rack.slots + 1} slots (max ${WEAPON_RACK.slotCap})`,
            color: 0xf2c94c,
            badge: '+1',
        };
    }

    if (choice.type === 'extraLife')
    {
        return {
            tag: 'POWER UP',
            title: 'Extra Life',
            body: 'Cheat death once.\n\nOn fatal damage, respawn with full HP.',
            footer: `${player.extraLives} -> ${player.extraLives + 1} lives`,
            color: 0xff6b9d,
            badge: '+1',
        };
    }

    const { stat, name, badge, color, amount, percent, noun } = choice.upgrade;
    const bonus = stats[stat] - BASE_STATS[stat];
    const format = (value: number) => percent ? `+${Math.round(value * 100)}%` : `+${Math.round(value)}`;

    return {
        tag: 'UPGRADE',
        title: name,
        body: `${format(amount)} ${noun}`,
        footer: `${format(bonus)} -> ${format(bonus + amount)}`,
        color,
        badge,
    };
}

export function summarizeStats (stats: PlayerStats, extraLives = 0, augmentLabels: string[] = [])
{
    const line = STAT_UPGRADES
        .map(({ stat, badge, percent }) => {
            const bonus = stats[stat] - BASE_STATS[stat];
            return `${badge} ${percent ? `+${Math.round(bonus * 100)}%` : `+${Math.round(bonus)}`}`;
        })
        .join('   ');

    const extras = [
        extraLives > 0 ? `LIFE x${extraLives}` : '',
        ...augmentLabels,
    ].filter(Boolean).join('   ');

    return extras ? `${line}   ${extras}` : line;
}

/** Removes and returns one entry, chosen with probability proportional to its weight. */
function takeWeighted (items: Weighted[]): UpgradeChoice
{
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;

    for (let i = 0; i < items.length; i++)
    {
        roll -= items[i].weight;

        if (roll <= 0)
        {
            return items.splice(i, 1)[0].choice;
        }
    }

    return items.pop()!.choice;
}

function shuffle<T> (items: T[]): T[]
{
    for (let i = items.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
}
