<script lang="ts">
	import { resolve } from '$app/paths';
	import { assistant } from '#lib/ai/assistant.svelte.ts';
	import { fitWarnings } from '#lib/ai/capability.ts';
	import { MODELS } from '#lib/ai/models.ts';
	import { prebuiltVram } from '#lib/ai/prebuilt.ts';

	$effect(() => void assistant.init());

	const a = assistant;
	const selected = $derived(MODELS.find((m) => m.base === a.selected)!);
	const warnings = $derived(a.device ? fitWarnings(a.device, selected.downloadGB, prebuiltVram(a.modelId())) : []);
	const loadedHere = $derived(a.loadedModel === a.modelId());
	const working = $derived(a.status === 'downloading' || a.status === 'loading');

	async function remove(base: string, label: string) {
		if (!confirm(`Remove ${label} from this device? You'll need to download it again to use AI editing.`)) return;
		await a.remove(base);
	}
</script>

<svelte:head><title>AI model · Portfolio Builder</title></svelte:head>

<div class="min-h-screen">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
			<a href={resolve('/')} class="text-sm text-slate-600 hover:text-slate-900">← Back</a>
			<span class="font-semibold text-slate-900">AI model</span>
		</div>
	</header>

	<main class="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
		<section class="space-y-2">
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Your private AI assistant</h1>
			<p class="text-slate-600">
				The assistant runs entirely on this device. After a one-time download it works offline, and your requests and portfolio are never sent to an AI service.
			</p>
		</section>

		<!-- Device check -->
		<section class="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="dev-h">
			<h2 id="dev-h" class="font-semibold text-slate-900">This device</h2>
			{#if a.status === 'checking' || !a.device}
				<p class="mt-2 text-sm text-slate-500">Checking what your device supports…</p>
			{:else}
				<ul class="mt-3 space-y-1.5 text-sm">
					<li class="flex gap-2">
						<span aria-hidden="true">{a.device.webgpu ? '✅' : '❌'}</span>
						<span>WebGPU {a.device.webgpu ? `available${a.device.gpuDescription ? ` (${a.device.gpuDescription})` : ''}` : 'not available'}</span>
					</li>
					{#if a.device.webgpu}
						<li class="flex gap-2">
							<span aria-hidden="true">{a.device.f16 ? '✅' : 'ℹ️'}</span>
							<span>{a.device.f16 ? 'Fast 16-bit maths supported' : 'Using 32-bit maths (a little slower and larger)'}</span>
						</li>
					{/if}
					{#if a.device.deviceMemoryGB}
						<li class="flex gap-2"><span aria-hidden="true">ℹ️</span><span>Memory reported by browser: {a.device.deviceMemoryGB >= 8 ? '8 GB or more' : `${a.device.deviceMemoryGB} GB`}</span></li>
					{/if}
					{#if a.device.freeStorageGB !== undefined}
						<li class="flex gap-2"><span aria-hidden="true">ℹ️</span><span>Browser storage available: {a.device.freeStorageGB.toFixed(1)} GB</span></li>
					{/if}
				</ul>
				{#if a.device.problem}
					<p class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{a.device.problem} You can still edit your portfolio by hand.</p>
				{/if}
			{/if}
		</section>

		{#if a.status !== 'unsupported' && a.status !== 'checking'}
			<!-- Model choice -->
			<section class="space-y-3" aria-labelledby="models-h">
				<h2 id="models-h" class="font-semibold text-slate-900">Choose a model</h2>
				<div class="space-y-2" role="radiogroup" aria-labelledby="models-h">
					{#each MODELS as m (m.base)}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition {a.selected === m.base
								? 'border-indigo-500 ring-1 ring-indigo-500'
								: 'border-slate-200 hover:border-slate-300'} {a.busy ? 'cursor-not-allowed opacity-70' : ''}"
						>
							<input type="radio" name="model" class="mt-1 text-indigo-600" checked={a.selected === m.base} disabled={a.busy} onchange={() => a.select(m.base)} />
							<span class="min-w-0 flex-1">
								<span class="flex flex-wrap items-center gap-2">
									<span class="font-medium text-slate-900">{m.label}</span>
									{#if m.recommended}<span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Recommended</span>{/if}
									{#if a.cached[m.base]}<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">On this device</span>{/if}
									{#if a.loadedModel === a.modelId(m.base)}<span class="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">Loaded</span>{/if}
								</span>
								<span class="mt-0.5 block text-sm text-slate-600">{m.note}</span>
								<span class="mt-1 block text-xs text-slate-500">{m.params} parameters · ≈{m.downloadGB} GB download</span>
							</span>
							{#if a.cached[m.base]}
								<button
									type="button"
									class="shrink-0 text-xs text-slate-500 hover:text-red-600 disabled:opacity-40"
									disabled={a.busy}
									onclick={(e) => {
										e.preventDefault();
										remove(m.base, m.label);
									}}>Remove</button
								>
							{/if}
						</label>
					{/each}
				</div>
			</section>

			<!-- Action -->
			<section class="space-y-3 rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
				{#each warnings as w (w)}
					<p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{w}</p>
				{/each}

				{#if working}
					<div class="space-y-2">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium text-slate-900">{a.status === 'downloading' ? `Downloading ${selected.label}` : `Loading ${selected.label}`}</span>
							<span class="text-slate-500 tabular-nums">{Math.round(a.progress * 100)}%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(a.progress * 100)}>
							<div class="h-full rounded-full bg-indigo-600 transition-[width]" style:width="{a.progress * 100}%"></div>
						</div>
						<p class="truncate text-xs text-slate-500" title={a.progressText}>{a.progressText}</p>
						<p class="text-xs text-slate-500">You can keep editing in another tab. Downloaded parts are kept if you stop.</p>
						<button type="button" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" onclick={() => a.cancel()}>Stop</button>
					</div>
				{:else if a.status === 'error'}
					<p class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{a.error}</p>
					<button type="button" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onclick={() => a.load()}>Retry</button>
				{:else if loadedHere}
					<p class="text-sm text-emerald-700">✓ {selected.label} is ready. Open a portfolio and use the Chat tab.</p>
					<div class="flex flex-wrap gap-2">
						<a href={resolve('/')} class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Go to my portfolios</a>
						<a href={resolve('/model/bench')} class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Run benchmark</a>
					</div>
				{:else}
					<button type="button" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onclick={() => a.load()}>
						{a.cached[a.selected] ? `Load ${selected.label}` : `Download ${selected.label} (≈${selected.downloadGB} GB)`}
					</button>
					{#if !a.cached[a.selected]}
						<p class="text-xs text-slate-500">Downloaded once from Hugging Face, then stored in this browser. Use Wi-Fi if your data is limited.</p>
					{/if}
				{/if}
			</section>
		{/if}
	</main>
</div>
