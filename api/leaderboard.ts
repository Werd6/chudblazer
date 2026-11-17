import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get, put } from '@vercel/blob';

type Entry = { name: string; score: number };

const PATH = 'leaderboard/top10.json';
const MAX_ENTRIES = 10;
const MAX_NAME = 12;
const MAX_SCORE = 1_000_000;
const DEFAULT_NAME = 'CAPY';

export default async function handler (req: VercelRequest, res: VercelResponse)
{
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS')
    {
        res.status(204).end();
        return;
    }

    try
    {
        if (req.method === 'GET')
        {
            const entries = await readEntries();
            res.status(200).json({ entries });
            return;
        }

        if (req.method === 'POST')
        {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
            const score = clampScore(body.score);
            const name = sanitizeName(typeof body.name === 'string' ? body.name : '');

            if (score <= 0)
            {
                res.status(400).json({ error: 'Score must be positive', entries: await readEntries() });
                return;
            }

            const current = await readEntries();

            if (!wouldQualify(current, score))
            {
                res.status(200).json({ entries: current, rank: 0, saved: false });
                return;
            }

            const entry: Entry = { name: name || DEFAULT_NAME, score };
            const next = [...current, entry].sort(byScoreDesc).slice(0, MAX_ENTRIES);
            await writeEntries(next);

            const rank = next.findIndex(row => row.name === entry.name && row.score === entry.score) + 1;
            res.status(200).json({ entries: next, rank, saved: true });
            return;
        }

        res.setHeader('Allow', 'GET, POST, OPTIONS');
        res.status(405).json({ error: 'Method not allowed' });
    }
    catch (error)
    {
        const message = error instanceof Error ? error.message : 'Leaderboard unavailable';
        res.status(503).json({ error: message, entries: [] });
    }
}

async function readEntries (): Promise<Entry[]>
{
    try
    {
        const result = await get(PATH, { access: 'private', useCache: false });

        if (!result?.stream)
        {
            return [];
        }

        const text = await new Response(result.stream).text();

        if (!text)
        {
            return [];
        }

        return normalize(JSON.parse(text));
    }
    catch
    {
        return [];
    }
}

async function writeEntries (entries: Entry[])
{
    await put(PATH, JSON.stringify(entries), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
    });
}

function normalize (raw: unknown): Entry[]
{
    if (!Array.isArray(raw))
    {
        return [];
    }

    return raw
        .filter((entry): entry is Entry =>
            !!entry
            && typeof (entry as Entry).name === 'string'
            && typeof (entry as Entry).score === 'number'
            && Number.isFinite((entry as Entry).score))
        .map(entry => ({
            name: sanitizeName(entry.name) || DEFAULT_NAME,
            score: clampScore(entry.score),
        }))
        .sort(byScoreDesc)
        .slice(0, MAX_ENTRIES);
}

function wouldQualify (entries: Entry[], score: number)
{
    if (entries.length < MAX_ENTRIES)
    {
        return true;
    }

    return score > entries[entries.length - 1].score;
}

function byScoreDesc (a: Entry, b: Entry)
{
    return b.score - a.score;
}

function clampScore (value: unknown)
{
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n))
    {
        return 0;
    }

    return Math.max(0, Math.min(MAX_SCORE, Math.floor(n)));
}

function sanitizeName (name: string)
{
    return name
        .replace(/[^\w\s\-!.]/g, '')
        .trim()
        .slice(0, MAX_NAME)
        .toUpperCase();
}
