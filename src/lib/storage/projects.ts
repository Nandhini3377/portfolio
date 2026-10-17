// Local draft persistence in IndexedDB. Everything stays on the device.

import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval';
import { repair, type ProjectState } from '#lib/editor/project.ts';
import type { Portfolio } from '#lib/portfolio/types.ts';
import { validatePortfolio } from '#lib/portfolio/validate.ts';

let store: UseStore | undefined;
function db(): UseStore {
	store ??= createStore('portfolio-builder', 'projects');
	return store;
}

export interface ProjectSummary {
	id: string;
	name: string;
	template: Portfolio['template'];
	updatedAt: number;
}

export interface StorageStatus {
	available: boolean;
	persisted: boolean;
	usageBytes?: number;
	quotaBytes?: number;
	error?: string;
}

/** Checks IndexedDB works and asks the browser not to evict our data. */
export async function checkStorage(): Promise<StorageStatus> {
	try {
		await set('__probe', 1, db());
		await del('__probe', db());
	} catch (e) {
		return { available: false, persisted: false, error: (e as Error).message || 'IndexedDB is unavailable' };
	}
	let persisted = false;
	try {
		persisted = (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false;
	} catch {
		/* not supported */
	}
	const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
	return { available: true, persisted, usageBytes: estimate?.usage, quotaBytes: estimate?.quota };
}

export async function saveProject(state: ProjectState): Promise<void> {
	await set(`project:${state.id}`, state, db());
}

/** Loads a project, dropping corrupt history and pending ops that no longer apply. */
export async function loadProject(id: string): Promise<{ state: ProjectState; repaired: boolean } | undefined> {
	const raw = await get<ProjectState>(`project:${id}`, db());
	if (!raw || validatePortfolio(raw.committed).length) return undefined;
	const valid = (p: Portfolio) => validatePortfolio(p).length === 0;
	const past = raw.past.filter(valid);
	const future = raw.future.filter(valid);
	const { state, dropped } = repair({ ...raw, past, future });
	return { state, repaired: dropped > 0 || past.length !== raw.past.length || future.length !== raw.future.length };
}

export async function deleteProject(id: string): Promise<void> {
	await del(`project:${id}`, db());
}

export async function listProjects(): Promise<ProjectSummary[]> {
	const ids = (await keys(db())).map(String).filter((k) => k.startsWith('project:'));
	const items = await Promise.all(ids.map((k) => get<ProjectState>(k, db())));
	return items
		.filter((s): s is ProjectState => !!s?.committed)
		.map((s) => ({ id: s.id, name: s.name, template: s.committed.template, updatedAt: s.updatedAt }))
		.sort((a, b) => b.updatedAt - a.updatedAt);
}

// ---- JSON backup files ----

const FILE_FORMAT = 'offline-portfolio-builder';

export function toBackupFile(state: ProjectState): string {
	return JSON.stringify({ format: FILE_FORMAT, version: 1, name: state.name, portfolio: state.committed }, null, 2);
}

export function fromBackupFile(text: string): { name: string; portfolio: Portfolio } {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('This file is not valid JSON.');
	}
	const d = data as { format?: string; name?: unknown; portfolio?: unknown };
	if (d?.format !== FILE_FORMAT) throw new Error('This is not a portfolio backup file.');
	const errors = validatePortfolio(d.portfolio);
	if (errors.length) throw new Error(`The backup has problems: ${errors.slice(0, 3).join('; ')}`);
	return { name: typeof d.name === 'string' && d.name ? d.name.slice(0, 80) : 'Imported portfolio', portfolio: d.portfolio as Portfolio };
}
