import {
	FONTS,
	LAYOUTS,
	SCHEMA_VERSION,
	SECTION_TYPES,
	TEMPLATE_IDS,
	THEME_MODES,
	type Portfolio
} from './types';

/** Size limits keep documents small (they become model context in Phase 2). */
export const LIMITS = {
	shortText: 120,
	mediumText: 400,
	longText: 3000,
	url: 500,
	listItems: 40,
	tags: 20,
	sections: 12
} as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9-]{1,40}$/;

export function isSafeUrl(value: string, allowMailto = false): boolean {
	if (value === '') return true;
	if (value.length > LIMITS.url) return false;
	try {
		const url = new URL(value);
		if (url.protocol === 'https:' || url.protocol === 'http:') return true;
		return allowMailto && url.protocol === 'mailto:';
	} catch {
		return false;
	}
}

export function isEmail(value: string): boolean {
	return value === '' || (value.length <= LIMITS.shortText && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(value));
}

type Check = (cond: boolean, message: string) => void;

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(check: Check, obj: Record<string, unknown>, key: string, max: number, path: string) {
	const v = obj[key];
	check(typeof v === 'string', `${path}.${key} must be text`);
	if (typeof v === 'string') check(v.length <= max, `${path}.${key} is longer than ${max} characters`);
}

function url(check: Check, obj: Record<string, unknown>, key: string, path: string) {
	const v = obj[key];
	check(typeof v === 'string' && isSafeUrl(v, true), `${path}.${key} must be an http(s) or mailto link`);
}

function stringList(check: Check, obj: Record<string, unknown>, key: string, path: string) {
	const v = obj[key];
	check(Array.isArray(v), `${path}.${key} must be a list`);
	if (!Array.isArray(v)) return;
	check(v.length <= LIMITS.tags, `${path}.${key} has more than ${LIMITS.tags} entries`);
	v.forEach((s, i) =>
		check(typeof s === 'string' && s.length > 0 && s.length <= LIMITS.shortText, `${path}.${key}[${i}] must be short text`)
	);
}

type FieldSpec = Record<string, 'short' | 'medium' | 'long' | 'url' | 'list'>;

const ITEM_FIELDS: Record<string, FieldSpec> = {
	skills: { name: 'short', skills: 'list' },
	projects: { name: 'short', description: 'medium', tags: 'list', url: 'url', repoUrl: 'url' },
	experience: { role: 'short', organization: 'short', start: 'short', end: 'short', summary: 'long' },
	education: { institution: 'short', qualification: 'short', start: 'short', end: 'short', summary: 'medium' },
	contact: { label: 'short', url: 'url' }
};

function fields(check: Check, obj: Record<string, unknown>, spec: FieldSpec, path: string) {
	for (const [key, kind] of Object.entries(spec)) {
		if (kind === 'url') url(check, obj, key, path);
		else if (kind === 'list') stringList(check, obj, key, path);
		else text(check, obj, key, LIMITS[`${kind}Text`], path);
	}
	for (const key of Object.keys(obj)) {
		if (key !== 'id') check(key in spec, `${path} has unknown field "${key}"`);
	}
}

/** Returns a list of human-readable problems; empty means valid. */
export function validatePortfolio(value: unknown): string[] {
	const errors: string[] = [];
	const check: Check = (cond, message) => {
		if (!cond) errors.push(message);
	};

	if (!isObject(value)) return ['Portfolio must be an object'];
	const p = value;

	check(p.schemaVersion === SCHEMA_VERSION, `schemaVersion must be ${SCHEMA_VERSION}`);
	check(TEMPLATE_IDS.includes(p.template as never), `template must be one of ${TEMPLATE_IDS.join(', ')}`);
	check(LAYOUTS.includes(p.layout as never), `layout must be one of ${LAYOUTS.join(', ')}`);

	if (isObject(p.theme)) {
		check(THEME_MODES.includes(p.theme.mode as never), 'theme.mode must be light or dark');
		check(typeof p.theme.accent === 'string' && HEX.test(p.theme.accent), 'theme.accent must be a colour like #2563eb');
		check(FONTS.includes(p.theme.font as never), `theme.font must be one of ${FONTS.join(', ')}`);
	} else check(false, 'theme is missing');

	if (isObject(p.profile)) {
		fields(check, p.profile, { name: 'short', headline: 'medium', location: 'short', avatarUrl: 'url' }, 'profile');
		check(typeof p.profile.avatarUrl !== 'string' || !p.profile.avatarUrl.startsWith('mailto:'), 'profile.avatarUrl must be an image link');
	} else check(false, 'profile is missing');

	if (!Array.isArray(p.sections)) {
		check(false, 'sections must be a list');
		return errors;
	}
	check(p.sections.length <= LIMITS.sections, `No more than ${LIMITS.sections} sections`);

	const sectionIds = new Set<string>();
	const sectionTypes = new Set<string>();
	p.sections.forEach((s: unknown, i: number) => {
		const path = `sections[${i}]`;
		if (!isObject(s)) return check(false, `${path} must be an object`);
		check(typeof s.id === 'string' && ID.test(s.id), `${path}.id is invalid`);
		check(!sectionIds.has(s.id as string), `${path}.id is duplicated`);
		sectionIds.add(s.id as string);
		check(SECTION_TYPES.includes(s.type as never), `${path}.type is not a known section type`);
		check(!sectionTypes.has(s.type as string), `Only one ${String(s.type)} section is allowed`);
		sectionTypes.add(s.type as string);
		text(check, s, 'title', LIMITS.shortText, path);
		check(typeof s.visible === 'boolean', `${path}.visible must be true or false`);

		const data = s.data;
		if (!isObject(data)) return check(false, `${path}.data is missing`);
		const dpath = `${path}.data`;

		if (s.type === 'intro') {
			fields(check, data, { body: 'long' }, dpath);
			return;
		}
		if (s.type === 'contact') {
			check(typeof data.email === 'string' && isEmail(data.email), `${dpath}.email is not a valid email`);
			text(check, data, 'message', LIMITS.mediumText, dpath);
		}
		const spec = ITEM_FIELDS[s.type as string];
		if (!spec) return;
		const items = data.items;
		if (!Array.isArray(items)) return check(false, `${dpath}.items must be a list`);
		check(items.length <= LIMITS.listItems, `${dpath}.items has more than ${LIMITS.listItems} entries`);
		const itemIds = new Set<string>();
		items.forEach((item: unknown, j: number) => {
			const ipath = `${dpath}.items[${j}]`;
			if (!isObject(item)) return check(false, `${ipath} must be an object`);
			check(typeof item.id === 'string' && ID.test(item.id), `${ipath}.id is invalid`);
			check(!itemIds.has(item.id as string), `${ipath}.id is duplicated`);
			itemIds.add(item.id as string);
			fields(check, item, spec, ipath);
		});
		const allowed = s.type === 'contact' ? ['email', 'message', 'items'] : ['items'];
		for (const key of Object.keys(data)) check(allowed.includes(key), `${dpath} has unknown field "${key}"`);
	});

	for (const key of Object.keys(p)) {
		check(['schemaVersion', 'template', 'layout', 'theme', 'profile', 'sections'].includes(key), `Unknown field "${key}"`);
	}
	return errors;
}

export function assertPortfolio(value: unknown): asserts value is Portfolio {
	const errors = validatePortfolio(value);
	if (errors.length) throw new Error(errors.join('\n'));
}
