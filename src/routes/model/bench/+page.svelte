<script lang="ts">
	import { resolve } from '$app/paths';
	import { assistant } from '#lib/ai/assistant.svelte.ts';
	import { BENCH_CASES, benchAfter, benchStart, summarize, type BenchRow, type BenchSummary } from '#lib/ai/bench.ts';
	import { MODELS } from '#lib/ai/models.ts';
	import { download } from '#lib/export/export.ts';

	const a = assistant;
	$effect(() => void a.init());

	const RESULTS_KEY = 'portfolio-builder:bench';
	function readSaved(): Record<string, BenchSummary> {
		try {
			return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}');
		} catch {
			return {};
		}
	}

	let saved = $state<Record<string, BenchSummary>>(readSaved());
	let rows = $state<BenchRow[]>([]);
	let running = $state(false);
	let stopRequested = false;
	let expanded = $state<string | null>(null);

	const current = $derived(a.loadedModel ? saved[a.loadedModel] : undefined);
	const label = (id: string) => MODELS.find((m) => id.startsWith(m.base))?.label ?? id;
	const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '–');

	async function run() {
		if (!a.ready || running) return;
		running = true;
		stopRequested = false;
		rows = [];
		const model = a.loadedModel!;
		for (const c of BENCH_CASES) {
			if (stopRequested) break;
			const res = await a.generate(benchStart(), c.request);
			const row: BenchRow = { id: c.id, kind: c.kind, request: c.request, validJson: false, applied: false, correct: false, latencyS: 0, decodeTokensPerS: 0, reply: '' };
			if (res.kind === 'ok' || res.kind === 'invalid') {
				row.raw = res.raw;
				row.reply = res.reply;
				row.latencyS = res.stats?.latencyS ?? 0;
				row.decodeTokensPerS = res.stats?.decodeTokensPerS ?? 0;
			}
			if (res.kind === 'ok') {
				row.validJson = true;
				const after = benchAfter(res.ops);
				row.applied = !!after;
				row.correct = !!after && c.check(after, res.ops);
			} else if (res.kind === 'invalid') {
				row.validJson = !/JSON|object|without a name/.test(res.error);
				row.error = res.error;
			} else if (res.kind === 'error') row.error = res.error;
			else row.error = 'interrupted';
			rows.push(row);
		}
		running = false;
		if (rows.length === BENCH_CASES.length) {
			const device = [a.device?.gpuDescription, a.device?.f16 ? 'f16' : 'f32', navigator.userAgent.match(/(Chrome|Edg|Safari)\/[\d.]+/)?.[0]].filter(Boolean).join(' · ');
			saved = { ...saved, [model]: summarize(model, device, rows) };
			try {
				localStorage.setItem(RESULTS_KEY, JSON.stringify(saved));
			} catch {
				/* storage blocked: results stay on screen */
			}
		}
	}

	function stop() {
		stopRequested = true;
		a.interrupt();
	}

	const shownRows = $derived(rows.length ? rows : (current?.rows ?? []));
</script>

<svelte:head><title>Model benchmark · Portfolio Builder</title></svelte:head>

<div class="min-h-screen">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
			<a href={resolve('/model')} class="text-sm text-slate-600 hover:text-slate-900">← AI model</a>
			<span class="font-semibold text-slate-900">Benchmark</span>
		</div>
	</header>

	<main class="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
		<section class="space-y-2">
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Compare models on this device</h1>
			<p class="text-slate-600">
				Runs {BENCH_CASES.length} typical requests (themes, sections, projects, links, text) and checks whether each result is what was asked for. Load a different model on the AI model page and run
				again to compare.
			</p>
		</section>

		<section class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
			{#if a.ready}
				<span class="text-sm text-slate-700">Loaded: <strong>{label(a.loadedModel!)}</strong></span>
				{#if running}
					<span class="text-sm text-slate-500 tabular-nums">{rows.length}/{BENCH_CASES.length}</span>
					<button type="button" class="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm" onclick={stop}>Stop</button>
				{:else}
					<button type="button" class="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onclick={run}>
						{current ? 'Run again' : 'Run benchmark'}
					</button>
				{/if}
			{:else}
				<span class="text-sm text-slate-600">Load a model first.</span>
				<a href={resolve('/model')} class="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Go to AI model</a>
			{/if}
		</section>

		{#if Object.keys(saved).length}
			<section class="space-y-3" aria-labelledby="cmp-h">
				<div class="flex items-center justify-between">
					<h2 id="cmp-h" class="font-semibold text-slate-900">Results</h2>
					<button type="button" class="text-sm text-indigo-700 hover:underline" onclick={() => download(JSON.stringify(saved, null, 2), 'model-benchmark.json', 'application/json')}>
						Download results
					</button>
				</div>
				<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
					<table class="w-full text-sm">
						<thead class="bg-slate-50 text-left text-xs text-slate-500 uppercase">
							<tr>
								<th class="px-3 py-2">Model</th>
								<th class="px-3 py-2">Correct</th>
								<th class="px-3 py-2">Applied cleanly</th>
								<th class="px-3 py-2">Valid JSON</th>
								<th class="px-3 py-2">Median time</th>
								<th class="px-3 py-2">Speed</th>
							</tr>
						</thead>
						<tbody>
							{#each Object.values(saved).sort((x, y) => y.correct - x.correct) as s (s.model)}
								<tr class="border-t border-slate-100">
									<td class="px-3 py-2 font-medium text-slate-900">{label(s.model)}<span class="block text-xs font-normal text-slate-400">{s.device}</span></td>
									<td class="px-3 py-2 font-semibold tabular-nums">{pct(s.correct, s.cases)}</td>
									<td class="px-3 py-2 tabular-nums">{pct(s.applied, s.cases)}</td>
									<td class="px-3 py-2 tabular-nums">{pct(s.validJson, s.cases)}</td>
									<td class="px-3 py-2 tabular-nums">{s.medianLatencyS.toFixed(1)} s</td>
									<td class="px-3 py-2 tabular-nums">{s.avgDecodeTokensPerS.toFixed(0)} tok/s</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		{#if shownRows.length}
			<section class="space-y-3" aria-labelledby="rows-h">
				<h2 id="rows-h" class="font-semibold text-slate-900">Cases {running ? '(running…)' : a.loadedModel ? `— ${label(a.loadedModel)}` : ''}</h2>
				<ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
					{#each shownRows as r (r.id)}
						<li class="px-3 py-2 text-sm">
							<button type="button" class="flex w-full items-center gap-3 text-left" onclick={() => (expanded = expanded === r.id ? null : r.id)} aria-expanded={expanded === r.id}>
								<span aria-label={r.correct ? 'correct' : 'wrong'}>{r.correct ? '✅' : r.applied ? '⚠️' : '❌'}</span>
								<span class="min-w-0 flex-1 truncate text-slate-800">{r.request}</span>
								<span class="shrink-0 text-xs text-slate-400 tabular-nums">{r.latencyS.toFixed(1)} s</span>
							</button>
							{#if expanded === r.id}
								<div class="mt-2 space-y-1 pl-8 text-xs">
									{#if r.reply}<p class="text-slate-600">Reply: {r.reply}</p>{/if}
									{#if r.error}<p class="text-red-700">Error: {r.error}</p>{/if}
									{#if r.raw}<pre class="overflow-x-auto rounded bg-slate-50 p-2 whitespace-pre-wrap text-slate-700">{r.raw}</pre>{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
				<p class="text-xs text-slate-500">✅ correct · ⚠️ valid change but not what was asked · ❌ failed or rejected (nothing would have changed)</p>
			</section>
		{/if}
	</main>
</div>
