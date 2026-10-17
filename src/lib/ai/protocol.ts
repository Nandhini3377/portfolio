// The contract between the local model and the editing engine.
//
// Small models are far more reliable with a flat vocabulary that names things the
// way users do ("the projects section", "the Trail Finder project") than with
// internal ids. The model emits `AiAction`s; `translate()` resolves names to ids,
// fills defaults and produces typed `EditOp`s, which the engine then validates.

import type { EditOp, ItemValue } from '#lib/editor/ops.ts';
import { emptyItem, emptySection, newId } from '#lib/portfolio/defaults.ts';
import {
	FONTS,
	LAYOUTS,
	SECTION_TYPES,
	TEMPLATE_IDS,
	THEME_MODES,
	type ListSectionType,
	type Portfolio,
	type Section,
	type SectionType
} from '#lib/portfolio/types.ts';

export const PROFILE_FIELDS = ['name', 'headline', 'location', 'avatarUrl'] as const;
export const TEXT_FIELDS = ['body', 'message', 'email'] as const;

/** Every field any list item can have. */
export const ITEM_FIELDS = {
	skills: ['name', 'skills'],
	projects: ['name', 'description', 'tags', 'url', 'repoUrl'],
	experience: ['role', 'organization', 'start', 'end', 'summary'],
	education: ['institution', 'qualification', 'start', 'end', 'summary'],
	contact: ['label', 'url']
} as const satisfies Record<ListSectionType, readonly string[]>;

/** Which field identifies an item when the user refers to it by name. */
export const ITEM_TITLE: Record<ListSectionType, string> = {
	skills: 'name',
	projects: 'name',
	experience: 'role',
	education: 'institution',
	contact: 'label'
};

const ALL_ITEM_FIELDS = [...new Set(Object.values(ITEM_FIELDS).flat())];
const LIST_TYPES = Object.keys(ITEM_FIELDS) as ListSectionType[];

export type AiAction =
	| { action: 'set_theme'; mode?: string; accent?: string; font?: string }
	| { action: 'set_template'; template: string }
	| { action: 'set_layout'; layout: string }
	| { action: 'update_profile'; field: string; value: string }
	| { action: 'add_section'; section: string }
	| { action: 'remove_section'; section: string }
	| { action: 'show_section'; section: string }
	| { action: 'hide_section'; section: string }
	| { action: 'move_section'; section: string; position: number }
	| { action: 'rename_section'; section: string; title: string }
	| { action: 'set_text'; section: string; field: string; value: string }
	| { action: 'add_item'; section: string; item: Record<string, ItemValue> }
	| { action: 'update_item'; section: string; item: string; field: string; value: ItemValue }
	| { action: 'remove_item'; section: string; item: string };

export interface AiResponse {
	/** A clarifying question from the model ("ask"); empty when it just made changes. */
	reply: string;
	actions: AiAction[];
}

// ---------- JSON schema used for constrained decoding ----------

const str = { type: 'string' };
const strOrList = { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] };
const enumOf = (values: readonly string[]) => ({ type: 'string', enum: [...values] });
const sectionRef = enumOf(SECTION_TYPES);

function actionSchema(name: string, props: Record<string, unknown>, required: string[]) {
	return {
		type: 'object',
		properties: { action: { const: name }, ...props },
		required: ['action', ...required],
		additionalProperties: false
	};
}

export const RESPONSE_SCHEMA = {
	type: 'object',
	// Actions come first and there is no free-text summary: on slow GPUs every
	// generated token costs ~0.2 s, and the app describes the changes itself.
	properties: {
		actions: {
			type: 'array',
			maxItems: 5,
			items: {
				anyOf: [
					actionSchema('set_theme', { mode: enumOf(THEME_MODES), accent: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }, font: enumOf(FONTS) }, []),
					actionSchema('set_template', { template: enumOf(TEMPLATE_IDS) }, ['template']),
					actionSchema('set_layout', { layout: enumOf(LAYOUTS) }, ['layout']),
					actionSchema('update_profile', { field: enumOf(PROFILE_FIELDS), value: str }, ['field', 'value']),
					actionSchema('add_section', { section: sectionRef }, ['section']),
					actionSchema('remove_section', { section: sectionRef }, ['section']),
					actionSchema('show_section', { section: sectionRef }, ['section']),
					actionSchema('hide_section', { section: sectionRef }, ['section']),
					actionSchema('move_section', { section: sectionRef, position: { type: 'integer', minimum: 1, maximum: 12 } }, ['section', 'position']),
					actionSchema('rename_section', { section: sectionRef, title: str }, ['section', 'title']),
					actionSchema('set_text', { section: enumOf(['intro', 'contact']), field: enumOf(TEXT_FIELDS), value: str }, ['section', 'field', 'value']),
					actionSchema(
						'add_item',
						{
							section: enumOf(LIST_TYPES),
							item: { type: 'object', properties: Object.fromEntries(ALL_ITEM_FIELDS.map((f) => [f, strOrList])), additionalProperties: false }
						},
						['section', 'item']
					),
					actionSchema('update_item', { section: enumOf(LIST_TYPES), item: str, field: enumOf(ALL_ITEM_FIELDS), value: strOrList }, ['section', 'item', 'field', 'value']),
					actionSchema('remove_item', { section: enumOf(LIST_TYPES), item: str }, ['section', 'item'])
				]
			}
		},
		ask: str
	},
	required: ['actions'],
	additionalProperties: false
} as const;

// ---------- Parsing ----------

export type ParseResult = { ok: true; response: AiResponse } | { ok: false; error: string };

/** Parses raw model text. Tolerates code fences and leading chatter. */
export function parseResponse(raw: string): ParseResult {
	const start = raw.indexOf('{');
	const end = raw.lastIndexOf('}');
	if (start < 0 || end <= start) return { ok: false, error: 'The model did not return JSON.' };
	let data: unknown;
	try {
		data = JSON.parse(raw.slice(start, end + 1));
	} catch {
		return { ok: false, error: 'The model returned malformed JSON.' };
	}
	const d = data as Partial<AiResponse>;
	if (typeof d !== 'object' || d === null) return { ok: false, error: 'The model response was not an object.' };
	const ask = (d as { ask?: unknown }).ask ?? d.reply;
	const reply = typeof ask === 'string' ? ask.trim() : '';
	const actions = Array.isArray(d.actions) ? d.actions : [];
	if (!actions.every((a) => typeof a === 'object' && a !== null && typeof (a as { action?: unknown }).action === 'string'))
		return { ok: false, error: 'The model returned an action without a name.' };
	return { ok: true, response: { reply, actions: actions as AiAction[] } };
}

// ---------- Guardrails ----------
//
// Small models tend to "help" beyond the request: switching to dark mode when
// asked for cards, or inventing a GitHub URL. These checks remove what the user
// clearly didn't ask for before anything reaches the review screen.

const THEME_WORDS = {
	mode: /\b(dark|light|night|mode|theme)\b/i,
	accent: /colou?r|accent|red|orange|yellow|green|blue|purple|violet|pink|teal|lime|black|brand/i,
	font: /font|serif|mono|typeface|typography|lettering/i
};
const URL_FIELDS = new Set(['url', 'repoUrl', 'avatarUrl', 'email']);

export interface GuardResult {
	actions: AiAction[];
	/** Human-readable notes about what was removed. */
	dropped: string[];
}

export function guard(actions: AiAction[], request: string, p: Portfolio): GuardResult {
	const known = `${request}\n${JSON.stringify(p)}`.toLowerCase();
	const invented = (v: unknown) => typeof v === 'string' && v.trim() !== '' && !known.includes(v.trim().toLowerCase().replace(/^mailto:/, ''));
	const dropped: string[] = [];
	const kept: AiAction[] = [];

	for (const a of actions) {
		if (a.action === 'set_theme') {
			const next = { ...a };
			for (const key of ['mode', 'accent', 'font'] as const) {
				if (next[key] !== undefined && !THEME_WORDS[key].test(request)) {
					delete next[key];
					dropped.push(`unrequested ${key} change`);
				}
			}
			if (next.mode !== undefined || next.accent !== undefined || next.font !== undefined) kept.push(next);
			continue;
		}
		if (a.action === 'add_section' && p.sections.some((s) => s.type === String(a.section).toLowerCase())) continue;
		if ((a.action === 'update_profile' || a.action === 'update_item' || a.action === 'set_text') && URL_FIELDS.has(a.field) && invented(a.value)) {
			dropped.push(`a ${a.field} that wasn't in your message`);
			continue;
		}
		if (a.action === 'add_item' && a.item && typeof a.item === 'object') {
			const item = { ...a.item };
			for (const f of ['url', 'repoUrl']) {
				if (invented(item[f])) {
					delete item[f];
					dropped.push(`a ${f === 'repoUrl' ? 'source' : ''} link that wasn't in your message`.replace('  ', ' '));
				}
			}
			kept.push({ ...a, item });
			continue;
		}
		kept.push(a);
	}
	return { actions: kept, dropped };
}

// ---------- Translation ----------

export type TranslateResult = { ok: true; ops: EditOp[] } | { ok: false; error: string };

class TranslateError extends Error {}
const fail = (m: string): never => {
	throw new TranslateError(m);
};

function sectionType(name: unknown): SectionType {
	const n = String(name ?? '').toLowerCase().trim();
	const aliases: Record<string, SectionType> = { about: 'intro', introduction: 'intro', bio: 'intro', work: 'experience', jobs: 'experience', links: 'contact', socials: 'contact', social: 'contact' };
	const type = (SECTION_TYPES as readonly string[]).includes(n) ? (n as SectionType) : aliases[n];
	return type ?? fail(`"${n}" is not a section type`);
}

function findSection(p: Portfolio, name: unknown): Section {
	const type = sectionType(name);
	return p.sections.find((s) => s.type === type) ?? fail(`There is no ${type} section yet`);
}

function listSection(p: Portfolio, name: unknown): Section & { type: ListSectionType } {
	const s = findSection(p, name);
	if (s.type === 'intro') fail('The intro section has no list of entries');
	return s as Section & { type: ListSectionType };
}

function findItem(section: Section & { type: ListSectionType }, name: unknown): { id: string } & Record<string, unknown> {
	const items = (section.data as unknown as { items: Array<{ id: string } & Record<string, unknown>> }).items;
	const key = ITEM_TITLE[section.type];
	const wanted = String(name ?? '').toLowerCase().trim();
	const exact = items.filter((i) => String(i[key]).toLowerCase() === wanted || i.id === wanted);
	if (exact.length === 1) return exact[0];
	const partial = items.filter((i) => wanted && String(i[key]).toLowerCase().includes(wanted));
	if (partial.length === 1) return partial[0];
	if (exact.length + partial.length > 1) return fail(`More than one entry matches "${name}"`);
	return fail(`No entry called "${name}" in ${section.title}`);
}

function normalizeValue(field: string, value: unknown): ItemValue {
	const listField = field === 'tags' || field === 'skills';
	if (listField) {
		const list = Array.isArray(value) ? value : String(value ?? '').split(',');
		return list.map((v) => String(v).trim()).filter(Boolean);
	}
	return Array.isArray(value) ? value.join(', ') : String(value ?? '');
}

function one(p: Portfolio, a: AiAction): EditOp {
	switch (a.action) {
		case 'set_theme': {
			const op: EditOp = { op: 'setTheme' };
			if (a.mode !== undefined) op.mode = a.mode as never;
			if (a.accent !== undefined) op.accent = a.accent.toLowerCase();
			if (a.font !== undefined) op.font = a.font as never;
			return op;
		}
		case 'set_template':
			return { op: 'setTemplate', template: a.template as never };
		case 'set_layout':
			return { op: 'setLayout', layout: a.layout as never };
		case 'update_profile':
			if (!(PROFILE_FIELDS as readonly string[]).includes(a.field)) fail(`Unknown profile field "${a.field}"`);
			return { op: 'updateProfile', field: a.field as never, value: String(a.value ?? '') };
		case 'add_section': {
			const type = sectionType(a.section);
			if (p.sections.some((s) => s.type === type)) fail(`There is already a ${type} section`);
			return { op: 'addSection', section: emptySection(type) };
		}
		case 'remove_section':
			return { op: 'removeSection', sectionId: findSection(p, a.section).id };
		case 'show_section':
		case 'hide_section':
			return { op: 'updateSection', sectionId: findSection(p, a.section).id, visible: a.action === 'show_section' };
		case 'move_section': {
			const position = Math.round(Number(a.position));
			const toIndex = Math.min(Math.max(position, 1), p.sections.length) - 1;
			return { op: 'moveSection', sectionId: findSection(p, a.section).id, toIndex };
		}
		case 'rename_section':
			return { op: 'updateSection', sectionId: findSection(p, a.section).id, title: String(a.title ?? '') };
		case 'set_text': {
			if (!(TEXT_FIELDS as readonly string[]).includes(a.field)) fail(`Unknown text field "${a.field}"`);
			return { op: 'setSectionField', sectionId: findSection(p, a.section).id, field: a.field as never, value: String(a.value ?? '') };
		}
		case 'add_item': {
			const s = listSection(p, a.section);
			const item = emptyItem(s.type) as unknown as { id: string } & Record<string, ItemValue>;
			const allowed = ITEM_FIELDS[s.type] as readonly string[];
			for (const [k, v] of Object.entries(a.item ?? {})) {
				if (!allowed.includes(k)) fail(`${s.title} entries have no "${k}" field`);
				item[k] = normalizeValue(k, v);
			}
			item.id = newId(s.type === 'contact' ? 'link' : s.type.slice(0, 7));
			return { op: 'addItem', sectionId: s.id, item };
		}
		case 'update_item': {
			const s = listSection(p, a.section);
			const item = findItem(s, a.item);
			if (!(ITEM_FIELDS[s.type] as readonly string[]).includes(a.field)) fail(`${s.title} entries have no "${a.field}" field`);
			return { op: 'updateItem', sectionId: s.id, itemId: item.id, field: a.field, value: normalizeValue(a.field, a.value) };
		}
		case 'remove_item': {
			const s = listSection(p, a.section);
			return { op: 'removeItem', sectionId: s.id, itemId: findItem(s, a.item).id };
		}
		default:
			return fail(`Unknown action "${(a as { action: string }).action}"`);
	}
}

/**
 * Translates actions in order against an evolving portfolio, so later actions can
 * refer to things earlier ones created ("add a projects section, then add X to it").
 * `apply` is the engine's applyOp, injected to keep this module free of UI state.
 */
export function translate(
	p: Portfolio,
	actions: AiAction[],
	apply: (p: Portfolio, op: EditOp) => { ok: true; portfolio: Portfolio } | { ok: false; error: string }
): TranslateResult {
	const ops: EditOp[] = [];
	let current = p;
	try {
		for (const [i, a] of actions.entries()) {
			const op = one(current, a);
			const result = apply(current, op);
			if (!result.ok) fail(`Step ${i + 1} (${a.action}): ${result.error}`);
			// Skip actions that change nothing (models often restate current values).
			else if (JSON.stringify(result.portfolio) !== JSON.stringify(current)) {
				current = result.portfolio;
				ops.push(op);
			}
		}
	} catch (e) {
		if (e instanceof TranslateError) return { ok: false, error: e.message };
		throw e;
	}
	return { ok: true, ops };
}
