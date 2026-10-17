// Reactive wrapper around the pure project state machine, with debounced autosave.
// UI components call these methods; they never edit portfolio objects directly.

import { diffPortfolios } from './diff';
import { applyOp, describeOp, type EditOp } from './ops';
import * as project from './project';
import type { ProjectState } from './project';
import { saveProject } from '#lib/storage/projects.ts';

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface ChatEntry {
	role: 'user' | 'assistant';
	text: string;
	error?: string;
	/** Number of edit operations this reply staged for review. */
	proposed?: number;
}

const FIELD_NAMES: Record<string, string> = {
	url: 'Link',
	repoUrl: 'Source code link',
	avatarUrl: 'Photo link',
	accent: 'Accent colour',
	email: 'Email'
};

/** "sections[2].data.items[0].url must be…" → "Link must be…" for form fields. */
export function friendlyError(message: string): string {
	const m = /^[\w.[\]]*?\.?(\w+)(\[\d+\])? (.*)$/.exec(message);
	if (!m || !message.includes('.')) return message;
	const field = FIELD_NAMES[m[1]] ?? m[1].replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
	return `${field} ${m[3]}`;
}

export class Editor {
	state = $state.raw<ProjectState>(null!);
	/** Last rejected operation's message, shown next to the control that caused it. */
	error = $state<{ message: string; key?: string } | null>(null);
	saveStatus = $state<SaveStatus>('saved');
	saveError = $state('');
	/** Chat with the local model for this editing session (not persisted). */
	chat = $state<ChatEntry[]>([]);

	proposed = $derived(project.proposed(this.state));
	hasPending = $derived(this.state.pending.length > 0);
	canUndo = $derived(this.hasPending || this.state.past.length > 0);
	canRedo = $derived(!this.hasPending && this.state.future.length > 0);
	diff = $derived(this.hasPending ? diffPortfolios(this.state.committed, this.proposed) : []);

	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(initial: ProjectState) {
		this.state = initial;
	}

	/** Labels for pending ops, each described against the state it applied to. */
	pendingSummary = $derived.by(() => {
		let current = this.state.committed;
		return this.state.pending.map((op) => {
			const label = describeOp(op, current);
			const next = applyOp(current, op);
			if (next.ok) current = next.portfolio;
			return label;
		});
	});

	#set(next: ProjectState) {
		if (next === this.state) return;
		this.state = next;
		this.#scheduleSave();
	}

	#scheduleSave() {
		this.saveStatus = 'saving';
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.flush(), 400);
	}

	async flush() {
		clearTimeout(this.#timer);
		try {
			await saveProject(this.state);
			this.saveStatus = 'saved';
			this.saveError = '';
		} catch (e) {
			this.saveStatus = 'error';
			this.saveError = (e as Error).message || 'Could not save to browser storage';
		}
	}

	/** Stage an edit for review. Returns the error message if it was rejected. */
	edit(op: EditOp, key?: string): string | undefined {
		const result = project.stage(this.state, op);
		if (!result.ok) {
			const message = friendlyError(result.error);
			this.error = { message, key };
			return message;
		}
		if (this.error?.key === key) this.error = null;
		this.#set(result.state);
	}

	editAll(ops: EditOp[]): string | undefined {
		const result = project.stageAll(this.state, ops);
		if (!result.ok) {
			this.error = { message: result.error };
			return result.error;
		}
		this.error = null;
		this.#set(result.state);
	}

	unstage(index: number) {
		const result = project.unstage(this.state, index);
		if (!result.ok) this.error = { message: result.error, key: 'review' };
		else this.#set(result.state);
	}

	approve() {
		const result = project.approve(this.state);
		if (!result.ok) this.error = { message: result.error, key: 'review' };
		else {
			this.error = null;
			this.#set(result.state);
		}
	}

	reject() {
		this.error = null;
		this.#set(project.reject(this.state));
	}

	undo() {
		this.error = null;
		this.#set(project.undo(this.state));
	}

	redo() {
		this.#set(project.redo(this.state));
	}

	rename(name: string) {
		const trimmed = name.trim().slice(0, 80);
		if (trimmed) this.#set({ ...this.state, name: trimmed, updatedAt: Date.now() });
	}

	errorFor(key: string): string | undefined {
		return this.error?.key === key ? this.error.message : undefined;
	}
}
