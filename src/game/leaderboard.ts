import { GameObjects, Scene } from 'phaser';
import { LEADERBOARD } from './config';

export type LeaderboardEntry = {
    name: string;
    score: number;
};

type SubmitResult = {
    entries: LeaderboardEntry[];
    rank: number;
    saved: boolean;
};

const API_URL = '/api/leaderboard';

/** Loads the shared board from Vercel/Upstash, falling back to localStorage offline. */
export async function fetchLeaderboard (): Promise<LeaderboardEntry[]>
{
    try
    {
        const res = await fetch(API_URL, { method: 'GET', cache: 'no-store' });

        if (res.ok)
        {
            const data = await res.json();
            const entries = normalize(data.entries);
            cacheLocal(entries);
            return entries;
        }
    }
    catch
    {
        // Fall through to local cache (vite dev without `vercel dev`).
    }

    return loadLocal();
}

export async function qualifiesForLeaderboard (score: number): Promise<boolean>
{
    const oranges = Math.max(0, Math.floor(score));

    if (oranges <= 0)
    {
        return false;
    }

    const entries = await fetchLeaderboard();

    if (entries.length < LEADERBOARD.maxEntries)
    {
        return true;
    }

    return oranges > entries[entries.length - 1].score;
}

/** Saves a top-10 run to Upstash (or localStorage if the API is unreachable). */
export async function submitScore (name: string, score: number): Promise<SubmitResult>
{
    const oranges = Math.max(0, Math.floor(score));
    const cleanName = sanitizeName(name) || LEADERBOARD.defaultName;

    try
    {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: cleanName, score: oranges }),
        });

        if (res.ok)
        {
            const data = await res.json();
            const entries = normalize(data.entries);
            cacheLocal(entries);
            return {
                entries,
                rank: typeof data.rank === 'number' ? data.rank : 0,
                saved: data.saved !== false,
            };
        }
    }
    catch
    {
        // Fall through.
    }

    return submitLocal(cleanName, oranges);
}

export function sanitizeName (name: string): string
{
    return name
        .replace(/[^\w\s\-!.]/g, '')
        .trim()
        .slice(0, LEADERBOARD.maxNameLength)
        .toUpperCase();
}

export type LeaderboardPanel = {
    root: GameObjects.Container;
    refresh: (highlightRank?: number, entries?: LeaderboardEntry[]) => void;
    load: (highlightRank?: number) => Promise<void>;
};

/** Draws a compact top-10 panel. `highlightRank` is 1-based. */
export function createLeaderboardPanel (
    scene: Scene,
    x: number,
    y: number,
    options: { title?: string; width?: number; highlightRank?: number } = {},
): LeaderboardPanel
{
    const width = options.width ?? 280;
    const rowH = 22;
    const pad = 14;
    const headerH = 36;
    const height = pad * 2 + headerH + LEADERBOARD.maxEntries * rowH;
    const root = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, height, 0x141a14, 0.88)
        .setStrokeStyle(2, 0xffa500);
    const title = scene.add.text(0, -height / 2 + pad + 4, options.title ?? 'TOP ORANGES', {
        fontFamily: 'Arial Black', fontSize: 16, color: '#ffa500',
        stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0);

    const rows: GameObjects.Text[] = [];

    for (let i = 0; i < LEADERBOARD.maxEntries; i++)
    {
        rows.push(scene.add.text(0, -height / 2 + pad + headerH + i * rowH, '', {
            fontFamily: 'Arial', fontSize: 15, color: '#e8e0d0',
        }).setOrigin(0.5, 0));
    }

    root.add([bg, title, ...rows]);

    const paint = (entries: LeaderboardEntry[], highlightRank?: number) => {
        const mark = highlightRank ?? options.highlightRank;

        for (let i = 0; i < LEADERBOARD.maxEntries; i++)
        {
            const entry = entries[i];
            const rank = i + 1;
            const hot = mark === rank;
            rows[i]
                .setColor(hot ? '#ffe14a' : entry ? '#e8e0d0' : '#5a655a')
                .setText(entry
                    ? `${rank}. ${padName(entry.name)}  ${entry.score}`
                    : `${rank}. ---`);
        }
    };

    paint(loadLocal());

    return {
        root,
        refresh: (highlightRank?, entries?) => paint(entries ?? loadLocal(), highlightRank),
        load: async (highlightRank?) => {
            paint(await fetchLeaderboard(), highlightRank);
        },
    };
}

function submitLocal (name: string, score: number): SubmitResult
{
    const entry: LeaderboardEntry = { name, score };
    const next = [...loadLocal(), entry].sort(byScoreDesc).slice(0, LEADERBOARD.maxEntries);
    cacheLocal(next);
    const rank = next.findIndex(row => row.name === entry.name && row.score === entry.score) + 1;
    return { entries: next, rank: rank > 0 ? rank : 0, saved: true };
}

function loadLocal (): LeaderboardEntry[]
{
    try
    {
        const raw = localStorage.getItem(LEADERBOARD.storageKey);
        return raw ? normalize(JSON.parse(raw)) : [];
    }
    catch
    {
        return [];
    }
}

function cacheLocal (entries: LeaderboardEntry[])
{
    try
    {
        localStorage.setItem(LEADERBOARD.storageKey, JSON.stringify(entries));
    }
    catch
    {
        // Ignore quota / private mode.
    }
}

function normalize (raw: unknown): LeaderboardEntry[]
{
    if (!Array.isArray(raw))
    {
        return [];
    }

    return raw
        .filter((entry): entry is LeaderboardEntry =>
            !!entry
            && typeof entry.name === 'string'
            && typeof entry.score === 'number'
            && Number.isFinite(entry.score))
        .map(entry => ({
            name: sanitizeName(entry.name) || LEADERBOARD.defaultName,
            score: Math.max(0, Math.floor(entry.score)),
        }))
        .sort(byScoreDesc)
        .slice(0, LEADERBOARD.maxEntries);
}

function byScoreDesc (a: LeaderboardEntry, b: LeaderboardEntry)
{
    return b.score - a.score;
}

function padName (name: string): string
{
    return name.padEnd(LEADERBOARD.maxNameLength, ' ').slice(0, LEADERBOARD.maxNameLength);
}
