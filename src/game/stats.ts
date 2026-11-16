export type PlayerStats = {
    damage: number;
    fireRate: number;
    range: number;
    pierce: number;
    pickupRadius: number;
    moveSpeed: number;
    /** Chance (0-1+) to heal when a weapon hit deals damage. */
    lifesteal: number;
    /** Chance (0-1+) to ignore incoming contact damage. */
    dodge: number;
};

export type StatKey = keyof PlayerStats;

export const createStats = (): PlayerStats => ({
    damage: 1,
    fireRate: 1,
    range: 1,
    pierce: 0,
    pickupRadius: 1,
    moveSpeed: 1,
    lifesteal: 0,
    dodge: 0,
});
