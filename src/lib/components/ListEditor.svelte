<script lang="ts" module>
	export interface FieldSpec {
		key: string;
		label: string;
		kind: 'text' | 'long' | 'url' | 'tags';
		placeholder?: string;
	}
</script>

<script lang="ts">
	import Field from './Field.svelte';
	import IconButton from './IconButton.svelte';
	import type { Editor } from '#lib/editor/editor.svelte.ts';
	import type { ItemValue } from '#lib/editor/ops.ts';

	interface Props {
		editor: Editor;
		sectionId: string;
		items: Array<{ id: string } & Record<string, unknown>>;
		fields: FieldSpec[];
		titleKey: string;
		addLabel: string;
		newItem: () => { id: string } & Record<string, ItemValue>;
	}

	let { editor, sectionId, items, fields, titleKey, addLabel, newItem }: Props = $props();
	let open = $state<string | null>(null);

	function add() {
		const item = newItem();
		if (!editor.edit({ op: 'addItem', sectionId, item })) open = item.id;
	}

	const toTags = (v: string) =>
		v
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
</script>

<div class="space-y-2">
	{#each items as item, i (item.id)}
		<div class="rounded-lg border border-slate-200 bg-white">
			<div class="flex items-center gap-1 pr-1">
				<button
					type="button"
					class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800"
					aria-expanded={open === item.id}
					onclick={() => (open = open === item.id ? null : item.id)}
				>
					<svg class="size-3.5 shrink-0 text-slate-400 transition-transform {open === item.id ? 'rotate-90' : ''}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
						><path d="M7 4l6 6-6 6V4z" /></svg
					>
					<span class="truncate">{String(item[titleKey] || 'Untitled')}</span>
				</button>
				<IconButton label="Move up" icon="up" disabled={i === 0} onclick={() => editor.edit({ op: 'moveItem', sectionId, itemId: item.id, toIndex: i - 1 })} />
				<IconButton label="Move down" icon="down" disabled={i === items.length - 1} onclick={() => editor.edit({ op: 'moveItem', sectionId, itemId: item.id, toIndex: i + 1 })} />
				<IconButton label="Remove" icon="trash" onclick={() => editor.edit({ op: 'removeItem', sectionId, itemId: item.id })} />
			</div>
			{#if open === item.id}
				<div class="space-y-3 border-t border-slate-100 px-3 py-3">
					{#each fields as f (f.key)}
						{#if f.kind === 'tags'}
							<Field
								label={f.label}
								value={(item[f.key] as string[]).join(', ')}
								commit="blur"
								hint="Separate with commas"
								placeholder={f.placeholder}
								onchange={(v) => editor.edit({ op: 'updateItem', sectionId, itemId: item.id, field: f.key, value: toTags(v) })}
							/>
						{:else}
							<Field
								label={f.label}
								value={item[f.key] as string}
								multiline={f.kind === 'long'}
								rows={3}
								type={f.kind === 'url' ? 'url' : 'text'}
								commit={f.kind === 'url' ? 'blur' : 'input'}
								placeholder={f.placeholder ?? (f.kind === 'url' ? 'https://' : '')}
								onchange={(v) => editor.edit({ op: 'updateItem', sectionId, itemId: item.id, field: f.key, value: v })}
							/>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
	<button
		type="button"
		class="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700"
		onclick={add}>+ {addLabel}</button
	>
</div>
