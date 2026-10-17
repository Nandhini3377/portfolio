# Progress

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

**Current focus:** Phase 2 — local AI working; full 30-case benchmark run still to do (user can run it at /model/bench)

## Phase 0 — Project tracking
- [x] git repo
- [x] docs/PRD.md, docs/DECISIONS.md, docs/PROGRESS.md
- [x] CLAUDE.md

## Phase 1 — Portfolio Foundation
- [x] Scaffold SvelteKit + TS + Tailwind
- [x] Portfolio JSON schema + validation
- [x] Editing engine: typed operations, validate → apply, undo/redo, versioned drafts
- [x] Template research (web) → 3 starter templates
- [x] Template renderer (portfolio JSON → HTML/CSS)
- [x] Editor UI: section forms + live preview (sandboxed iframe), desktop/mobile toggle
- [x] Change review: before/after diff, approve / reject / revise
- [x] Local draft persistence (IndexedDB) + storage warnings + JSON import/export
- [x] Export: static HTML zip + SvelteKit project zip
- [x] Offline-capable app shell (service worker)
- [x] Tests for schema, operations, undo

**Phase 1 verification (2026-10-17):** 20 unit tests pass; type check clean; browser walkthrough in Chrome (edit → validation error → review → approve → undo/redo → reload persistence → 3 exports → phone layout → offline mode) passes with no console errors; exported SvelteKit project installs and builds.

**Known gaps / ideas for later:** accent colour isn't contrast-checked against the background; no drag-and-drop reordering (up/down buttons only); photo is a link, not an upload.

## Phase 2 — Local SLM (model to be specified by user)
- [x] WebGPU / device capability check screen (`/model`)
- [x] Model download with progress, retry, cache, remove
- [x] Chat UI → model → edit operations → change review (Chat tab)
- [x] Guardrails: drop unrequested theme changes, invented links/emails, no-op actions
- [x] Live progress, elapsed time, 90 s timeout, Stop button
- [~] Benchmark page (`/model/bench`, 30 cases) built; full run on each candidate model still to do

**Measured on Intel Gen-9 integrated GPU (2026-10-17), Qwen2.5-Coder-1.5B q4f16:** download ~830 MB in ~30 s; reading the prompt ~680 tokens @ 80–90 tok/s (~8 s); writing @ ~4.7 tok/s. Typical request 11–25 s. Before trimming the prompt and removing the free-text reply, the same request took 90 s+ (model wrote up to 400 tokens).

## Phase 3 — GitHub
- [ ] Guided account + token creation, paste token
- [ ] Passphrase-encrypted token vault
- [ ] Repo/branch select or create
- [ ] Changed-files review → approved commit/push

## Phase 4 — Vercel
- [ ] Guided token creation, paste token (same vault)
- [ ] Create/select project, deploy via REST API
- [ ] Deployment status polling + published URL + actionable errors

## Phase 5 — Testing & Release
- [ ] Browser/device matrix
- [ ] Security, storage, recovery, integration failure tests
