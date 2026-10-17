import { describe, expect, it } from 'vitest';
import { applyOp } from '#lib/editor/ops.ts';
import { starterPortfolio } from '#lib/portfolio/defaults.ts';
import { BENCH_CASES, benchAfter, benchStart, summarize } from './bench.ts';
import { buildMessages, describePortfolio } from './prompt.ts';
import { parseResponse, RESPONSE_SCHEMA, translate, type AiAction } from './protocol.ts';

const p = () => starterPortfolio('minimal');
const run = (actions: AiAction[]) => translate(p(), actions, applyOp);

describe('parseResponse', () => {
	it('accepts plain and fenced JSON', () => {
		expect(parseResponse('{"reply":"ok","actions":[]}')).toEqual({ ok: true, response: { reply: 'ok', actions: [] } });
		const fenced = parseResponse('Sure!\n```json\n{"reply":"x","actions":[{"action":"set_layout","layout":"split"}]}\n```');
		expect(fenced.ok && fenced.response.actions).toHaveLength(1);
	});

	it('rejects non-JSON and nameless actions', () => {
		expect(parseResponse('I changed it to dark mode').ok).toBe(false);
		expect(parseResponse('{"reply":"x","actions":[{"mode":"dark"}]').ok).toBe(false);
		expect(parseResponse('{"reply":"x","actions":[{"mode":"dark"}]}').ok).toBe(false);
	});
});

describe('translate', () => {
	it('resolves sections by type and items by name', () => {
		const r = run([
			{ action: 'hide_section', section: 'education' },
			{ action: 'update_item', section: 'projects', item: 'trail finder', field: 'url', value: 'https://t.app' },
			{ action: 'remove_item', section: 'contact', item: 'LinkedIn' }
		]);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.ops.map((o) => o.op)).toEqual(['updateSection', 'updateItem', 'removeItem']);
	});

	it('accepts common section aliases', () => {
		expect(run([{ action: 'move_section', section: 'About', position: 3 }]).ok).toBe(true);
		expect(run([{ action: 'hide_section', section: 'work' }]).ok).toBe(true);
	});

	it('lets later actions use what earlier ones created', () => {
		const r = run([
			{ action: 'remove_section', section: 'skills' },
			{ action: 'add_section', section: 'skills' },
			{ action: 'add_item', section: 'skills', item: { name: 'Data', skills: 'SQL, dbt , ' } }
		]);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		const last = r.ops[2];
		expect(last.op === 'addItem' && last.item.skills).toEqual(['SQL', 'dbt']);
	});

	it('clamps move positions into range', () => {
		const r = run([{ action: 'move_section', section: 'projects', position: 99 }]);
		expect(r.ok && r.ops[0]).toMatchObject({ op: 'moveSection', toIndex: 5 });
	});

	it('fails with a clear message and no partial result', () => {
		const cases: [AiAction[], RegExp][] = [
			[[{ action: 'hide_section', section: 'blog' }], /not a section type/],
			[[{ action: 'remove_item', section: 'projects', item: 'Nope' }], /No entry called "Nope"/],
			[[{ action: 'add_item', section: 'contact', item: { label: 'X', url: 'javascript:alert(1)' } }], /Step 1/],
			[[{ action: 'add_item', section: 'projects', item: { salary: '1M' } }], /no "salary" field/],
			[[{ action: 'add_section', section: 'projects' }], /already a projects section/],
			[[{ action: 'set_theme', accent: 'purple' }], /colour/],
			[[{ action: 'dance' } as unknown as AiAction], /Unknown action/]
		];
		for (const [actions, message] of cases) {
			const r = run(actions);
			expect(r.ok, JSON.stringify(actions)).toBe(false);
			if (!r.ok) expect(r.error).toMatch(message);
		}
	});

	it('reports ambiguous item names', () => {
		const r = translate(p(), [{ action: 'remove_item', section: 'projects', item: 'd' }], applyOp);
		expect(!r.ok && r.error).toMatch(/More than one/);
	});
});

describe('prompt', () => {
	it('summarizes the portfolio compactly with names the model can use', () => {
		const text = describePortfolio(p());
		expect(text).toContain('projects titled "Projects"');
		expect(text).toContain('"Trail Finder"');
		expect(text.length).toBeLessThan(1500);
	});

	it('keeps only recent history', () => {
		const history = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `turn ${i}` }));
		const messages = buildMessages(p(), 'hi', history);
		expect(messages.filter((m) => m.content.startsWith('turn'))).toHaveLength(4);
		expect(messages.at(-1)!.content).toContain('Request: hi');
	});

	it('schema is serializable for the runtime', () => {
		expect(() => JSON.parse(JSON.stringify(RESPONSE_SCHEMA))).not.toThrow();
	});
});

// A perfect model's answers. Proves each bench check is satisfiable and that the
// translator handles every case the way we expect a model to phrase it.
const IDEAL: Record<string, AiAction[]> = {
	dark: [{ action: 'set_theme', mode: 'dark' }],
	'accent-green': [{ action: 'set_theme', accent: '#16a34a' }],
	serif: [{ action: 'set_theme', font: 'serif' }],
	'dark-purple-mono': [{ action: 'set_theme', mode: 'dark', accent: '#7c3aed', font: 'mono' }],
	'template-bento': [{ action: 'set_template', template: 'bento' }],
	'template-magazine': [{ action: 'set_template', template: 'editorial' }],
	'layout-split': [{ action: 'set_layout', layout: 'split' }],
	name: [{ action: 'update_profile', field: 'name', value: 'Priya Sharma' }],
	headline: [{ action: 'update_profile', field: 'headline', value: 'Data engineer who loves clean pipelines' }],
	location: [{ action: 'update_profile', field: 'location', value: 'Chennai, India' }],
	'hide-edu': [{ action: 'hide_section', section: 'education' }],
	'remove-exp': [{ action: 'remove_section', section: 'experience' }],
	'projects-first': [{ action: 'move_section', section: 'projects', position: 1 }],
	'contact-second': [{ action: 'move_section', section: 'contact', position: 2 }],
	'rename-projects': [{ action: 'rename_section', section: 'projects', title: 'Selected Work' }],
	'hide-two': [
		{ action: 'hide_section', section: 'skills' },
		{ action: 'hide_section', section: 'education' }
	],
	'add-project': [{ action: 'add_item', section: 'projects', item: { name: 'Weather Bot', description: 'A Telegram bot that sends daily forecasts.', tags: ['Python'] } }],
	'add-github': [{ action: 'add_item', section: 'contact', item: { label: 'GitHub', url: 'https://github.com/priya-dev' } }],
	'add-two-links': [
		{ action: 'add_item', section: 'contact', item: { label: 'LinkedIn', url: 'https://linkedin.com/in/priya' } },
		{ action: 'add_item', section: 'contact', item: { label: 'Blog', url: 'https://priya.dev' } }
	],
	'remove-project': [{ action: 'remove_item', section: 'projects', item: 'Budget Buddy' }],
	'project-link': [{ action: 'update_item', section: 'projects', item: 'Trail Finder', field: 'url', value: 'https://trails.app' }],
	'add-skill': [{ action: 'update_item', section: 'skills', item: 'Languages', field: 'skills', value: ['TypeScript', 'Python', 'SQL', 'Rust'] }],
	'add-job': [{ action: 'add_item', section: 'experience', item: { role: 'Backend Intern', organization: 'Zoho', start: '2022', end: '2023' } }],
	'edit-role': [{ action: 'update_item', section: 'experience', item: 'Frontend Developer', field: 'role', value: 'Senior Frontend Developer' }],
	email: [{ action: 'set_text', section: 'contact', field: 'email', value: 'priya@example.com' }],
	intro: [{ action: 'set_text', section: 'intro', field: 'body', value: 'I build data tools that help small teams move fast.' }],
	'contact-msg': [{ action: 'set_text', section: 'contact', field: 'message', value: "Let's build something together." }],
	responsive: [],
	unclear: [],
	'out-of-scope': []
};

describe('bench', () => {
	it('has an ideal answer for every case and each one passes its check', () => {
		expect(Object.keys(IDEAL).sort()).toEqual(BENCH_CASES.map((c) => c.id).sort());
		for (const c of BENCH_CASES) {
			const t = translate(benchStart(), IDEAL[c.id], applyOp);
			expect(t.ok, c.id).toBe(true);
			if (!t.ok) continue;
			const after = benchAfter(t.ops)!;
			expect(c.check(after, t.ops), c.id).toBe(true);
		}
	});

	it('checks fail when nothing changes (no free passes)', () => {
		const passesUnchanged = BENCH_CASES.filter((c) => c.kind !== 'refuse' && c.check(benchStart(), []));
		expect(passesUnchanged.map((c) => c.id)).toEqual([]);
	});

	it('summarizes rows', () => {
		const s = summarize('m', 'd', [
			{ id: 'a', kind: 'theme', request: '', validJson: true, applied: true, correct: true, latencyS: 1, decodeTokensPerS: 20, reply: '' },
			{ id: 'b', kind: 'theme', request: '', validJson: true, applied: false, correct: false, latencyS: 3, decodeTokensPerS: 10, reply: '' }
		]);
		expect(s).toMatchObject({ cases: 2, validJson: 2, applied: 1, correct: 1, medianLatencyS: 2, avgDecodeTokensPerS: 15 });
	});
});
