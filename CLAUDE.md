# Offline AI Portfolio Builder

Web app where users build a personal portfolio site through a chat interface powered by a **local** small language model (no cloud AI ever), preview and approve changes, then push to GitHub and deploy to Vercel.

## Read these
- [docs/PRD.md](docs/PRD.md) — full product spec
- [docs/DECISIONS.md](docs/DECISIONS.md) — decisions that override the PRD (read before designing anything)
- [docs/PROGRESS.md](docs/PROGRESS.md) — what's done and what's next. **Update it when finishing a task.**

## Stack
SvelteKit (Svelte 5) · TypeScript · Tailwind CSS · Vitest. **No React / Next.js.**

## Core rules
- A portfolio is a JSON document. **Every change goes through a typed edit operation** in the editing engine (validate → apply → undoable). Never mutate portfolio state directly from UI or AI code.
- AI (Phase 2+) only outputs edit operations, never raw files or shell commands.
- Nothing is applied without user approval in the change review.
- Previews render in a sandboxed iframe (`sandbox` without `allow-same-origin`).
- Tokens (GitHub/Vercel) are passphrase-encrypted (AES-GCM + PBKDF2), never logged, never stored in plaintext, never sent anywhere but their own API.
- The SLM is chosen by the user — don't pick or hardcode one.
- Keep the app bundle light; device memory is reserved for the model.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run check` — svelte-check / types
- `npm test` — unit tests

## Workflow
- Start of session: read PROGRESS.md, continue with next unchecked task.
- End of task: update PROGRESS.md, commit.
- New decision: append to DECISIONS.md with the reason.
