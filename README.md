# Offline AI Portfolio Builder

Build a personal portfolio website on your own device: pick a template, edit content, review every change before it's applied, and export a static site or a SvelteKit project. A local AI model (chat editing), GitHub push and Vercel deploy are coming in later phases.

## Run it

```sh
npm install        # if npm 10 fails with "reading 'edgesOut'", use: npx npm@11 install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static build into `build/` (deployable to Vercel) |
| `npm run preview` | Serve the production build (restart it after each rebuild) |
| `npm test` | Unit tests |
| `npm run check` | Type check |

## Project docs

- [docs/PRD.md](docs/PRD.md) — product requirements
- [docs/DECISIONS.md](docs/DECISIONS.md) — decisions that refine the PRD
- [docs/PROGRESS.md](docs/PROGRESS.md) — what's done and what's next
- [CLAUDE.md](CLAUDE.md) — working rules for Claude Code
