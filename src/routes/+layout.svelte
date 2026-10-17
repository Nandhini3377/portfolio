<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Portfolio Builder</title>
	<meta name="description" content="Build a personal portfolio on your own device." />
</svelte:head>

{@render children()}
