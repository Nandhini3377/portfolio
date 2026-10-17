<script lang="ts">
	import Field from './Field.svelte';
	import IconButton from './IconButton.svelte';
	import ListEditor, { type FieldSpec } from './ListEditor.svelte';
	import type { Editor } from '#lib/editor/editor.svelte.ts';
	import { emptyItem, SECTION_LABELS } from '#lib/portfolio/defaults.ts';
	import type { ListSectionType, Section } from '#lib/portfolio/types.ts';

	interface Props {
		editor: Editor;
		section: Section;
		index: number;
		count: number;
		open: boolean;
		ontoggle: () => void;
	}
	let { editor, section, index, count, open, ontoggle }: Props = $props();

	const LISTS: Record<ListSectionType, { fields: FieldSpec[]; titleKey: string; addLabel: string }> = {
		skills: {
			titleKey: 'name',
			addLabel: 'Add skill group',
			fields: [
				{ key: 'name', label: 'Group name', kind: 'text', placeholder: 'e.g. Languages' },
				{ key: 'skills', label: 'Skills', kind: 'tags', placeholder: 'TypeScript, Python' }
			]
		},
		projects: {
			titleKey: 'name',
			addLabel: 'Add project',
			fields: [
				{ key: 'name', label: 'Name', kind: 'text' },
				{ key: 'description', label: 'Description', kind: 'long' },
				{ key: 'tags', label: 'Tags', kind: 'tags', placeholder: 'Svelte, API' },
				{ key: 'url', label: 'Live link', kind: 'url' },
				{ key: 'repoUrl', label: 'Source code link', kind: 'url' }
			]
		},
		experience: {
			titleKey: 'role',
			addLabel: 'Add role',
			fields: [
				{ key: 'role', label: 'Role', kind: 'text' },
				{ key: 'organization', label: 'Company / organization', kind: 'text' },
				{ key: 'start', label: 'Start', kind: 'text', placeholder: '2022' },
				{ key: 'end', label: 'End', kind: 'text', placeholder: 'Present' },
				{ key: 'summary', label: 'What you did', kind: 'long' }
			]
		},
		education: {
			titleKey: 'institution',
			addLabel: 'Add education',
			fields: [
				{ key: 'institution', label: 'School / university', kind: 'text' },
				{ key: 'qualification', label: 'Degree or certificate', kind: 'text' },
				{ key: 'start', label: 'Start', kind: 'text' },
				{ key: 'end', label: 'End', kind: 'text' },
				{ key: 'summary', label: 'Notes', kind: 'long' }
			]
		},
		contact: {
			titleKey: 'label',
			addLabel: 'Add link',
			fields: [
				{ key: 'label', label: 'Label', kind: 'text', placeholder: 'GitHub' },
				{ key: 'url', label: 'Link', kind: 'url' }
			]
		}
	};

	const list = $derived(section.type === 'intro' ? undefined : LISTS[section.type]);
</script>

<div class="rounded-xl border border-slate-200 bg-slate-50/60 {section.visible ? '' : 'opacity-70'}">
	<div class="flex items-center gap-1 pr-1">
		<button type="button" class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left" aria-expanded={open} onclick={ontoggle}>
			<svg class="size-3.5 shrink-0 text-slate-400 transition-transform {open ? 'rotate-90' : ''}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
				><path d="M7 4l6 6-6 6V4z" /></svg
			>
			<span class="truncate text-sm font-semibold text-slate-900">{section.title || SECTION_LABELS[section.type]}</span>
			{#if !section.visible}<span class="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Hidden</span>{/if}
		</button>
		<IconButton
			label={section.visible ? 'Hide section' : 'Show section'}
			icon={section.visible ? 'eye' : 'eyeOff'}
			onclick={() => editor.edit({ op: 'updateSection', sectionId: section.id, visible: !section.visible })}
		/>
		<IconButton label="Move up" icon="up" disabled={index === 0} onclick={() => editor.edit({ op: 'moveSection', sectionId: section.id, toIndex: index - 1 })} />
		<IconButton label="Move down" icon="down" disabled={index === count - 1} onclick={() => editor.edit({ op: 'moveSection', sectionId: section.id, toIndex: index + 1 })} />
		<IconButton label="Remove section" icon="trash" onclick={() => editor.edit({ op: 'removeSection', sectionId: section.id })} />
	</div>

	{#if open}
		<div class="space-y-3 border-t border-slate-200 px-3 py-3">
			<Field label="Section heading" value={section.title} onchange={(v) => editor.edit({ op: 'updateSection', sectionId: section.id, title: v })} />
			{#if section.type === 'intro'}
				<Field
					label="About you"
					value={section.data.body}
					multiline
					rows={7}
					hint="Leave a blank line between paragraphs"
					onchange={(v) => editor.edit({ op: 'setSectionField', sectionId: section.id, field: 'body', value: v })}
				/>
			{:else}
				{#if section.type === 'contact'}
					<Field
						label="Short message"
						value={section.data.message}
						onchange={(v) => editor.edit({ op: 'setSectionField', sectionId: section.id, field: 'message', value: v })}
					/>
					<Field
						label="Email"
						type="email"
						commit="blur"
						value={section.data.email}
						onchange={(v) => editor.edit({ op: 'setSectionField', sectionId: section.id, field: 'email', value: v.trim() })}
					/>
				{/if}
				{#if list}
					<ListEditor
						{editor}
						sectionId={section.id}
						items={section.data.items as unknown as Array<{ id: string } & Record<string, unknown>>}
						fields={list.fields}
						titleKey={list.titleKey}
						addLabel={list.addLabel}
						newItem={() => emptyItem(section.type as ListSectionType) as never}
					/>
				{/if}
			{/if}
		</div>
	{/if}
</div>
