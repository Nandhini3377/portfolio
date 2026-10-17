<script lang="ts" module>
	const PATHS = {
		up: 'M10 6l-5 5h10l-5-5z',
		down: 'M10 14l5-5H5l5 5z',
		trash: 'M7 3h6l1 2h3v2H3V5h3l1-2zm-2 5h10l-1 9H6L5 8z',
		eye: 'M10 4c4.5 0 8 4.5 8 6s-3.5 6-8 6-8-4.5-8-6 3.5-6 8-6zm0 3a3 3 0 100 6 3 3 0 000-6z',
		eyeOff: 'M3 3l14 14-1.4 1.4-2.6-2.6c-1 .4-2 .7-3 .7-4.5 0-8-4.5-8-6 0-.9 1.2-2.8 3.2-4.3L1.6 4.4 3 3zm7 1c4.5 0 8 4.5 8 6 0 .7-.8 2.1-2.1 3.4L13 10.5V10a3 3 0 00-3.5-3L7.6 5.1C8.4 4.4 9.2 4 10 4z',
		undo: 'M8 5V2L3 7l5 5V9h4a4 4 0 010 8H8v2h4a6 6 0 000-12H8z',
		redo: 'M12 5V2l5 5-5 5V9H8a4 4 0 000 8h4v2H8A6 6 0 018 7h4z'
	} as const;
	export type Icon = keyof typeof PATHS;
</script>

<script lang="ts">
	interface Props {
		label: string;
		icon: Icon;
		onclick: () => void;
		disabled?: boolean;
		pressed?: boolean;
	}
	let { label, icon, onclick, disabled = false, pressed }: Props = $props();
</script>

<button
	type="button"
	class="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30"
	aria-label={label}
	title={label}
	aria-pressed={pressed}
	{disabled}
	{onclick}
>
	<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d={PATHS[icon]} /></svg>
</button>
