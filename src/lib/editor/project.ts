// Project state machine. `committed` is the approved portfolio; `pending` holds
// staged operations awaiting review. Nothing reaches `committed` (and later GitHub)
// without approve(). Undo/redo work on approved snapshots.

import type { Portfolio } from '#lib/portfolio/types';
import { applyOp, applyOps, supersedes, type EditOp } from './ops';

export const HISTORY_LIMIT = 50;

export interface ProjectState {
	id: string;
	name: string;
	committed: Portfolio;
	pending: EditOp[];
	past: Portfolio[];
	future: Portfolio[];
	updatedAt: number;
}

export type StepResult = { ok: true; state: ProjectState } | { ok: false; error: string; state: ProjectState };

function touch(state: ProjectState, patch: Partial<ProjectState>): ProjectState {
	return { ...state, ...patch, updatedAt: Date.now() };
}

export function createProject(id: string, name: string, portfolio: Portfolio): ProjectState {
	return { id, name, committed: portfolio, pending: [], past: [], future: [], updatedAt: Date.now() };
}

/** The portfolio as it would look if every pending op were approved. */
export function proposed(state: ProjectState): Portfolio {
	const result = applyOps(state.committed, state.pending);
	return result.ok ? result.portfolio : state.committed;
}

/** Stage one operation. Rejected ops leave the state unchanged. */
export function stage(state: ProjectState, op: EditOp): StepResult {
	const current = proposed(state);
	const result = applyOp(current, op);
	if (!result.ok) return { ok: false, error: result.error, state };
	const last = state.pending.at(-1);
	const pending = last && supersedes(op, last) ? [...state.pending.slice(0, -1), op] : [...state.pending, op];
	return { ok: true, state: touch(state, { pending }) };
}

/** Stage a batch atomically: all ops apply or none do (used for AI proposals). */
export function stageAll(state: ProjectState, ops: EditOp[]): StepResult {
	const result = applyOps(proposed(state), ops);
	if (!result.ok) return { ok: false, error: `Change ${(result.failedAt ?? 0) + 1}: ${result.error}`, state };
	return { ok: true, state: touch(state, { pending: [...state.pending, ...ops] }) };
}

/** Revise: drop one pending op. Fails if later ops depend on it. */
export function unstage(state: ProjectState, index: number): StepResult {
	const pending = state.pending.filter((_, i) => i !== index);
	const result = applyOps(state.committed, pending);
	if (!result.ok) return { ok: false, error: 'Other pending changes depend on this one. Remove those first.', state };
	return { ok: true, state: touch(state, { pending }) };
}

export function approve(state: ProjectState): StepResult {
	if (!state.pending.length) return { ok: false, error: 'Nothing to approve', state };
	const result = applyOps(state.committed, state.pending);
	if (!result.ok) return { ok: false, error: result.error, state };
	return {
		ok: true,
		state: touch(state, {
			committed: result.portfolio,
			pending: [],
			past: [...state.past, state.committed].slice(-HISTORY_LIMIT),
			future: []
		})
	};
}

export function reject(state: ProjectState): ProjectState {
	return touch(state, { pending: [] });
}

/** Undo discards pending changes first, then steps back through approved history. */
export function undo(state: ProjectState): ProjectState {
	if (state.pending.length) return reject(state);
	const previous = state.past.at(-1);
	if (!previous) return state;
	return touch(state, { committed: previous, past: state.past.slice(0, -1), future: [state.committed, ...state.future] });
}

export function redo(state: ProjectState): ProjectState {
	const [next, ...rest] = state.future;
	if (!next || state.pending.length) return state;
	return touch(state, { committed: next, past: [...state.past, state.committed].slice(-HISTORY_LIMIT), future: rest });
}

/**
 * Recovery for loaded state: drops pending ops that no longer apply
 * (e.g. after a schema change or a corrupted save). Returns how many were dropped.
 */
export function repair(state: ProjectState): { state: ProjectState; dropped: number } {
	const kept: EditOp[] = [];
	let current = state.committed;
	for (const op of state.pending) {
		const result = applyOp(current, op);
		if (result.ok) {
			kept.push(op);
			current = result.portfolio;
		}
	}
	const dropped = state.pending.length - kept.length;
	return { state: dropped ? { ...state, pending: kept } : state, dropped };
}
