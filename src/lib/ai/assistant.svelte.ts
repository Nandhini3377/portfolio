// Local model lifecycle: device check → download/cache → load → generate.
// One shared instance for the whole app. All inference happens on this device;
// the only network traffic is the one-time model download.

import type { InitProgressReport, WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import { applyOp, type EditOp } from '#lib/editor/ops.ts';
import type { Portfolio } from '#lib/portfolio/types.ts';
import { checkDevice, type DeviceReport } from './capability.ts';
import { DEFAULT_MODEL, MODELS, modelByBase, variantFor } from './models.ts';
import { isModelCached } from './prebuilt.ts';
import { buildMessages, type ChatTurn } from './prompt.ts';
import { guard, parseResponse, RESPONSE_SCHEMA, translate, type AiAction } from './protocol.ts';

export type ModelStatus = 'checking' | 'unsupported' | 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export interface GenerateStats {
	latencyS: number;
	promptTokens: number;
	completionTokens: number;
	decodeTokensPerS: number;
}

export type GenerateResult =
	| { kind: 'ok'; reply: string; actions: AiAction[]; ops: EditOp[]; dropped: string[]; raw: string; stats: GenerateStats }
	| { kind: 'invalid'; reply: string; error: string; raw: string; stats?: GenerateStats }
	| { kind: 'interrupted' }
	| { kind: 'error'; error: string };

const SELECTED_KEY = 'portfolio-builder:model';
export const GENERATE_TIMEOUT_MS = 90_000;

function readSelected(): string {
	try {
		const v = localStorage.getItem(SELECTED_KEY);
		if (v && modelByBase(v)) return v;
	} catch {
		/* storage blocked */
	}
	return DEFAULT_MODEL;
}

function friendly(e: unknown): string {
	const msg = (e as Error)?.message ?? String(e);
	if (/out of memory|OOM|allocation|maxBufferSize|exceeds/i.test(msg)) return 'Not enough GPU memory for this model. Close other tabs or choose a smaller model.';
	if (/device (was )?lost|DeviceLost/i.test(msg)) return 'The graphics device was reset. Reload the model to continue.';
	if (/network|fetch|Failed to fetch|NetworkError/i.test(msg)) return 'The download was interrupted. Check your connection and retry; finished parts are kept.';
	if (/quota|QuotaExceeded/i.test(msg)) return 'Browser storage is full. Free some space or choose a smaller model.';
	return msg || 'Something went wrong while running the model.';
}

class Assistant {
	status = $state<ModelStatus>('checking');
	device = $state<DeviceReport | null>(null);
	selected = $state(DEFAULT_MODEL);
	/** Which models have files in the browser cache, keyed by base id. */
	cached = $state<Record<string, boolean>>({});
	progress = $state(0);
	progressText = $state('');
	error = $state('');
	loadedModel = $state<string | null>(null);
	busy = $state(false);
	/** Live progress of the current request: 0 tokens means it is still reading the prompt. */
	generating = $state<{ startedAt: number; tokens: number } | null>(null);

	#engine: WebWorkerMLCEngine | null = null;
	#worker: Worker | null = null;
	#started = false;

	get ready() {
		return this.status === 'ready';
	}

	modelId(base = this.selected): string {
		return variantFor(base, this.device?.f16 ?? false);
	}

	/** Idempotent: safe to call from every page that needs AI status. */
	async init() {
		if (this.#started) return;
		this.#started = true;
		this.selected = readSelected();
		this.device = await checkDevice();
		if (!this.device.webgpu) {
			this.status = 'unsupported';
			return;
		}
		await this.refreshCache();
		this.status = 'idle';
	}

	async refreshCache() {
		const entries = await Promise.all(MODELS.map(async (m) => [m.base, await isModelCached(this.modelId(m.base)).catch(() => false)] as const));
		this.cached = Object.fromEntries(entries);
	}

	select(base: string) {
		if (!modelByBase(base) || this.busy) return;
		this.selected = base;
		try {
			localStorage.setItem(SELECTED_KEY, base);
		} catch {
			/* storage blocked */
		}
	}

	/** Downloads (if needed) and initializes the selected model. Retrying resumes. */
	async load() {
		if (!this.device?.webgpu || this.busy) return;
		const base = this.selected;
		const id = this.modelId(base);
		if (this.loadedModel === id && this.#engine) {
			this.status = 'ready';
			return;
		}
		await this.unload();
		this.busy = true;
		this.error = '';
		this.progress = 0;
		this.status = this.cached[base] ? 'loading' : 'downloading';
		this.progressText = this.cached[base] ? 'Loading model from this device…' : 'Starting download…';

		try {
			const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
			this.#worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
			this.#engine = await CreateWebWorkerMLCEngine(this.#worker, id, {
				initProgressCallback: (r: InitProgressReport) => {
					this.progress = r.progress;
					this.progressText = r.text;
				}
			});
			this.loadedModel = id;
			this.cached = { ...this.cached, [base]: true };
			this.status = 'ready';
			this.progress = 1;
			this.progressText = '';
		} catch (e) {
			this.#teardown();
			this.error = friendly(e);
			this.status = 'error';
			await this.refreshCache().catch(() => {});
		} finally {
			this.busy = false;
		}
	}

	/** Stops a download in progress. Already-fetched files stay cached. */
	cancel() {
		this.#teardown();
		this.busy = false;
		this.status = 'idle';
		this.progressText = '';
	}

	async unload() {
		try {
			await this.#engine?.unload();
		} catch {
			/* worker may already be gone */
		}
		this.#teardown();
		if (this.status === 'ready') this.status = 'idle';
	}

	#teardown() {
		this.#worker?.terminate();
		this.#worker = null;
		this.#engine = null;
		this.loadedModel = null;
	}

	/** Deletes a model's files from browser storage. */
	async remove(base: string) {
		if (this.busy) return;
		if (this.loadedModel === this.modelId(base)) await this.unload();
		const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
		await deleteModelAllInfoInCache(this.modelId(base)).catch(() => {});
		await this.refreshCache();
	}

	interrupt() {
		void this.#engine?.interruptGenerate();
	}

	/** One request → validated edit operations (or a reason it couldn't). */
	async generate(portfolio: Portfolio, request: string, history: ChatTurn[] = []): Promise<GenerateResult> {
		if (!this.#engine || this.status !== 'ready') return { kind: 'error', error: 'The AI model is not loaded.' };
		const engine = this.#engine;
		this.busy = true;
		const started = performance.now();
		this.generating = { startedAt: Date.now(), tokens: 0 };
		let raw = '';
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			void engine.interruptGenerate();
		}, GENERATE_TIMEOUT_MS);
		try {
			const thinking = modelByBase(this.selected)?.thinking;
			const stream = await engine.chat.completions.create({
				messages: buildMessages(portfolio, request, history),
				temperature: 0,
				max_tokens: 300,
				stream: true,
				stream_options: { include_usage: true },
				response_format: { type: 'json_object', schema: JSON.stringify(RESPONSE_SCHEMA) },
				...(thinking ? { extra_body: { enable_thinking: false } } : {})
			});
			let finish: string | null | undefined;
			let usage: { prompt_tokens: number; completion_tokens: number; extra?: { decode_tokens_per_s?: number } } | undefined;
			for await (const chunk of stream) {
				const choice = chunk.choices[0];
				if (choice?.delta?.content) {
					raw += choice.delta.content;
					this.generating = { startedAt: this.generating!.startedAt, tokens: this.generating!.tokens + 1 };
				}
				if (choice?.finish_reason) finish = choice.finish_reason;
				if (chunk.usage) usage = chunk.usage;
			}
			const stats: GenerateStats = {
				latencyS: (performance.now() - started) / 1000,
				promptTokens: usage?.prompt_tokens ?? 0,
				completionTokens: usage?.completion_tokens ?? 0,
				decodeTokensPerS: usage?.extra?.decode_tokens_per_s ?? 0
			};
			if (timedOut)
				return { kind: 'error', error: `This took longer than ${GENERATE_TIMEOUT_MS / 1000} seconds on your device, so I stopped. Try a shorter request, or a smaller model on the AI model page.` };
			if (finish === 'abort') return { kind: 'interrupted' };
			if (finish === 'length') return { kind: 'invalid', reply: '', error: 'The answer was too long. Try asking for fewer changes at once.', raw, stats };

			const parsed = parseResponse(raw);
			if (!parsed.ok) return { kind: 'invalid', reply: '', error: parsed.error, raw, stats };
			const guarded = guard(parsed.response.actions, request, portfolio);
			const translated = translate(portfolio, guarded.actions, applyOp);
			if (!translated.ok) return { kind: 'invalid', reply: parsed.response.reply, error: translated.error, raw, stats };
			return { kind: 'ok', reply: parsed.response.reply, actions: guarded.actions, ops: translated.ops, dropped: guarded.dropped, raw, stats };
		} catch (e) {
			const error = friendly(e);
			if (/device was reset/i.test(error)) {
				this.#teardown();
				this.status = 'error';
				this.error = error;
			}
			return { kind: 'error', error };
		} finally {
			clearTimeout(timer);
			this.generating = null;
			this.busy = false;
		}
	}
}

export const assistant = new Assistant();
