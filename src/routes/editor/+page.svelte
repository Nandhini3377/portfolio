<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ChatPanel from '#lib/components/ChatPanel.svelte';
	import ContentPanel from '#lib/components/ContentPanel.svelte';
	import DesignPanel from '#lib/components/DesignPanel.svelte';
	import IconButton from '#lib/components/IconButton.svelte';
	import Preview from '#lib/components/Preview.svelte';
	import ReviewPanel from '#lib/components/ReviewPanel.svelte';
	import StorageBanner from '#lib/components/StorageBanner.svelte';
	import { Editor } from '#lib/editor/editor.svelte.ts';
	import { download, exportStatic, exportSvelteKit } from '#lib/export/export.ts';
	import { slug } from '#lib/render/util.ts';
	import { checkStorage, loadProject, toBackupFile, type StorageStatus } from '#lib/storage/projects.ts';

	let editor = $state<Editor | null>(null);
	let status = $state<'loading' | 'ready' | 'missing'>('loading');
	let notice = $state('');
	let storage = $state<StorageStatus | null>(null);

	let tab = $state<'chat' | 'content' | 'design'>('chat');
	let device = $state<'desktop' | 'mobile'>('desktop');
	let showCurrent = $state(false);
	let reviewOpen = $state(false);
	let exportOpen = $state(false);
	let mobileView = $state<'edit' | 'preview'>('edit');

	$effect(() => {
		const id = page.url.searchParams.get('id');
		checkStorage().then((s) => (storage = s));
		if (!id) {
			status = 'missing';
			return;
		}
		loadProject(id)
			.then((loaded) => {
				if (!loaded) return void (status = 'missing');
				editor = new Editor(loaded.state);
				if (loaded.repaired) notice = 'Some unsaved changes could not be recovered and were removed. Your approved portfolio is intact.';
				status = 'ready';
			})
			.catch(() => (status = 'missing'));
	});

	const shown = $derived(editor && (showCurrent ? editor.state.committed : editor.proposed));

	function onkeydown(e: KeyboardEvent) {
		if (!editor || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
		const el = document.activeElement;
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return; // native text undo
		e.preventDefault();
		if (e.shiftKey) editor.redo();
		else editor.undo();
	}

	function backup() {
		if (!editor) return;
		download(toBackupFile(editor.state), `${slug(editor.state.name)}.json`, 'application/json');
		exportOpen = false;
	}
</script>

<svelte:window {onkeydown} onbeforeunload={() => void editor?.flush()} />
<svelte:head><title>{editor ? `${editor.state.name} · Portfolio Builder` : 'Editor · Portfolio Builder'}</title></svelte:head>

{#if status === 'loading'}
	<div class="grid min-h-screen place-items-center text-sm text-slate-500">Loading your portfolio…</div>
{:else if status === 'missing' || !editor}
	<div class="grid min-h-screen place-items-center p-6">
		<div class="max-w-sm space-y-3 text-center">
			<h1 class="text-lg font-semibold text-slate-900">Portfolio not found</h1>
			<p class="text-sm text-slate-600">It may have been deleted, or your browser cleared its storage. If you have a backup file you can import it from the start page.</p>
			<a href={resolve('/')} class="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Go to start page</a>
		</div>
	</div>
{:else}
	<div class="flex h-dvh flex-col">
		<!-- Top bar -->
		<header class="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
			<a href={resolve('/')} class="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100" aria-label="Back to start page">←</a>
			<input
				class="min-w-0 flex-1 rounded-md border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 hover:border-slate-200 focus:border-indigo-500 sm:max-w-xs"
				value={editor.state.name}
				aria-label="Portfolio name"
				onchange={(e) => editor?.rename(e.currentTarget.value)}
			/>
			<span class="hidden text-xs text-slate-400 sm:inline" aria-live="polite">
				{editor.saveStatus === 'saving' ? 'Saving…' : editor.saveStatus === 'error' ? '' : 'Saved on this device'}
			</span>
			{#if editor.saveStatus === 'error'}<span class="text-xs text-red-600" role="alert">Not saved: {editor.saveError}</span>{/if}
			<div class="ml-auto flex items-center gap-1">
				<IconButton label="Undo (⌘Z)" icon="undo" disabled={!editor.canUndo} onclick={() => editor?.undo()} />
				<IconButton label="Redo (⇧⌘Z)" icon="redo" disabled={!editor.canRedo} onclick={() => editor?.redo()} />
				<div class="relative">
					<button
						type="button"
						class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						aria-expanded={exportOpen}
						aria-haspopup="menu"
						onclick={() => (exportOpen = !exportOpen)}>Export</button
					>
					{#if exportOpen}
						<div class="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg" role="menu">
							<p class="px-2.5 pt-1.5 pb-2 text-xs text-slate-500">Exports include approved changes only.</p>
							<button role="menuitem" type="button" class="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-slate-50" onclick={() => (exportStatic(editor!.state.committed), (exportOpen = false))}>
								<span class="block text-sm font-medium text-slate-900">Static website (.zip)</span>
								<span class="block text-xs text-slate-500">Plain HTML/CSS, works on any host</span>
							</button>
							<button role="menuitem" type="button" class="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-slate-50" onclick={() => (exportSvelteKit(editor!.state.committed), (exportOpen = false))}>
								<span class="block text-sm font-medium text-slate-900">SvelteKit project (.zip)</span>
								<span class="block text-xs text-slate-500">Source project, deploys to Vercel as-is</span>
							</button>
							<button role="menuitem" type="button" class="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-slate-50" onclick={backup}>
								<span class="block text-sm font-medium text-slate-900">Backup file (.json)</span>
								<span class="block text-xs text-slate-500">Re-import later from the start page</span>
							</button>
						</div>
					{/if}
				</div>
			</div>
		</header>

		{#if notice || (storage && !storage.available)}
			<div class="space-y-2 border-b border-slate-200 bg-white px-3 py-2">
				{#if notice}
					<div class="flex items-start justify-between gap-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
						<span>{notice}</span><button type="button" class="text-xs" onclick={() => (notice = '')}>Dismiss</button>
					</div>
				{/if}
				{#if storage && !storage.available}<StorageBanner status={storage} />{/if}
			</div>
		{/if}

		<!-- Mobile view switch -->
		<div class="flex gap-1 border-b border-slate-200 bg-white p-1.5 lg:hidden">
			{#each ['edit', 'preview'] as const as v (v)}
				<button
					type="button"
					class="flex-1 rounded-md py-1.5 text-sm font-medium {mobileView === v ? 'bg-slate-900 text-white' : 'text-slate-600'}"
					aria-pressed={mobileView === v}
					onclick={() => (mobileView = v)}>{v === 'edit' ? 'Edit' : 'Preview'}</button
				>
			{/each}
		</div>

		<div class="flex min-h-0 flex-1">
			<!-- Editing panel -->
			<aside class="w-full shrink-0 flex-col border-r border-slate-200 bg-white lg:flex lg:w-[380px] {mobileView === 'edit' ? 'flex' : 'hidden'}">
				<div class="flex gap-1 border-b border-slate-200 p-2" role="tablist">
					{#each ['chat', 'content', 'design'] as const as t (t)}
						<button
							type="button"
							role="tab"
							aria-selected={tab === t}
							class="flex-1 rounded-md py-1.5 text-sm font-medium {tab === t ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}"
							onclick={() => (tab = t)}>{t === 'chat' ? 'Chat' : t === 'content' ? 'Content' : 'Design'}</button
						>
					{/each}
				</div>
				<div class="min-h-0 flex-1 p-4 {tab === 'chat' ? 'flex flex-col' : 'overflow-y-auto'}" role="tabpanel">
					{#if editor.error && !editor.error.key}
						<p class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{editor.error.message}</p>
					{/if}
					{#if tab === 'chat'}
						<ChatPanel {editor} onreview={() => ((reviewOpen = true), (mobileView = 'preview'))} />
					{:else if tab === 'content'}<ContentPanel {editor} />{:else}<DesignPanel {editor} />{/if}
				</div>
			</aside>

			<!-- Preview -->
			<section class="relative min-w-0 flex-1 flex-col lg:flex {mobileView === 'preview' ? 'flex' : 'hidden'}" aria-label="Preview">
				<div class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
					<div class="flex gap-1 rounded-lg bg-slate-100 p-1">
						{#each ['desktop', 'mobile'] as const as d (d)}
							<button
								type="button"
								class="rounded-md px-2.5 py-1 text-xs font-medium {device === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}"
								aria-pressed={device === d}
								onclick={() => (device = d)}>{d === 'desktop' ? 'Desktop' : 'Mobile'}</button
							>
						{/each}
					</div>
					{#if editor.hasPending}
						<div class="flex gap-1 rounded-lg bg-slate-100 p-1">
							<button type="button" class="rounded-md px-2.5 py-1 text-xs font-medium {!showCurrent ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}" aria-pressed={!showCurrent} onclick={() => (showCurrent = false)}>With changes</button>
							<button type="button" class="rounded-md px-2.5 py-1 text-xs font-medium {showCurrent ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}" aria-pressed={showCurrent} onclick={() => (showCurrent = true)}>Approved</button>
						</div>
					{/if}
				</div>

				<div class="min-h-0 flex-1 p-3 sm:p-5">
					<div class="mx-auto h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" style:max-width={device === 'mobile' ? '390px' : '100%'}>
						{#if shown}
							{#key device}
								<Preview portfolio={shown} deviceWidth={device === 'mobile' ? 390 : 1280} />
							{/key}
						{/if}
					</div>
				</div>

				{#if editor.hasPending}
					<div class="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg sm:inset-x-auto sm:right-5 sm:bottom-5 sm:left-auto">
						<span class="text-sm">
							<span class="font-semibold">{editor.state.pending.length}</span>
							{editor.state.pending.length === 1 ? 'change' : 'changes'} waiting for review
						</span>
						<button type="button" class="ml-auto rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:text-white" onclick={() => editor?.reject()}>Reject</button>
						<button type="button" class="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-slate-100" onclick={() => (reviewOpen = true)}>Review</button>
					</div>
				{/if}

				{#if reviewOpen}
					<div class="absolute inset-y-0 right-0 z-10 w-full max-w-sm border-l border-slate-200 bg-white shadow-xl">
						<ReviewPanel {editor} onclose={() => (reviewOpen = false)} />
					</div>
				{/if}
			</section>
		</div>
	</div>
{/if}
