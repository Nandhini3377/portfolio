// Typed edit operations: the only way a portfolio changes. UI forms emit these
// today; the local model will emit the same JSON in Phase 2. Operations carry any
// generated ids so replaying them is deterministic.

import { SECTION_LABELS } from '#lib/portfolio/defaults.ts';
import type {
	Font,
	Layout,
	Portfolio,
	Profile,
	Section,
	SectionType,
	TemplateId,
	ThemeMode
} from '#lib/portfolio/types.ts';
import { validatePortfolio } from '#lib/portfolio/validate.ts';

export type ItemValue = string | string[];

export type EditOp =
	| { op: 'setTemplate'; template: TemplateId }
	| { op: 'setLayout'; layout: Layout }
	| { op: 'setTheme'; mode?: ThemeMode; accent?: string; font?: Font }
	| { op: 'updateProfile'; field: keyof Profile; value: string }
	| { op: 'addSection'; section: Section; index?: number }
	| { op: 'removeSection'; sectionId: string }
	| { op: 'moveSection'; sectionId: string; toIndex: number }
	| { op: 'updateSection'; sectionId: string; title?: string; visible?: boolean }
	| { op: 'setSectionField'; sectionId: string; field: 'body' | 'email' | 'message'; value: string }
	| { op: 'addItem'; sectionId: string; item: { id: string } & Record<string, ItemValue>; index?: number }
	| { op: 'updateItem'; sectionId: string; itemId: string; field: string; value: ItemValue }
	| { op: 'removeItem'; sectionId: string; itemId: string }
	| { op: 'moveItem'; sectionId: string; itemId: string; toIndex: number };

export type OpName = EditOp['op'];

export type ApplyResult = { ok: true; portfolio: Portfolio } | { ok: false; error: string };

class OpError extends Error {}

function fail(message: string): never {
	throw new OpError(message);
}

function findSection(p: Portfolio, id: string): Section {
	return p.sections.find((s) => s.id === id) ?? fail(`Section "${id}" does not exist`);
}

function itemsOf(section: Section): Array<{ id: string } & Record<string, unknown>> {
	if (!('items' in section.data)) fail(`The ${section.type} section has no list of items`);
	return section.data.items as unknown as Array<{ id: string } & Record<string, unknown>>;
}

function move<T>(list: T[], from: number, to: number) {
	if (!Number.isInteger(to) || to < 0 || to >= list.length) fail(`Position ${to} is out of range`);
	const [entry] = list.splice(from, 1);
	list.splice(to, 0, entry);
}

function insertAt<T>(list: T[], entry: T, index: number | undefined) {
	if (index === undefined) list.push(entry);
	else if (!Number.isInteger(index) || index < 0 || index > list.length) fail(`Position ${index} is out of range`);
	else list.splice(index, 0, entry);
}

/** Mutates `p` (a private clone). Throws OpError on bad input. */
function mutate(p: Portfolio, op: EditOp) {
	switch (op.op) {
		case 'setTemplate':
			p.template = op.template;
			return;
		case 'setLayout':
			p.layout = op.layout;
			return;
		case 'setTheme':
			if (op.mode === undefined && op.accent === undefined && op.font === undefined) fail('setTheme needs at least one change');
			if (op.mode !== undefined) p.theme.mode = op.mode;
			if (op.accent !== undefined) p.theme.accent = op.accent;
			if (op.font !== undefined) p.theme.font = op.font;
			return;
		case 'updateProfile':
			if (!(op.field in p.profile)) fail(`Unknown profile field "${op.field}"`);
			p.profile[op.field] = op.value;
			return;
		case 'addSection':
			insertAt(p.sections, structuredClone(op.section), op.index);
			return;
		case 'removeSection': {
			findSection(p, op.sectionId);
			p.sections = p.sections.filter((s) => s.id !== op.sectionId);
			return;
		}
		case 'moveSection': {
			const from = p.sections.indexOf(findSection(p, op.sectionId));
			move(p.sections, from, op.toIndex);
			return;
		}
		case 'updateSection': {
			const s = findSection(p, op.sectionId);
			if (op.title === undefined && op.visible === undefined) fail('updateSection needs a title or visibility');
			if (op.title !== undefined) s.title = op.title;
			if (op.visible !== undefined) s.visible = op.visible;
			return;
		}
		case 'setSectionField': {
			const s = findSection(p, op.sectionId);
			if (!(op.field in s.data)) fail(`The ${s.type} section has no "${op.field}" field`);
			(s.data as Record<string, unknown>)[op.field] = op.value;
			return;
		}
		case 'addItem': {
			const items = itemsOf(findSection(p, op.sectionId));
			if (items.some((i) => i.id === op.item.id)) fail(`Item "${op.item.id}" already exists`);
			insertAt(items, structuredClone(op.item), op.index);
			return;
		}
		case 'updateItem': {
			const item = itemsOf(findSection(p, op.sectionId)).find((i) => i.id === op.itemId) ?? fail(`Item "${op.itemId}" does not exist`);
			if (op.field === 'id' || !(op.field in item)) fail(`Items here have no "${op.field}" field`);
			item[op.field] = structuredClone(op.value);
			return;
		}
		case 'removeItem': {
			const section = findSection(p, op.sectionId);
			const items = itemsOf(section);
			const index = items.findIndex((i) => i.id === op.itemId);
			if (index < 0) fail(`Item "${op.itemId}" does not exist`);
			items.splice(index, 1);
			return;
		}
		case 'moveItem': {
			const items = itemsOf(findSection(p, op.sectionId));
			const from = items.findIndex((i) => i.id === op.itemId);
			if (from < 0) fail(`Item "${op.itemId}" does not exist`);
			move(items, from, op.toIndex);
			return;
		}
		default:
			fail(`Unknown operation "${(op as { op: string }).op}"`);
	}
}

/** Applies one operation to a copy of `p`, then validates the whole result. Never mutates `p`. */
export function applyOp(p: Portfolio, op: EditOp): ApplyResult {
	const next = structuredClone(p);
	try {
		if (typeof op !== 'object' || op === null || typeof op.op !== 'string') fail('Operation must be an object with an "op" name');
		mutate(next, op);
	} catch (e) {
		if (e instanceof OpError) return { ok: false, error: e.message };
		return { ok: false, error: `Could not apply ${op?.op ?? 'operation'}: ${(e as Error).message}` };
	}
	const errors = validatePortfolio(next);
	if (errors.length) return { ok: false, error: errors[0] };
	return { ok: true, portfolio: next };
}

/** Applies operations in order; stops at the first failure. */
export function applyOps(p: Portfolio, ops: EditOp[]): ApplyResult & { failedAt?: number } {
	let current = p;
	for (let i = 0; i < ops.length; i++) {
		const result = applyOp(current, ops[i]);
		if (!result.ok) return { ...result, failedAt: i };
		current = result.portfolio;
	}
	return { ok: true, portfolio: current };
}

/** Two ops that set the same single value: the later one makes the earlier redundant. */
export function supersedes(later: EditOp, earlier: EditOp): boolean {
	if (later.op !== earlier.op) return false;
	switch (later.op) {
		case 'setTemplate':
		case 'setLayout':
			return true;
		case 'updateProfile':
			return later.field === (earlier as typeof later).field;
		case 'setSectionField':
			return later.sectionId === (earlier as typeof later).sectionId && later.field === (earlier as typeof later).field;
		case 'updateItem': {
			const e = earlier as typeof later;
			return later.sectionId === e.sectionId && later.itemId === e.itemId && later.field === e.field;
		}
		default:
			return false;
	}
}

function sectionName(p: Portfolio, id: string): string {
	const s = p.sections.find((x) => x.id === id);
	return s ? `"${s.title || SECTION_LABELS[s.type]}"` : 'a section';
}

/** Short human description, shown in the change review. `p` is the state before the op. */
export function describeOp(op: EditOp, p: Portfolio): string {
	switch (op.op) {
		case 'setTemplate':
			return `Switch template to ${op.template}`;
		case 'setLayout':
			return `Change hero layout to ${op.layout}`;
		case 'setTheme': {
			const parts = [op.mode && `${op.mode} mode`, op.accent && `accent ${op.accent}`, op.font && `${op.font} font`].filter(Boolean);
			return `Theme: ${parts.join(', ')}`;
		}
		case 'updateProfile':
			return `Update ${op.field === 'avatarUrl' ? 'photo link' : op.field}`;
		case 'addSection':
			return `Add ${op.section.title || SECTION_LABELS[op.section.type as SectionType]} section`;
		case 'removeSection':
			return `Remove ${sectionName(p, op.sectionId)} section`;
		case 'moveSection':
			return `Move ${sectionName(p, op.sectionId)} to position ${op.toIndex + 1}`;
		case 'updateSection':
			if (op.visible !== undefined && op.title === undefined) return `${op.visible ? 'Show' : 'Hide'} ${sectionName(p, op.sectionId)}`;
			return `Rename ${sectionName(p, op.sectionId)} to "${op.title}"`;
		case 'setSectionField':
			return `Edit ${op.field} in ${sectionName(p, op.sectionId)}`;
		case 'addItem':
			return `Add entry to ${sectionName(p, op.sectionId)}`;
		case 'updateItem':
			return `Edit ${op.field} of an entry in ${sectionName(p, op.sectionId)}`;
		case 'removeItem':
			return `Remove entry from ${sectionName(p, op.sectionId)}`;
		case 'moveItem':
			return `Reorder ${sectionName(p, op.sectionId)}`;
	}
}

