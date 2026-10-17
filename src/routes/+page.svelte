<script lang="ts">
	import { goto } from '$app/navigation';
	import logo from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import Preview from '#lib/components/Preview.svelte';
	import StorageBanner from '#lib/components/StorageBanner.svelte';
	import { createProject } from '#lib/editor/project.ts';
	import { newId, starterPortfolio } from '#lib/portfolio/defaults.ts';
	import { TEMPLATE_IDS, type Portfolio, type TemplateId } from '#lib/portfolio/types.ts';
	import { TEMPLATES } from '#lib/render/index.ts';
	import { checkStorage, deleteProject, fromBackupFile, listProjects, saveProject, type ProjectSummary, type StorageStatus } from '#lib/storage/projects.ts';

	let projects = $state<ProjectSummary[]>([]);
	let storage = $state<StorageStatus | null>(null);
	let importError = $state('');
	let busy = $state(false);

	const previews = Object.fromEntries(TEMPLATE_IDS.map((t) => [t, starterPortfolio(t)])) as Record<TemplateId, Portfolio>;

	$effect(() => {
		checkStorage().then(async (s) => {
			storage = s;
			if (s.available) projects = await listProjects();
		});
	});

	async function start(name: string, portfolio: Portfolio) {
		busy = true;
		const state = createProject(newId('project'), name, portfolio);
		try {
			await saveProject(state);
		} catch {
			// Storage failed: the editor still works, the banner explains drafts won't persist.
		}
		await goto(`${resolve('/editor')}?id=${state.id}`);
	}

	async function onimport(e: Event & { currentTarget: HTMLInputElement }) {
		importError = '';
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		try {
			const { name, portfolio } = fromBackupFile(await file.text());
			await start(name, portfolio);
		} catch (err) {
			importError = (err as Error).message;
		}
	}

	async function remove(p: ProjectSummary) {
		if (!confirm(`Delete "${p.name}"? This removes the draft from this browser and can't be undone.`)) return;
		await deleteProject(p.id);
		projects = projects.filter((x) => x.id !== p.id);
	}

	const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="min-h-screen">
	<header class="border-b border-slate-200 bg-white">
		<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
			<img src={logo} alt="" class="size-8" />
			<span class="font-semibold text-slate-900">Portfolio Builder</span>
			<span class="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Everything stays on your device</span>
		</div>
	</header>

	<main class="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
		<section class="max-w-2xl space-y-3">
			<h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Build your portfolio, privately.</h1>
			<p class="text-lg text-slate-600">
				Pick a template, fill in your details and review every change before it's saved. Your drafts live in this browser. Nothing is uploaded until you choose to publish.
			</p>
		</section>

		{#if storage}<StorageBanner status={storage} />{/if}

		{#if projects.length}
			<section class="space-y-4" aria-labelledby="your-h">
				<h2 id="your-h" class="text-lg font-semibold text-slate-900">Your portfolios</h2>
				<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each projects as p (p.id)}
						<li class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
							<a class="min-w-0 flex-1" href="{resolve('/editor')}?id={p.id}">
								<span class="block truncate font-medium text-slate-900">{p.name}</span>
								<span class="block text-xs text-slate-500">{TEMPLATES[p.template].name} · edited {fmt.format(p.updatedAt)}</span>
							</a>
							<button type="button" class="text-xs text-slate-400 hover:text-red-600" onclick={() => remove(p)} aria-label="Delete {p.name}">Delete</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-4" aria-labelledby="tpl-h">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 id="tpl-h" class="text-lg font-semibold text-slate-900">Start from a template</h2>
				<label class="cursor-pointer text-sm font-medium text-indigo-700 hover:text-indigo-900">
					Import a backup (.json)
					<input type="file" accept="application/json,.json" class="sr-only" onchange={onimport} />
				</label>
			</div>
			{#if importError}<p class="text-sm text-red-600" role="alert">{importError}</p>{/if}
			<div class="grid gap-6 md:grid-cols-3">
				{#each TEMPLATE_IDS as id (id)}
					<article class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
						<div class="aspect-[4/3] border-b border-slate-100 bg-slate-50">
							<Preview portfolio={previews[id]} interactive={false} title="{TEMPLATES[id].name} template preview" />
						</div>
						<div class="space-y-3 p-4">
							<div>
								<h3 class="font-semibold text-slate-900">{TEMPLATES[id].name}</h3>
								<p class="text-sm text-slate-500">{TEMPLATES[id].description}</p>
							</div>
							<button
								type="button"
								disabled={busy}
								class="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
								onclick={() => start(`My ${TEMPLATES[id].name} portfolio`, starterPortfolio(id))}>Use {TEMPLATES[id].name}</button
							>
						</div>
					</article>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-slate-200 bg-white p-5">
			<h2 class="font-semibold text-slate-900">Coming next: chat with a local AI</h2>
			<p class="mt-1 text-sm text-slate-600">
				Describe a change like "switch to dark mode" and a model running on your device will propose it for review. Then publish to GitHub and Vercel in a few clicks.
			</p>
		</section>
	</main>
</div>
