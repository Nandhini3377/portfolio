# Progress

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

**Current focus:** Phase 1 — Portfolio Foundation

## Phase 0 — Project tracking
- [x] git repo
- [x] docs/PRD.md, docs/DECISIONS.md, docs/PROGRESS.md
- [x] CLAUDE.md

## Phase 1 — Portfolio Foundation
- [ ] Scaffold SvelteKit + TS + Tailwind
- [ ] Portfolio JSON schema + validation
- [ ] Editing engine: typed operations, validate → apply, undo/redo, versioned drafts
- [ ] Template research (web) → 3 starter templates
- [ ] Template renderer (portfolio JSON → HTML/CSS)
- [ ] Editor UI: section forms + live preview (sandboxed iframe), desktop/mobile toggle
- [ ] Change review: before/after diff, approve / reject / revise
- [ ] Local draft persistence (IndexedDB) + storage warnings + JSON import/export
- [ ] Export: static HTML zip + SvelteKit project zip
- [ ] Offline-capable app shell (service worker)
- [ ] Tests for schema, operations, undo

## Phase 2 — Local SLM (model to be specified by user)
- [ ] WebGPU / device capability check screen
- [ ] Model download with progress, retry, cache, remove
- [ ] Chat UI → model → edit operations → change review
- [ ] Benchmark on ~8 GB RAM device

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
