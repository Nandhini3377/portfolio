<script lang="ts">
	import type { Editor } from '#lib/editor/editor.svelte.ts';

	let { editor, onclose }: { editor: Editor; onclose: () => void } = $props();

	const KIND = {
		added: { label: 'Added', cls: 'bg-emerald-100 text-emerald-800' },
		removed: { label: 'Removed', cls: 'bg-red-100 text-red-800' },
		changed: { label: 'Changed', cls: 'bg-amber-100 text-amber-800' },
		moved: { label: 'Moved', cls: 'bg-sky-100 text-sky-800' }
	};
</script>

<div class="flex h-full flex-col">
	<div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
		<h2 class="text-sm font-semibold text-slate-900">Review changes</h2>
		<button type="button" class="text-sm text-slate-500 hover:text-slate-900" onclick={onclose}>Close</button>
	</div>

	<div class="flex-1 space-y-5 overflow-y-auto px-4 py-4">
		{#if !editor.hasPending}
			<p class="text-sm text-slate-500">No pending changes. Edits you make appear here for approval before they're saved to your portfolio.</p>
		{:else}
			<section class="space-y-2">
				<h3 class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Steps ({editor.state.pending.length})</h3>
				<ol class="space-y-1">
					{#each editor.pendingSummary as label, i (i)}
						<li class="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-800">
							<span class="min-w-0 truncate"><span class="text-slate-400 tabular-nums">{i + 1}.</span> {label}</span>
							<button type="button" class="shrink-0 text-xs text-slate-500 hover:text-red-600" onclick={() => editor.unstage(i)} aria-label="Undo step {i + 1}: {label}">Remove</button>
						</li>
					{/each}
				</ol>
				{#if editor.errorFor('review')}<p class="text-xs text-red-600" role="alert">{editor.errorFor('review')}</p>{/if}
			</section>

			<section class="space-y-2">
				<h3 class="text-xs font-semibold tracking-wide text-slate-500 uppercase">What changes</h3>
				{#if editor.diff.length === 0}
					<p class="text-sm text-slate-500">These steps cancel each other out.</p>
				{/if}
				<ul class="space-y-2">
					{#each editor.diff as d, i (i)}
						<li class="rounded-lg border border-slate-200 p-2.5 text-sm">
							<div class="flex items-center gap-2">
								<span class="rounded px-1.5 py-0.5 text-[10px] font-semibold {KIND[d.kind].cls}">{KIND[d.kind].label}</span>
								<span class="min-w-0 truncate font-medium text-slate-800">{d.where}</span>
							</div>
							{#if d.kind === 'changed'}
								<div class="mt-2 grid gap-1 text-xs">
									<p class="rounded bg-red-50 px-2 py-1 break-words text-red-900 line-through decoration-red-300">{d.before}</p>
									<p class="rounded bg-emerald-50 px-2 py-1 break-words text-emerald-900">{d.after}</p>
								</div>
							{:else if d.kind === 'moved' && d.after}
								<p class="mt-1 text-xs text-slate-500">{d.after}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	{#if editor.hasPending}
		<div class="flex gap-2 border-t border-slate-200 p-3">
			<button type="button" class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onclick={() => editor.reject()}>Reject all</button>
			<button type="button" class="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onclick={() => {
					editor.approve();
					if (!editor.hasPending) onclose();
				}}>Approve</button>
		</div>
	{/if}
</div>
