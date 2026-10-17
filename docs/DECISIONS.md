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
