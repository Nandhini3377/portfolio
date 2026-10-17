// Candidate models (all ≤ 3B parameters). The user picks one on the model page;
// nothing else in the app depends on which. Ids are WebLLM prebuilt model ids
// without the quantization suffix, which is chosen per device (see variantFor).

export interface ModelChoice {
	/** WebLLM id prefix, e.g. "Qwen2.5-Coder-1.5B-Instruct". */
	base: string;
	label: string;
	params: string;
	/** Approximate download in GB (4-bit weights). */
	downloadGB: number;
	note: string;
	recommended?: boolean;
	/** Qwen3-family models think aloud unless told not to. */
	thinking?: boolean;
}

export const MODELS: ModelChoice[] = [
	{
		base: 'Qwen2.5-Coder-1.5B-Instruct',
		label: 'Qwen2.5 Coder 1.5B',
		params: '1.5B',
		downloadGB: 0.9,
		note: 'Best balance of quality and speed. Good at JSON. Runs on most 8 GB laptops.',
		recommended: true
	},
	{
		base: 'Qwen2.5-Coder-3B-Instruct',
		label: 'Qwen2.5 Coder 3B',
		params: '3B',
		downloadGB: 1.7,
		note: 'Most accurate option, about half the speed. Needs a stronger GPU.'
	},
	{
		base: 'Qwen3.5-2B',
		label: 'Qwen3.5 2B',
		params: '2B',
		downloadGB: 1.3,
		note: 'Newer general model; strong instruction following.',
		thinking: true
	},
	{
		base: 'Qwen3-1.7B',
		label: 'Qwen3 1.7B',
		params: '1.7B',
		downloadGB: 1.0,
		note: 'General model, good at following instructions.',
		thinking: true
	},
	{
		base: 'Qwen2.5-Coder-0.5B-Instruct',
		label: 'Qwen2.5 Coder 0.5B',
		params: '0.5B',
		downloadGB: 0.3,
		note: 'Tiny and fast for weak devices. Makes more mistakes.'
	}
];

export const DEFAULT_MODEL = MODELS.find((m) => m.recommended)!.base;

/** f16 weights are smaller and faster but need the WebGPU `shader-f16` feature. */
export function variantFor(base: string, f16: boolean): string {
	return `${base}-${f16 ? 'q4f16_1' : 'q4f32_1'}-MLC`;
}

export function modelByBase(base: string): ModelChoice | undefined {
	return MODELS.find((m) => m.base === base);
}
