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

## 2026-10-17 — Phase 2 (local model)

| # | Topic | Decision | Why |
|---|-------|----------|-----|
| D18 | Runtime | **WebLLM 0.2.86** (`@mlc-ai/web-llm`), inference in a **Web Worker**, weights cached with the browser Cache API. | Supports JSON-schema constrained decoding (guaranteed-valid JSON), ships prebuilt Qwen 0.5–3B models, keeps the UI responsive. |
| D19 | Candidate models (≤3B, user's limit) | Qwen2.5-Coder **1.5B (default)**, Qwen2.5-Coder 3B, Qwen3.5 2B, Qwen3 1.7B, Qwen2.5-Coder 0.5B. User chooses on `/model`; choice stored per browser. `q4f16` when the GPU supports `shader-f16`, else `q4f32`. | User asked for the best coding model ≤3B; final pick decided by the on-device benchmark (D22). |
| D20 | Model output format | Model emits flat **AI actions** (`hide_section`, `add_item`…) that name sections by type and entries by name. `translate()` resolves names → ids and produces engine `EditOp`s, which are validated as usual. Batch is all-or-nothing. | Small models handle human names far better than generated ids; engine validation still guards everything. |
| D21 | Context budget | Prompt = system rules + 3 few-shot examples + compact text summary of the portfolio + last 4 chat turns; `max_tokens` 700; temperature 0. Qwen3-family thinking disabled. | Fits comfortably in the 4k context of browser models; deterministic output. |
| D22 | Model selection method | `/model/bench` runs 30 realistic requests, auto-checks each result, and records correct / applied / valid-JSON rates, median latency and tokens/s per model on the user's device. | PRD §5.4/§15: benchmark before finalizing the model. |
| D23 | Bundle | Cache status is checked with the Cache API directly (`prebuilt.ts`), so the ~6 MB WebLLM runtime loads only when a model is loaded or removed. | Keeps start page and editor light. |
| D24 | Chat UX | Chat is the default editor tab. AI proposals go through the same pending → review → approve flow as manual edits, and follow-up messages see the proposed (unapproved) state so "no, make it purple" revises naturally. | PRD: approve/reject/revise; one review path. |
| D25 | Output budget | Model returns only `{"actions":[...]}` (+ optional `"ask"` question); the app writes the summary from the actual ops. Max 5 actions / 300 tokens; streaming with live progress; 90 s timeout. | Measured 4.7 tok/s decode on an Intel iGPU: output length dominates latency. Also prevents replies that claim changes that weren't made. |
| D26 | Guardrails | Before translation: drop theme fields the request doesn't mention, links/emails not present in the message or portfolio, and `add_section` for existing sections; after translation: drop no-op ops. Removals are shown to the user. | 1.5B model added unrequested dark mode and invented a GitHub URL in testing. |
| D27 | Model choice final | **Qwen2.5-Coder-1.5B stays the default.** Full multi-model benchmark run skipped (user: takes too long). Benchmark page stays available but is optional. | User decision 2026-10-17; 1.5B verified correct on real requests in ~11–25 s on a low-end iGPU. |
