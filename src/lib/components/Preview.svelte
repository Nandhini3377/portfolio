<script lang="ts">
	// Sandboxed live preview. The iframe may never run scripts (no `allow-scripts`),
	// so `allow-same-origin` is safe and lets us patch the document in place instead
	// of reloading it, which keeps the scroll position while the user types.

	import { untrack } from 'svelte';
	import type { Portfolio } from '#lib/portfolio/types.ts';
	import { renderBody, renderPortfolio, renderStyles } from '#lib/render/index.ts';

	interface Props {
		portfolio: Portfolio;
		/** Width the page is laid out at; it is scaled down to fit the container. */
		deviceWidth?: number;
		title?: string;
		interactive?: boolean;
	}
	let { portfolio, deviceWidth = 1280, title = 'Portfolio preview', interactive = true }: Props = $props();

	let iframe = $state<HTMLIFrameElement>();
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	let loaded = $state(false);

	// Initial document only; later updates are patched in by the effect below.
	const initial = untrack(() => renderPortfolio(portfolio));

	const scale = $derived(containerWidth ? Math.min(1, containerWidth / deviceWidth) : 1);

	$effect(() => {
		const doc = iframe?.contentDocument;
		const styles = renderStyles(portfolio);
		const body = renderBody(portfolio);
		if (!loaded || !doc?.body) return;
		const style = doc.head.querySelector('style');
		if (style && style.textContent !== styles) style.textContent = styles;
		if (doc.body.innerHTML !== body) doc.body.innerHTML = body;
	});
</script>

<div class="relative h-full w-full overflow-hidden" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (iframes are focusable; -1 removes decorative thumbnails from tab order) -->
	<iframe
		bind:this={iframe}
		{title}
		srcdoc={initial}
		sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
		referrerpolicy="no-referrer"
		tabindex={interactive ? undefined : -1}
		onload={() => (loaded = true)}
		class="absolute top-0 left-1/2 origin-top border-0 bg-white {interactive ? '' : 'pointer-events-none'}"
		style:width="{deviceWidth}px"
		style:height="{scale ? containerHeight / scale : containerHeight}px"
		style:transform="translateX(-50%) scale({scale})"
	></iframe>
</div>
