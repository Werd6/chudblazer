export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

export const WORLD_WIDTH = 4096;
export const WORLD_HEIGHT = 4096;

export const BACKGROUND_COLOR = '#1a2e1a';

export const PLAYER_SPEED = 180;
export const PLAYER_RADIUS = 17;

export const PLAYER = {
    maxHp: 100,
    /** Brief i-frames after taking a hit so a pile of chuds doesn't delete you instantly. */
    invulnSeconds: 0.7,
    hitFlashSeconds: 0.12,
    /** Fraction of max HP restored each time you level up. */
    levelUpHeal: 0.25,
    hitTint: 0xff3b3b,
    dodgeTint: 0x7ec8ff,
    /** On a lifesteal proc, heal this fraction of the damage that hit landed. */
    lifestealHealFraction: 0.5,
    /** Invuln granted after burning an extra life. */
    extraLifeInvulnSeconds: 2,
    /** HP restored to this fraction of max when an extra life triggers. */
    extraLifeHeal: 1,
};

export const PLAYER_SPRITE = {
    textureScale: 0.5,
    waddleAngle: 0.08,
    waddleSpeed: 14,
    hopHeight: 2,
};

export const CAMERA_LERP = 0.1;

export const TEXTURES = {
    capybaraStand: 'capybara-stand',
    capybaraWalk: 'capybara-walk',
    ground: 'ground',
    goblin: 'chud-goblin',
    ork: 'chud-ork',
    troll: 'chud-troll',
    kingStinky: 'boss-king-stinky',
    frankenfart: 'boss-frankenfart',
    ooglyBoogly: 'boss-oogly-boogly',
    grosstesque: 'boss-grosstesque',
    pistol: 'gun-pistol',
    smg: 'gun-smg',
    shotgun: 'gun-shotgun',
    sword: 'gun-sword',
    remington: 'gun-remington',
    glock: 'gun-glock',
    lips: 'gun-lips',
    bennyBomb: 'gun-benny-bomb',
    noKings: 'gun-no-kings',
    lightsaber: 'gun-lightsaber',
    gatling: 'gun-gatling',
    squishmallow: 'gun-squishmallow',
    bullet: 'bullet',
    rifleRound: 'proj-rifle',
    goldRound: 'proj-gold',
    urMom: 'proj-ur-mom',
    squishShot: 'proj-squish',
    fxPixel: 'fx-pixel',
    fxSlash: 'fx-slash',
    fxBoom: 'fx-boom',
    orange: 'orange',
    introVillage: 'intro-01-village',
    introChudsArrive: 'intro-02-chuds-arrive',
    introOrangesStolen: 'intro-03-oranges-stolen',
    introQuestBegins: 'intro-04-quest-begins',
} as const;

/** Story panels shown after the title screen, before Game. */
export const INTRO = {
    panels: [
        TEXTURES.introVillage,
        TEXTURES.introChudsArrive,
        TEXTURES.introOrangesStolen,
        TEXTURES.introQuestBegins,
    ] as string[],
    files: {
        [TEXTURES.introVillage]: 'intro/01-village.png',
        [TEXTURES.introChudsArrive]: 'intro/02-chuds-arrive.png',
        [TEXTURES.introOrangesStolen]: 'intro/03-oranges-stolen.png',
        [TEXTURES.introQuestBegins]: 'intro/04-quest-begins.png',
    } as Record<string, string>,
    holdSeconds: 4.2,
    fadeSeconds: 0.45,
    background: 0x120c18,
};

export const DEPTH = {
    oranges: 1,
    chuds: 2,
    player: 10,
    guns: 11,
    bullets: 12,
    effects: 13,
    bossBar: 50,
    hud: 100,
};

export type ChudKind = 'goblin' | 'ork' | 'troll' | 'king' | 'frankenfart' | 'ooglyBoogly' | 'grosstesque';

export type ChudDef = {
    texture: string;
    radius: number;
    /** On-screen size in px, as sqrt(width * height) of the sprite. */
    spriteSize: number;
    speed: number;
    hp: number;
    /** Damage dealt to the player on contact (once per invuln window). */
    contactDamage: number;
    xp: number;
    unlockAt: number;
    weight: number;
    /** Set for bosses: spawned only by BossDirector, never in the random horde, never shoved or despawned. */
    bossName?: string;
};

// Separation only checks neighbouring grid cells, so any two horde radii must sum to <= GRID_CELL_SIZE.
// Goblins stay tiny; everything else steps up the size ladder. Bosses are huge (and skip separation).
export const CHUDS: Record<ChudKind, ChudDef> = {
    goblin: { texture: TEXTURES.goblin, radius: 8, spriteSize: 26, speed: 95, hp: 10, contactDamage: 6, xp: 1, unlockAt: 0, weight: 1 },
    ork: { texture: TEXTURES.ork, radius: 20, spriteSize: 64, speed: 70, hp: 120, contactDamage: 12, xp: 3, unlockAt: 20, weight: 0.6 },
    troll: { texture: TEXTURES.troll, radius: 36, spriteSize: 110, speed: 45, hp: 420, contactDamage: 20, xp: 8, unlockAt: 60, weight: 0.3 },
    king: {
        texture: TEXTURES.kingStinky, radius: 72, spriteSize: 280, speed: 40, hp: 6000, contactDamage: 28, xp: 0, unlockAt: Infinity, weight: 0,
        bossName: 'King Stinky the Poop Dragon',
    },
    frankenfart: {
        texture: TEXTURES.frankenfart, radius: 78, spriteSize: 300, speed: 50, hp: 9000, contactDamage: 32, xp: 0, unlockAt: Infinity, weight: 0,
        bossName: 'Frankenfart',
    },
    ooglyBoogly: {
        texture: TEXTURES.ooglyBoogly, radius: 58, spriteSize: 230, speed: 75, hp: 7000, contactDamage: 24, xp: 0, unlockAt: Infinity, weight: 0,
        bossName: 'ooglyBoogly',
    },
    grosstesque: {
        texture: TEXTURES.grosstesque, radius: 96, spriteSize: 360, speed: 35, hp: 16000, contactDamage: 40, xp: 0, unlockAt: Infinity, weight: 0,
        bossName: 'Grosstesque',
    },
};

export const BOSS = {
    /** Bosses arrive in this order, then the rotation repeats with more HP. */
    order: ['king', 'frankenfart', 'ooglyBoogly', 'grosstesque'] as ChudKind[],
    /** First boss at 3:00, then another 3 minutes after each kill. */
    firstAt: 3 * 60,
    respawnAfter: 3 * 60,
    hpGrowthPerLap: 1.6,
    /** While alive, boss speed grows by this fraction of base speed every second. */
    speedGainPerSecond: 0.02,
    /** Cap on the alive-time speed multiplier (1 = base). */
    speedMaxMultiplier: 2.75,
    orangeCount: 30,
    orangeValue: 5,
    orangeScatter: 70,
    barWidth: 150,
    barHeight: 10,
    bannerSeconds: 3,
};

/** Run-time growth applied to every chud (horde + bosses) at spawn. */
export const SCALING = {
    /** +this fraction of base HP per minute of run time. */
    hpPerMinute: 0.3,
    /** +this fraction of base contact damage per minute of run time. */
    damagePerMinute: 0.22,
};

export function scaleForElapsed (elapsed: number)
{
    const minutes = Math.max(0, elapsed) / 60;

    return {
        hp: 1 + SCALING.hpPerMinute * minutes,
        damage: 1 + SCALING.damagePerMinute * minutes,
    };
}

export const CHUD_ANIM = {
    waddleAngle: 0.07,
    waddlePerPixel: 0.15,
    faceDeadzone: 4,
};

export const CHUD_KINDS = Object.keys(CHUDS) as ChudKind[];

export const HORDE_KINDS = CHUD_KINDS.filter(kind => !CHUDS[kind].bossName);

export const MAX_CHUD_RADIUS = Math.max(...CHUD_KINDS.map(kind => CHUDS[kind].radius));

export type WeaponKind =
    | 'pistol' | 'smg' | 'shotgun'
    | 'sword' | 'remington' | 'glock' | 'meanWords' | 'bennyBomb'
    | 'noKings' | 'lightsaber' | 'gatling' | 'squishmallow';

export type Rarity = 'common' | 'rare' | 'legendary';

export const RARITY: Record<Rarity, { label: string; color: number; offerWeight: number }> = {
    common: { label: 'COMMON', color: 0x9a9a9a, offerWeight: 1 },
    rare: { label: 'RARE', color: 0x3b8fd9, offerWeight: 0.5 },
    legendary: { label: 'LEGENDARY', color: 0xffc83a, offerWeight: 0.2 },
};

type WeaponBase = {
    name: string;
    blurb: string;
    texture: string;
    rarity: Rarity;
    damage: number;
    cooldown: number;
    /** Gun/beam: how far it reaches. Melee: swing reach from the weapon. */
    range: number;
    barrelLength: number;
};

export type GunDef = WeaponBase & {
    attack: 'gun';
    bulletSpeed: number;
    pierce: number;
    projectiles: number;
    spread: number;
    jitter: number;
    projectile?: { texture: string; hitRadius?: number; spin?: number; faceVelocity?: boolean };
    slow?: { factor: number; seconds: number };
    /** Lobbed: flies over chuds to the target's position and explodes there. */
    explosion?: { radius: number };
};

export type MeleeDef = WeaponBase & {
    attack: 'melee';
    /** Radians covered by one swing, centred on the target. */
    arc: number;
    swingSeconds: number;
    slashColor: number;
};

export type BeamDef = WeaponBase & {
    attack: 'beam';
    width: number;
    color: number;
    beamSeconds: number;
};

export type WeaponDef = GunDef | MeleeDef | BeamDef;

export const WEAPONS: Record<WeaponKind, WeaponDef> = {
    pistol: {
        attack: 'gun', rarity: 'common',
        name: 'Pistol',
        blurb: 'Steady shots that pierce 1 chud.',
        texture: TEXTURES.pistol,
        damage: 10, cooldown: 0.55, range: 320,
        bulletSpeed: 620, pierce: 1, projectiles: 1, spread: 0, jitter: 0, barrelLength: 12,
    },
    smg: {
        attack: 'gun', rarity: 'common',
        name: 'SMG',
        blurb: 'Sprays weak bullets very fast at short range.',
        texture: TEXTURES.smg,
        damage: 4, cooldown: 0.18, range: 230,
        bulletSpeed: 700, pierce: 0, projectiles: 1, spread: 0, jitter: 0.12, barrelLength: 12,
    },
    shotgun: {
        attack: 'gun', rarity: 'common',
        name: 'Shotgun',
        blurb: 'Slow blast of 5 pellets. Brutal up close.',
        texture: TEXTURES.shotgun,
        damage: 6, cooldown: 1.1, range: 200,
        bulletSpeed: 560, pierce: 0, projectiles: 5, spread: 0.6, jitter: 0.05, barrelLength: 18,
    },
    sword: {
        attack: 'melee', rarity: 'common',
        name: 'Sword',
        blurb: 'Slashes every chud in a wide arc.',
        texture: TEXTURES.sword,
        damage: 14, cooldown: 0.8, range: 64, barrelLength: 0,
        arc: 2.1, swingSeconds: 0.15, slashColor: 0xdfe8ff,
    },
    meanWords: {
        attack: 'gun', rarity: 'common',
        name: 'Mean Words',
        blurb: 'Lips that fire "ur mom". Pierces 4 chuds.',
        texture: TEXTURES.lips,
        damage: 20, cooldown: 0.7, range: 300,
        bulletSpeed: 340, pierce: 4, projectiles: 1, spread: 0, jitter: 0, barrelLength: 10,
        projectile: { texture: TEXTURES.urMom, hitRadius: 9 },
    },
    squishmallow: {
        attack: 'gun', rarity: 'common',
        name: 'Squishmallow',
        blurb: 'Mini squishmallows that slow chuds way down.',
        texture: TEXTURES.squishmallow,
        damage: 6, cooldown: 0.5, range: 280,
        bulletSpeed: 320, pierce: 1, projectiles: 2, spread: 0.35, jitter: 0.05, barrelLength: 6,
        projectile: { texture: TEXTURES.squishShot, hitRadius: 5, spin: 6 },
        slow: { factor: 0.4, seconds: 2.5 },
    },
    remington: {
        attack: 'gun', rarity: 'rare',
        name: 'Remington Bolt Action Rifle',
        blurb: 'Huge, slow shots that punch through 8 chuds.',
        texture: TEXTURES.remington,
        damage: 120, cooldown: 1.2, range: 560,
        bulletSpeed: 1300, pierce: 8, projectiles: 1, spread: 0, jitter: 0, barrelLength: 26,
        projectile: { texture: TEXTURES.rifleRound, faceVelocity: true },
    },
    bennyBomb: {
        attack: 'gun', rarity: 'rare',
        name: 'Benny Bomb',
        blurb: 'Lobs a Benny bomb. Big boom where it lands.',
        texture: TEXTURES.bennyBomb,
        damage: 60, cooldown: 1.6, range: 300,
        bulletSpeed: 360, pierce: 0, projectiles: 1, spread: 0, jitter: 0, barrelLength: 4,
        projectile: { texture: TEXTURES.bennyBomb, spin: 10 },
        explosion: { radius: 80 },
    },
    noKings: {
        attack: 'beam', rarity: 'rare',
        name: 'No Kings Sign',
        blurb: 'Fires a laser through every chud in a line.',
        texture: TEXTURES.noKings,
        damage: 45, cooldown: 0.8, range: 450, barrelLength: 20,
        width: 16, color: 0xff3b3b, beamSeconds: 0.18,
    },
    gatling: {
        attack: 'gun', rarity: 'rare',
        name: 'Gatling Gun',
        blurb: 'A wall of lead. 22 shots a second.',
        texture: TEXTURES.gatling,
        damage: 7, cooldown: 0.045, range: 320,
        bulletSpeed: 900, pierce: 0, projectiles: 1, spread: 0, jitter: 0.16, barrelLength: 24,
    },
    glock: {
        attack: 'gun', rarity: 'legendary',
        name: 'Glock',
        blurb: 'Legendary. Absolutely unfair.',
        texture: TEXTURES.glock,
        damage: 35, cooldown: 0.1, range: 400,
        bulletSpeed: 950, pierce: 3, projectiles: 1, spread: 0, jitter: 0.04, barrelLength: 12,
        projectile: { texture: TEXTURES.goldRound, faceVelocity: true },
    },
    lightsaber: {
        attack: 'melee', rarity: 'legendary',
        name: 'Lightsaber',
        blurb: 'Legendary. Huge, glowing swings.',
        texture: TEXTURES.lightsaber,
        damage: 70, cooldown: 0.35, range: 95, barrelLength: 0,
        arc: 3.8, swingSeconds: 0.12, slashColor: 0x4fd2ff,
    },
};

export const WEAPON_KINDS = Object.keys(WEAPONS) as WeaponKind[];

export const xpToNextLevel = (level: number) => (level + 3) ** 2;

export const LEVEL_UP = {
    choices: 3,
    inputDelaySeconds: 0.3,
    guaranteeWeaponBelowGuns: 3,
    /** Offer weight of each stat card; weapons use RARITY[...].offerWeight. */
    statOfferWeight: 1.2,
    slotOfferWeight: 1.5,
    extraLifeOfferWeight: 0.9,
    /** Every N levels the pool is mythical orange augments instead. */
    mythicalEvery: 10,
};

export const LEADERBOARD = {
    maxEntries: 10,
    maxNameLength: 12,
    storageKey: 'chudlblazer-leaderboard',
    /** Default name if the player submits blank. */
    defaultName: 'CAPY',
};

export const WEAPON_RACK = {
    startSlots: 6,
    slotCap: 14,
    orbitRadius: 34,
    orbitRadiusPerExtraGun: 4,
    slotLerp: 0.2,
    bobAmplitude: 2,
    bobSpeed: 3,
    recoilKick: 4,
    recoilRecovery: 30,
};

export const AUGMENTS = {
    color: 0xff7a18,
    steroids: { fireRate: 0.5, damage: 0.5, dps: 2 },
    vampirism: { maxHpFactor: 0.5, lifesteal: 0.2 },
    savantSlots: 4,
    singleMinded: { fireRate: 10, damage: 2 },
    farmerDoubleChance: 0.5,
    splitter: { rays: 8, damage: 12, speed: 420, range: 260, pierce: 1 },
    chudness: { maxHpBonus: 200, contactDamage: 30 },
    gluttony: { damage: 28, speed: 480, range: 320, explodeRadius: 70 },
};

export const BULLETS = {
    maxActive: 600,
    radius: 3,
    rangeMultiplier: 1.2,
};

export const EFFECTS = {
    slashTailSeconds: 0.1,
    explosionSeconds: 0.3,
    slowTint: 0x9fd4ff,
};

/** Keys match files in public/assets/sfx/*.wav (OpenGameArt gun / laser / monster packs). */
export const SOUNDS = {
    pistol: 'sfx-pistol',
    smg: 'sfx-smg',
    shotgun: 'sfx-shotgun',
    sword: 'sfx-sword',
    remington: 'sfx-remington',
    glock: 'sfx-glock',
    meanWords: 'sfx-mean-words',
    bennyBomb: 'sfx-benny-bomb',
    noKings: 'sfx-no-kings',
    lightsaber: 'sfx-lightsaber',
    gatling: 'sfx-gatling',
    squishmallow: 'sfx-squishmallow',
    orange: 'sfx-orange',
    levelUp: 'sfx-levelup',
    /** Sudocolon — Chip Bit Danger (CC0), OpenGameArt. */
    music: 'music-chip-bit-danger',
    goblin: 'sfx-hit-goblin',
    ork: 'sfx-hit-ork',
    troll: 'sfx-hit-troll',
    king: 'sfx-hit-king',
    frankenfart: 'sfx-hit-frankenfart',
    ooglyBoogly: 'sfx-hit-oogly',
    grosstesque: 'sfx-hit-grosstesque',
} as const;

export const WEAPON_SOUNDS: Record<WeaponKind, string> = {
    pistol: SOUNDS.pistol,
    smg: SOUNDS.smg,
    shotgun: SOUNDS.shotgun,
    sword: SOUNDS.sword,
    remington: SOUNDS.remington,
    glock: SOUNDS.glock,
    meanWords: SOUNDS.meanWords,
    bennyBomb: SOUNDS.bennyBomb,
    noKings: SOUNDS.noKings,
    lightsaber: SOUNDS.lightsaber,
    gatling: SOUNDS.gatling,
    squishmallow: SOUNDS.squishmallow,
};

export const CHUD_HIT_SOUNDS: Record<ChudKind, string> = {
    goblin: SOUNDS.goblin,
    ork: SOUNDS.ork,
    troll: SOUNDS.troll,
    king: SOUNDS.king,
    frankenfart: SOUNDS.frankenfart,
    ooglyBoogly: SOUNDS.ooglyBoogly,
    grosstesque: SOUNDS.grosstesque,
};

export const SOUND_FILES: Record<string, string> = {
    [SOUNDS.pistol]: 'sfx/pistol.wav',
    [SOUNDS.smg]: 'sfx/smg.wav',
    [SOUNDS.shotgun]: 'sfx/shotgun.wav',
    [SOUNDS.sword]: 'sfx/sword.wav',
    [SOUNDS.remington]: 'sfx/remington.wav',
    [SOUNDS.glock]: 'sfx/glock.wav',
    [SOUNDS.meanWords]: 'sfx/meanWords.wav',
    [SOUNDS.bennyBomb]: 'sfx/bennyBomb.wav',
    [SOUNDS.noKings]: 'sfx/noKings.wav',
    [SOUNDS.lightsaber]: 'sfx/lightsaber.wav',
    [SOUNDS.gatling]: 'sfx/gatling.wav',
    [SOUNDS.squishmallow]: 'sfx/squishmallow.wav',
    [SOUNDS.orange]: 'sfx/orange.wav',
    [SOUNDS.levelUp]: 'sfx/levelup.wav',
    [SOUNDS.music]: 'music/chip-bit-danger.mp3',
    [SOUNDS.goblin]: 'sfx/hit-goblin.wav',
    [SOUNDS.ork]: 'sfx/hit-ork.wav',
    [SOUNDS.troll]: 'sfx/hit-troll.wav',
    [SOUNDS.king]: 'sfx/hit-king.wav',
    [SOUNDS.frankenfart]: 'sfx/hit-frankenfart.wav',
    [SOUNDS.ooglyBoogly]: 'sfx/hit-ooglyBoogly.wav',
    [SOUNDS.grosstesque]: 'sfx/hit-grosstesque.wav',
};

export const SOUND = {
    masterVolume: 0.55,
    musicVolume: 0.32,
    /** Multiplier applied while Level Up / Pause / Game Over menus are up. */
    musicDuckFactor: 0.28,
    weaponVolume: {
        pistol: 0.5,
        smg: 0.32,
        shotgun: 0.62,
        sword: 0.5,
        remington: 0.7,
        glock: 0.42,
        meanWords: 0.5,
        bennyBomb: 0.65,
        noKings: 0.55,
        lightsaber: 0.55,
        gatling: 0.22,
        squishmallow: 0.4,
    } satisfies Record<WeaponKind, number>,
    orangeVolume: 0.4,
    hitVolume: {
        goblin: 0.3,
        ork: 0.34,
        troll: 0.4,
        king: 0.55,
        frankenfart: 0.5,
        ooglyBoogly: 0.42,
        grosstesque: 0.55,
    } satisfies Record<ChudKind, number>,
    levelUpVolume: 0.7,
    /** Caps overlapping copies of the same cue so hordes/gatling don't explode the audio bus. */
    throttleMs: {
        goblin: 40,
        ork: 45,
        troll: 55,
        king: 90,
        frankenfart: 90,
        ooglyBoogly: 80,
        grosstesque: 100,
        gatling: 30,
        smg: 35,
        glock: 40,
        orange: 55,
    } as Partial<Record<string, number>>,
};

export const ORANGES = {
    radius: 5,
    magnetRadius: 90,
    magnetSpeed: 420,
    collectRadius: 14,
    maxOnGround: 400,
    dropScatter: 6,
    mergeScale: 0.05,
    maxScale: 2,
};

export const CHUD_HIT_FLASH_SECONDS = 0.06;

export const SPAWN = {
    intervalStart: 0.9,
    intervalMin: 0.12,
    /** Spawn interval + burst size ramp until this time, then hold. */
    rampSeconds: 15 * 60,
    burstEverySeconds: 60,
    weightRampSeconds: 60,
    maxActive: 400,
    ringMargin: 80,
    despawnDistance: 1400,
};

export const SEPARATION = {
    response: 0.5,
    maxPushPerFrame: 4,
};

/** Must be >= largest two horde radii combined (ork + troll). Bosses skip separation. */
export const GRID_CELL_SIZE = 96;
