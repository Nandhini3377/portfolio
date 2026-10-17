<script lang="ts">
	import type { Editor } from '#lib/editor/editor.svelte.ts';
	import { FONTS, LAYOUTS, TEMPLATE_IDS, type Font, type Layout } from '#lib/portfolio/types.ts';
	import { TEMPLATES } from '#lib/render/index.ts';

	let { editor }: { editor: Editor } = $props();
	const p = $derived(editor.proposed);

	const SWATCHES = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#c2410c', '#ca8a04', '#16a34a', '#0d9488', '#a3e635', '#0f172a'];
	const LAYOUT_LABELS: Record<Layout, string> = { stacked: 'Stacked', split: 'Side by side', centered: 'Centered' };
	const FONT_LABELS: Record<Font, string> = { sans: 'Sans', serif: 'Serif', mono: 'Mono' };

	const seg = (active: boolean) =>
		`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`;
</script>

<div class="space-y-6">
	<fieldset class="space-y-2">
		<legend class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Template</legend>
		<div class="grid gap-2">
			{#each TEMPLATE_IDS as id (id)}
				<button
					type="button"
					class="rounded-lg border px-3 py-2.5 text-left transition {p.template === id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-slate-300'}"
					aria-pressed={p.template === id}
					onclick={() => editor.edit({ op: 'setTemplate', template: id })}
				>
					<span class="block text-sm font-semibold text-slate-900">{TEMPLATES[id].name}</span>
					<span class="block text-xs text-slate-500">{TEMPLATES[id].description}</span>
				</button>
			{/each}
		</div>
	</fieldset>

	<fieldset class="space-y-2">
		<legend class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Header layout</legend>
		<div class="flex gap-1 rounded-lg bg-slate-100 p-1">
			{#each LAYOUTS as l (l)}
				<button type="button" class={seg(p.layout === l)} aria-pressed={p.layout === l} onclick={() => editor.edit({ op: 'setLayout', layout: l })}>{LAYOUT_LABELS[l]}</button>
			{/each}
		</div>
	</fieldset>

	<fieldset class="space-y-2">
		<legend class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Mode</legend>
		<div class="flex gap-1 rounded-lg bg-slate-100 p-1">
			<button type="button" class={seg(p.theme.mode === 'light')} aria-pressed={p.theme.mode === 'light'} onclick={() => editor.edit({ op: 'setTheme', mode: 'light' })}>Light</button>
			<button type="button" class={seg(p.theme.mode === 'dark')} aria-pressed={p.theme.mode === 'dark'} onclick={() => editor.edit({ op: 'setTheme', mode: 'dark' })}>Dark</button>
		</div>
	</fieldset>

	<fieldset class="space-y-2">
		<legend class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Accent colour</legend>
		<div class="flex flex-wrap items-center gap-2">
			{#each SWATCHES as c (c)}
				<button
					type="button"
					class="size-7 rounded-full ring-offset-2 transition {p.theme.accent.toLowerCase() === c ? 'ring-2 ring-slate-900' : 'hover:scale-110'}"
					style:background={c}
					aria-label="Accent {c}"
					aria-pressed={p.theme.accent.toLowerCase() === c}
					onclick={() => editor.edit({ op: 'setTheme', accent: c })}
				></button>
			{/each}
			<label class="relative size-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-slate-400" title="Custom colour">
				<span class="sr-only">Custom accent colour</span>
				<input type="color" class="absolute inset-0 size-full cursor-pointer opacity-0" value={p.theme.accent} onchange={(e) => editor.edit({ op: 'setTheme', accent: e.currentTarget.value })} />
				<span class="grid size-full place-items-center text-xs text-slate-500" aria-hidden="true">+</span>
			</label>
		</div>
	</fieldset>

	<fieldset class="space-y-2">
		<legend class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Font</legend>
		<div class="flex gap-1 rounded-lg bg-slate-100 p-1">
			{#each FONTS as f (f)}
				<button type="button" class={seg(p.theme.font === f)} aria-pressed={p.theme.font === f} onclick={() => editor.edit({ op: 'setTheme', font: f })}>{FONT_LABELS[f]}</button>
			{/each}
		</div>
	</fieldset>
</div>
