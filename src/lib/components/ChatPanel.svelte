<script lang="ts">
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { assistant, type GenerateStats } from '#lib/ai/assistant.svelte.ts';
	import { modelByBase } from '#lib/ai/models.ts';
	import type { ChatTurn } from '#lib/ai/prompt.ts';
	import type { Editor } from '#lib/editor/editor.svelte.ts';
	import { describeOps } from '#lib/editor/ops.ts';

	let { editor, onreview }: { editor: Editor; onreview: () => void } = $props();

	const a = assistant;
	$effect(() => void a.init());

	let input = $state('');
	let thinking = $state(false);
	let log = $state<HTMLDivElement>();
	let now = $state(Date.now());

	// Tick once a second while the model works, for the elapsed-time label.
	$effect(() => {
		if (!thinking) return;
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});
	const elapsed = $derived(a.generating ? Math.max(0, Math.round((now - a.generating.startedAt) / 1000)) : 0);

	const SUGGESTIONS = ['Switch to dark mode', 'Add my GitHub link https://github.com/', 'Move projects to the top', 'Hide the education section'];
	const model = $derived(modelByBase(a.selected));

	async function scrollDown() {
		await tick();
		log?.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
	}

	function timing(s: GenerateStats): string {
		return `${s.latencyS.toFixed(1)} s · read ${s.promptTokens} tokens · wrote ${s.completionTokens} at ${s.decodeTokensPerS.toFixed(1)}/s`;
	}

	function history(): ChatTurn[] {
		return editor.chat.filter((m) => m.text).map((m) => ({ role: m.role, content: m.text }));
	}

	async function send(text = input) {
		text = text.trim();
		if (!text || thinking || !a.ready) return;
		const prior = history();
		editor.chat.push({ role: 'user', text });
		input = '';
		thinking = true;
		scrollDown();

		const before = editor.proposed;
		const res = await a.generate(before, text, prior);
		thinking = false;

		if (res.kind === 'ok') {
			if (res.ops.length) {
				const error = editor.editAll(res.ops);
				if (error) editor.chat.push({ role: 'assistant', text: '', error: `That change didn't fit your current draft: ${error}` });
				else {
					editor.chat.push({
						role: 'assistant',
						text: describeOps(before, res.ops).join(' · '),
						note: res.dropped.length ? `Skipped ${[...new Set(res.dropped)].join(', ')}.` : undefined,
						meta: timing(res.stats),
						proposed: res.ops.length
					});
					onreview();
				}
			} else
				editor.chat.push({
					role: 'assistant',
					text: res.reply || (res.dropped.length ? `I only came up with changes you didn't ask for (${[...new Set(res.dropped)].join(', ')}), so I skipped them. Could you be more specific?` : "I didn't find anything to change. Could you say it another way?")
				});
		} else if (res.kind === 'invalid') {
			editor.chat.push({ role: 'assistant', text: res.reply, error: `I couldn't turn that into a safe change (${res.error}). Nothing was modified. Try rephrasing, or edit it in the Content tab.` });
		} else if (res.kind === 'interrupted') {
			editor.chat.push({ role: 'assistant', text: '', error: 'Stopped. Nothing was changed.' });
		} else {
			editor.chat.push({ role: 'assistant', text: '', error: res.error });
		}
		scrollDown();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="flex h-full flex-col">
	{#if !a.ready}
		<div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
			{#if a.status === 'checking'}
				<p class="text-slate-500">Checking your device…</p>
			{:else if a.status === 'unsupported'}
				<p class="font-medium text-slate-900">AI editing isn't available in this browser</p>
				<p class="text-slate-600">{a.device?.problem} You can still edit everything in the Content and Design tabs.</p>
			{:else if a.status === 'downloading' || a.status === 'loading'}
				<p class="font-medium text-slate-900">{a.status === 'downloading' ? 'Downloading' : 'Loading'} {model?.label}… {Math.round(a.progress * 100)}%</p>
				<div class="h-1.5 overflow-hidden rounded-full bg-slate-200"><div class="h-full bg-indigo-600 transition-[width]" style:width="{a.progress * 100}%"></div></div>
				<button type="button" class="text-xs text-slate-500 hover:text-slate-900" onclick={() => a.cancel()}>Stop</button>
			{:else if a.status === 'error'}
				<p class="text-red-700" role="alert">{a.error}</p>
				<button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white" onclick={() => a.load()}>Retry</button>
			{:else if a.cached[a.selected]}
				<p class="font-medium text-slate-900">Your AI assistant is on this device</p>
				<p class="text-slate-600">Load {model?.label} to start chatting. It runs locally and works offline.</p>
				<button type="button" class="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700" onclick={() => a.load()}>Load model</button>
			{:else}
				<p class="font-medium text-slate-900">Edit by chatting, privately</p>
				<p class="text-slate-600">Download a small AI model once (about {model?.downloadGB} GB). It runs on your device; nothing you type is sent to an AI service.</p>
				<a href={resolve('/model')} class="inline-block rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700">Set up AI assistant</a>
			{/if}
		</div>
	{:else}
		<div bind:this={log} class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3" aria-live="polite">
			{#if editor.chat.length === 0}
				<p class="text-sm text-slate-600">Tell me what to change. I'll propose it for your review — nothing changes until you approve.</p>
				<div class="flex flex-wrap gap-2">
					{#each SUGGESTIONS as s (s)}
						<button type="button" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-indigo-400" onclick={() => (input = s)}>{s}</button>
					{/each}
				</div>
			{/if}
			{#each editor.chat as m, i (i)}
				{#if m.role === 'user'}
					<div class="ml-8 rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">{m.text}</div>
				{:else}
					<div class="mr-8 space-y-1.5 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800">
						{#if m.text}<p>{m.text}</p>{/if}
						{#if m.note}<p class="text-xs text-slate-500">{m.note}</p>{/if}
						{#if m.meta}<p class="text-[10px] text-slate-400 tabular-nums">{m.meta}</p>{/if}
						{#if m.error}<p class="text-red-700">{m.error}</p>{/if}
						{#if m.proposed}
							<button type="button" class="text-xs font-medium text-indigo-700 hover:underline" onclick={onreview}>
								{m.proposed} proposed {m.proposed === 1 ? 'change' : 'changes'} · Review
							</button>
						{/if}
					</div>
				{/if}
			{/each}
			{#if thinking}
				<div class="mr-8 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
					<span class="inline-flex gap-1" aria-hidden="true"
						><span class="size-1.5 animate-bounce rounded-full bg-slate-400"></span><span class="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:.15s]"></span><span
							class="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:.3s]"
						></span></span
					>
					<span>
						{#if !a.generating || a.generating.tokens === 0}Reading your request…{:else}Writing the change… ({a.generating.tokens} tokens){/if}
						<span class="text-slate-400 tabular-nums">{elapsed}s</span>
						{#if elapsed >= 20}<span class="block text-xs text-slate-400">Slower devices can take up to a minute.</span>{/if}
					</span>
					<button type="button" class="ml-auto text-xs hover:text-slate-900" onclick={() => a.interrupt()}>Stop</button>
				</div>
			{/if}
		</div>

		<form
			class="flex items-end gap-2 border-t border-slate-200 pt-3"
			onsubmit={(e) => {
				e.preventDefault();
				send();
			}}
		>
			<label for="chat-input" class="sr-only">Describe a change</label>
			<textarea
				id="chat-input"
				rows="2"
				maxlength="600"
				placeholder="e.g. Add a project called Weather Bot…"
				class="block min-w-0 flex-1 resize-none rounded-xl border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
				bind:value={input}
				{onkeydown}
				disabled={thinking}
			></textarea>
			<button type="submit" class="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40" disabled={thinking || !input.trim()}>Send</button>
		</form>
		<p class="pt-1.5 text-[11px] text-slate-400">{model?.label} · running locally</p>
	{/if}
</div>
