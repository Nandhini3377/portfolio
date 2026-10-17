import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { describe, expect, it } from 'vitest';
import { MODELS, variantFor } from './models.ts';
import { modelUrl, prebuiltVram } from './prebuilt.ts';

describe('model registry', () => {
	const prebuilt = new Map(prebuiltAppConfig.model_list.map((m) => [m.model_id, m]));

	it('every candidate exists in WebLLM in both f16 and f32 variants', () => {
		for (const m of MODELS) for (const f16 of [true, false]) expect(prebuilt.has(variantFor(m.base, f16)), variantFor(m.base, f16)).toBe(true);
	});

	it('copied VRAM figures match WebLLM', () => {
		for (const m of MODELS)
			for (const f16 of [true, false]) {
				const id = variantFor(m.base, f16);
				expect(Math.abs(prebuiltVram(id) - (prebuilt.get(id)!.vram_required_MB ?? 0)), id).toBeLessThan(1);
			}
	});

	it('copied download URLs match WebLLM', () => {
		for (const m of MODELS)
			for (const f16 of [true, false]) {
				const id = variantFor(m.base, f16);
				expect(modelUrl(id), id).toBe(prebuilt.get(id)!.model.replace(/\/$/, ''));
			}
	});

	it('stays within the 3B parameter limit', () => {
		for (const m of MODELS) expect(parseFloat(m.params), m.base).toBeLessThanOrEqual(3);
	});
});
