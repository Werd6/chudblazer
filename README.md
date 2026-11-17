# chudlblazer

A browser survivors-like. Play as a capybara, collect oranges to level up, and blast the chuds.

Built with Phaser 4, TypeScript, and Vite.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:8080 with hot reload |
| `npm run build` | Typecheck and build a static site into `dist/` |
| `npm run preview` | Serve the production build locally |

`dist/` uses relative paths, so its contents can be uploaded to any static host (itch.io, GitHub Pages, Vercel, etc.).

## Shared leaderboard (Vercel)

Production is wired to a **Vercel Blob** store. Scores hit `/api/leaderboard` and sync across players.

| Env | Purpose |
|-----|---------|
| `BLOB_READ_WRITE_TOKEN` | Auto-created when the Blob store is connected to the Vercel project |

Local shared board: `npx vercel link` → `npx vercel env pull .env.local` → `npx vercel dev` (or use production).

## Controls

WASD or arrow keys to move. On touch: left-side joystick. Esc / P to pause.
