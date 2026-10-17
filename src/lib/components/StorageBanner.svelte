<script lang="ts">
	import type { StorageStatus } from '#lib/storage/projects.ts';

	let { status }: { status: StorageStatus } = $props();
</script>

{#if !status.available}
	<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
		<p class="font-semibold">Browser storage is unavailable</p>
		<p class="mt-1">
			Your drafts can't be saved (this often happens in private windows or when site data is blocked). You can still edit, but download a backup before closing the tab.
		</p>
	</div>
{:else if !status.persisted}
	<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
		<p class="font-semibold">Drafts may be cleared by your browser</p>
		<p class="mt-1">The browser hasn't granted permanent storage, so it may remove drafts if space runs low. Download a backup from the editor's Export menu to be safe.</p>
	</div>
{/if}
