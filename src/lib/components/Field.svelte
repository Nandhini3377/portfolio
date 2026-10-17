<script lang="ts">
	// Text input that keeps the user's draft while it is invalid and shows why.
	// `commit: 'input'` stages on every keystroke (edits are coalesced);
	// `commit: 'blur'` waits until the user leaves the field (links, lists).

	interface Props {
		label: string;
		value: string;
		onchange: (value: string) => string | undefined;
		multiline?: boolean;
		rows?: number;
		commit?: 'input' | 'blur';
		placeholder?: string;
		hint?: string;
		type?: 'text' | 'url' | 'email';
		maxlength?: number;
	}

	let { label, value, onchange, multiline = false, rows = 4, commit = 'input', placeholder = '', hint = '', type = 'text', maxlength }: Props = $props();

	const id = $props.id();
	let draft = $state('');
	let error = $state<string | undefined>();
	let focused = $state(false);

	// Follow external changes (undo, reject, template switch) unless the user is typing.
	$effect.pre(() => {
		const v = value;
		if (!focused) {
			draft = v;
			error = undefined;
		}
	});

	function submit() {
		if (draft === value) {
			error = undefined;
			return;
		}
		error = onchange(draft);
	}

	function oninput(e: Event) {
		draft = (e.currentTarget as HTMLInputElement).value;
		if (commit === 'input') submit();
	}

	function onblur() {
		focused = false;
		if (commit === 'blur') submit();
		if (!error) draft = value;
	}

	const cls =
		'block w-full rounded-lg border-slate-300 bg-white text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500';
</script>

<div class="space-y-1">
	<label for={id} class="block text-xs font-medium text-slate-600">{label}</label>
	{#if multiline}
		<textarea
			{id}
			{rows}
			{placeholder}
			{maxlength}
			class={cls}
			value={draft}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error || hint ? `${id}-msg` : undefined}
			onfocus={() => (focused = true)}
			{oninput}
			{onblur}
		></textarea>
	{:else}
		<input
			{id}
			{type}
			{placeholder}
			{maxlength}
			class={cls}
			value={draft}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error || hint ? `${id}-msg` : undefined}
			onfocus={() => (focused = true)}
			{oninput}
			{onblur}
			onkeydown={(e) => e.key === 'Enter' && commit === 'blur' && submit()}
		/>
	{/if}
	{#if error}
		<p id="{id}-msg" class="text-xs text-red-600" role="alert">{error}</p>
	{:else if hint}
		<p id="{id}-msg" class="text-xs text-slate-500">{hint}</p>
	{/if}
</div>
