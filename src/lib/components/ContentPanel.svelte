<script lang="ts">
	import Field from './Field.svelte';
	import SectionCard from './SectionCard.svelte';
	import type { Editor } from '#lib/editor/editor.svelte.ts';
	import { emptySection, SECTION_LABELS } from '#lib/portfolio/defaults.ts';
	import { SECTION_TYPES } from '#lib/portfolio/types.ts';

	let { editor }: { editor: Editor } = $props();
	const p = $derived(editor.proposed);
	const missing = $derived(SECTION_TYPES.filter((t) => !p.sections.some((s) => s.type === t)));
	let open = $state<string | null>('profile');
</script>

<div class="space-y-6">
	<section class="space-y-3" aria-labelledby="profile-h">
		<button
			type="button"
			id="profile-h"
			class="flex w-full items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase"
			aria-expanded={open === 'profile'}
			onclick={() => (open = open === 'profile' ? null : 'profile')}
		>
			Profile <span aria-hidden="true">{open === 'profile' ? '−' : '+'}</span>
		</button>
		{#if open === 'profile'}
			<div class="space-y-3">
				<Field label="Full name" value={p.profile.name} onchange={(v) => editor.edit({ op: 'updateProfile', field: 'name', value: v })} />
				<Field label="Headline" value={p.profile.headline} multiline rows={2} onchange={(v) => editor.edit({ op: 'updateProfile', field: 'headline', value: v })} />
				<Field label="Location" value={p.profile.location} onchange={(v) => editor.edit({ op: 'updateProfile', field: 'location', value: v })} />
				<Field
					label="Photo link"
					type="url"
					commit="blur"
					placeholder="https://…/photo.jpg"
					hint="Optional. Your initials are shown if empty."
					value={p.profile.avatarUrl}
					onchange={(v) => editor.edit({ op: 'updateProfile', field: 'avatarUrl', value: v.trim() })}
				/>
			</div>
		{/if}
	</section>

	<section class="space-y-2" aria-labelledby="sections-h">
		<h2 id="sections-h" class="text-xs font-semibold tracking-wide text-slate-500 uppercase">Sections</h2>
		{#each p.sections as section, i (section.id)}
			<SectionCard {editor} {section} index={i} count={p.sections.length} open={open === section.id} ontoggle={() => (open = open === section.id ? null : section.id)} />
		{/each}
		{#if missing.length}
			<div class="flex flex-wrap gap-2 pt-2">
				{#each missing as type (type)}
					<button
						type="button"
						class="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700"
						onclick={() => {
							const section = emptySection(type);
							if (!editor.edit({ op: 'addSection', section })) open = section.id;
						}}>+ {SECTION_LABELS[type]}</button
					>
				{/each}
			</div>
		{/if}
	</section>
</div>
