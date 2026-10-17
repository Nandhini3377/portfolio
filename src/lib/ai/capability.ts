// What this device can do. Browsers expose very little about hardware, so this
// reports what we can know and stays honest about what we can't.

export interface DeviceReport {
	webgpu: boolean;
	f16: boolean;
	/** Largest single GPU buffer, MB. */
	maxBufferMB?: number;
	/** navigator.deviceMemory: rounded and capped at 8 by the browser (Chromium only). */
	deviceMemoryGB?: number;
	freeStorageGB?: number;
	gpuDescription?: string;
	problem?: string;
}

interface GPUAdapterLike {
	features: { has(name: string): boolean };
	limits: { maxBufferSize: number };
	info?: { vendor?: string; architecture?: string; description?: string };
}

export async function checkDevice(): Promise<DeviceReport> {
	const nav = navigator as Navigator & { gpu?: { requestAdapter(o?: object): Promise<GPUAdapterLike | null> }; deviceMemory?: number };
	const report: DeviceReport = { webgpu: false, f16: false, deviceMemoryGB: nav.deviceMemory };

	try {
		const est = await navigator.storage?.estimate?.();
		if (est?.quota !== undefined) report.freeStorageGB = (est.quota - (est.usage ?? 0)) / 1e9;
	} catch {
		/* unavailable */
	}

	if (!nav.gpu) {
		report.problem = 'This browser does not support WebGPU. Use a recent Chrome or Edge on desktop (Safari 26+ may also work).';
		return report;
	}
	try {
		const adapter = await nav.gpu.requestAdapter({ powerPreference: 'high-performance' });
		if (!adapter) {
			report.problem = 'WebGPU is available but no compatible graphics adapter was found. Try updating your graphics drivers or enabling hardware acceleration.';
			return report;
		}
		report.webgpu = true;
		report.f16 = adapter.features.has('shader-f16');
		report.maxBufferMB = Math.round(adapter.limits.maxBufferSize / 2 ** 20);
		const info = adapter.info;
		report.gpuDescription = [info?.vendor, info?.architecture || info?.description].filter(Boolean).join(' ') || undefined;
	} catch (e) {
		report.problem = `Could not start WebGPU: ${(e as Error).message}`;
	}
	return report;
}

/** Plain-language warnings for running `downloadGB` / `vramMB` on this device. */
export function fitWarnings(report: DeviceReport, downloadGB: number, vramMB: number): string[] {
	const warnings: string[] = [];
	if (report.freeStorageGB !== undefined && report.freeStorageGB < downloadGB * 1.2)
		warnings.push(`Only ${report.freeStorageGB.toFixed(1)} GB of browser storage is free; this model needs about ${downloadGB} GB.`);
	if (report.deviceMemoryGB !== undefined && report.deviceMemoryGB < 8 && vramMB > 2000)
		warnings.push(`This device reports ${report.deviceMemoryGB} GB of memory. This model may be slow or fail to load; try a smaller one.`);
	if (report.maxBufferMB !== undefined && report.maxBufferMB < 256) warnings.push('Your GPU allows only small buffers, which may prevent loading.');
	return warnings;
}
