// Facts about WebLLM's prebuilt models, copied (not imported) so pages that only
// show model status don't pull the ~6 MB runtime into the main bundle.
// models.spec.ts verifies these against @mlc-ai/web-llm (0.2.86).

const VRAM_MB: Record<string, number> = {
	'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC': 945,
	'Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC': 1060,
	'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC': 1630,
	'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC': 1889,
	'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC': 2505,
	'Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC': 2894,
	'Qwen3-1.7B-q4f16_1-MLC': 2037,
	'Qwen3-1.7B-q4f32_1-MLC': 2635,
	'Qwen3.5-2B-q4f16_1-MLC': 2245,
	'Qwen3.5-2B-q4f32_1-MLC': 2592
};

export function prebuiltVram(modelId: string): number {
	return VRAM_MB[modelId] ?? 0;
}

/** Hugging Face repo WebLLM downloads the weights from. */
export function modelUrl(modelId: string): string {
	return `https://huggingface.co/mlc-ai/${modelId}`;
}

/**
 * Same test as WebLLM's hasModelInCache (Cache API backend): the tensor index and
 * every shard it lists are present in the "webllm/model" cache.
 */
export async function isModelCached(modelId: string): Promise<boolean> {
	if (typeof caches === 'undefined') return false;
	const base = `${modelUrl(modelId)}/resolve/main/`;
	const cache = await caches.open('webllm/model');
	const index = await cache.match(new URL('tensor-cache.json', base).href);
	if (!index) return false;
	const { records } = (await index.json()) as { records: Array<{ dataPath: string }> };
	const hits = await Promise.all(records.map((r) => cache.match(new URL(r.dataPath, base).href)));
	return hits.every(Boolean);
}
