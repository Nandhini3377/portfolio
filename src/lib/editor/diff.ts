// Field-level diff between two portfolios, for the change review screen.
// Lists of objects with ids are matched by id so reorders and edits read clearly.

import { SECTION_LABELS } from '#lib/portfolio/defaults.ts';
import type { Portfolio, Section } from '#lib/portfolio/types.ts';

export type DiffKind = 'added' | 'removed' | 'changed' | 'moved';

export interface DiffEntry {
	kind: DiffKind;
	/** Human-readable location, e.g. "Projects › Trail Finder › description". */
	where: string;
	before?: string;
	after?: string;
}

type Json = unknown;

function show(value: Json): string {
	if (value === '' || value === undefined) return '(empty)';
	if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value.join(', ') || '(empty)';
	if (typeof value === 'object' && value !== null) return summarize(value as Record<string, Json>);
	return String(value);
}

function summarize(obj: Record<string, Json>): string {
	const name = obj.title ?? obj.name ?? obj.role ?? obj.institution ?? obj.label;
	return typeof name === 'string' && name ? name : 'entry';
}

function hasIds(list: Json[]): list is Array<{ id: string }> {
	return list.every((v) => typeof v === 'object' && v !== null && typeof (v as { id?: unknown }).id === 'string');
}

function walk(before: Json, after: Json, where: string[], out: DiffEntry[]) {
	if (JSON.stringify(before) === JSON.stringify(after)) return;
	const at = where.join(' › ');

	if (Array.isArray(before) && Array.isArray(after) && hasIds(before) && hasIds(after)) {
		const beforeIds = before.map((b) => b.id);
		const afterIds = after.map((a) => a.id);
		for (const b of before) if (!afterIds.includes(b.id)) out.push({ kind: 'removed', where: `${at} › ${show(b)}`, before: show(b) });
		for (const a of after) {
			const match = before.find((b) => b.id === a.id);
			if (!match) out.push({ kind: 'added', where: `${at} › ${show(a)}`, after: show(a) });
			else walk(match, a, [...where, show(a)], out);
		}
		const keptBefore = beforeIds.filter((id) => afterIds.includes(id));
		const keptAfter = afterIds.filter((id) => beforeIds.includes(id));
		if (keptBefore.join() !== keptAfter.join()) out.push({ kind: 'moved', where: at, before: keptBefore.length + ' entries', after: 'new order' });
		return;
	}

	const isObj = (v: Json) => typeof v === 'object' && v !== null && !Array.isArray(v);
	if (isObj(before) && isObj(after)) {
		const b = before as Record<string, Json>;
		const a = after as Record<string, Json>;
		for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
			if (key === 'id') continue;
			// Container keys add noise to labels ("Projects › items › …").
			walk(b[key], a[key], key === 'items' ? where : [...where, key], out);
		}
		return;
	}
	out.push({ kind: 'changed', where: at, before: show(before), after: show(after) });
}

function sectionLabel(s: Section) {
	return s.title || SECTION_LABELS[s.type];
}

export function diffPortfolios(before: Portfolio, after: Portfolio): DiffEntry[] {
	const out: DiffEntry[] = [];
	walk(before.template, after.template, ['Template'], out);
	walk(before.layout, after.layout, ['Layout'], out);
	walk(before.theme, after.theme, ['Theme'], out);
	walk(before.profile, after.profile, ['Profile'], out);

	const afterIds = after.sections.map((s) => s.id);
	const beforeIds = before.sections.map((s) => s.id);
	for (const s of before.sections) if (!afterIds.includes(s.id)) out.push({ kind: 'removed', where: `Section › ${sectionLabel(s)}`, before: sectionLabel(s) });
	for (const s of after.sections) {
		const match = before.sections.find((b) => b.id === s.id);
		if (!match) out.push({ kind: 'added', where: `Section › ${sectionLabel(s)}`, after: sectionLabel(s) });
		else {
			walk(match.title, s.title, [sectionLabel(s), 'title'], out);
			walk(match.visible, s.visible, [sectionLabel(s), 'visible'], out);
			walk(match.data, s.data, [sectionLabel(s)], out);
		}
	}
	const kept = (ids: string[], other: string[]) => ids.filter((id) => other.includes(id)).join();
	if (kept(beforeIds, afterIds) !== kept(afterIds, beforeIds)) out.push({ kind: 'moved', where: 'Section order', after: after.sections.map(sectionLabel).join(' → ') });
	return out;
}
