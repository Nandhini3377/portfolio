# Decisions Log

Decisions that refine or override [PRD.md](PRD.md). Newest at the bottom. Each entry: what, why.

## 2026-10-17 — Initial clarifications

| # | Topic | Decision | Why |
|---|-------|----------|-----|
| D1 | Builder framework | **SvelteKit + TypeScript + Tailwind CSS**. No React (so no Next.js). | User does not want React. SvelteKit is lightweight, Vercel-supported, and leaves more device memory for the local model. |
| D2 | Editing architecture | Portfolio is a **JSON document** (profile, theme, layout, sections) rendered by templates. All changes are **typed edit operations** validated against a schema. | PRD product principle: AI interprets intent; a controlled engine applies changes. Small models can emit valid ops reliably, not whole files. |
| D3 | Portfolio export | **Both**: static HTML/CSS zip **and** a SvelteKit project. | User wants both options. |
| D4 | Templates | ~3 starter templates, designed from web research on current portfolio styles. | User request. |
| D5 | First milestone | **Phase 1 only** (templates, editing engine, live preview, approve/reject, undo, local drafts, export). No AI yet. | User request. |
| D6 | Model | **User will specify the SLM.** Do not pick one. Code must leave a clean slot for it. | User request. |
| D7 | Offline | Model works fully offline once downloaded. Builder app is offline-capable after first load (service worker / PWA). | User request. |
| D8 | Browser support | **WebGPU required** for AI. Unsupported browsers get a clear "not supported" message (editing without AI still works). | User accepted. |
| D9 | GitHub/Vercel auth | **No OAuth backend.** App guides user to create account + generate a token, then user pastes token into our UI. | User request; keeps the app backend-free. |
| D10 | Token protection | Tokens encrypted with **AES-GCM**, key derived from a **user passphrase (PBKDF2)**. Unlocked once per session, kept in memory only while unlocked, never logged, never sent anywhere except the GitHub/Vercel APIs. | User chose passphrase encryption. |
| D11 | Vercel deploy | **Vercel REST API** with pasted token: create project, upload files, poll deployment status, show URL. | User chose API deploy over git-linked auto deploy. |

## 2026-10-17 — Phase 1 build

| # | Topic | Decision | Why |
|---|-------|----------|-----|
| D12 | Templates | **Minimal** (content-first single column), **Bento** (dark card grid, mono), **Editorial** (serif, numbered bands, case-study projects). All render the same JSON; templates only change markup/CSS. | Web research: minimalist content-first, interactive grids and case-study layouts are the dominant 2026 portfolio patterns. |
| D13 | Manual edits need approval too | Form edits are **staged** as pending ops (coalesced per field) and shown live in the preview; user approves or rejects them as a batch. Same path the AI will use. | One review flow for manual and AI edits; PRD requires nothing unapproved is committed. |
| D14 | Preview sandbox | iframe `sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"`, **no `allow-scripts`**. | Lets the editor patch the preview in place (no reload, keeps scroll). Safe because no script can execute inside it. |
| D15 | One section per type | A portfolio has at most one section of each type (intro, skills, projects, experience, education, contact). | Simpler model and simpler for a small model to target ("add a projects section"). |
| D16 | Exports | Exports contain **approved** state only. SvelteKit export copies the renderer source so output is identical to the preview. | Pending edits are not yet accepted. |
| D17 | Builder hosting | Builder is a fully static SPA (`adapter-static`, `ssr = false`), offline via service worker. | No backend needed; deployable anywhere, works offline. |
