import { describe, expect, it } from 'vitest';
import { emptySection, starterPortfolio } from '#lib/portfolio/defaults';
import { TEMPLATE_IDS } from '#lib/portfolio/types';
import { validatePortfolio } from '#lib/portfolio/validate';
import { renderPortfolio } from '#lib/render';
import { diffPortfolios } from './diff';
import { applyOp, applyOps, type EditOp } from './ops';
import { approve, createProject, proposed, redo, reject, repair, stage, stageAll, undo, unstage } from './project';

const base = () => starterPortfolio('minimal');

describe('schema', () => {
	it('accepts every starter template', () => {
		for (const t of TEMPLATE_IDS) expect(validatePortfolio(starterPortfolio(t))).toEqual([]);
	});

	it('rejects unsafe links, bad colours and unknown fields', () => {
		const p = base() as unknown as Record<string, any>;
		p.profile.avatarUrl = 'javascript:alert(1)';
		p.theme.accent = 'red';
		p.extra = true;
		const errors = validatePortfolio(p);
		expect(errors.some((e) => e.includes('avatarUrl'))).toBe(true);
		expect(errors.some((e) => e.includes('accent'))).toBe(true);
		expect(errors.some((e) => e.includes('extra'))).toBe(true);
	});

	it('rejects duplicate section types', () => {
		const p = base();
		p.sections.push(emptySection('skills'));
		expect(validatePortfolio(p)).toContain('Only one skills section is allowed');
	});
});

describe('operations', () => {
	it('never mutates the input', () => {
		const p = base();
		const before = JSON.stringify(p);
		applyOp(p, { op: 'setTheme', mode: 'dark' });
		expect(JSON.stringify(p)).toBe(before);
	});

	it('applies theme, profile and section changes', () => {
		const result = applyOps(base(), [
			{ op: 'setTheme', mode: 'dark', accent: '#ff0066' },
			{ op: 'updateProfile', field: 'name', value: 'Sam Lee' },
			{ op: 'moveSection', sectionId: 'contact', toIndex: 0 },
			{ op: 'updateSection', sectionId: 'education', visible: false }
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.portfolio.theme).toMatchObject({ mode: 'dark', accent: '#ff0066' });
		expect(result.portfolio.profile.name).toBe('Sam Lee');
		expect(result.portfolio.sections[0].id).toBe('contact');
		expect(result.portfolio.sections.find((s) => s.id === 'education')?.visible).toBe(false);
	});

	it('adds, edits, moves and removes list items', () => {
		const item = { id: 'p3', name: 'Third', description: '', tags: ['Go'], url: '', repoUrl: '' };
		const result = applyOps(base(), [
			{ op: 'addItem', sectionId: 'projects', item, index: 0 },
			{ op: 'updateItem', sectionId: 'projects', itemId: 'p3', field: 'tags', value: ['Go', 'gRPC'] },
			{ op: 'moveItem', sectionId: 'projects', itemId: 'p3', toIndex: 2 },
			{ op: 'removeItem', sectionId: 'projects', itemId: 'project-one' }
		]);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const projects = result.portfolio.sections.find((s) => s.type === 'projects')!.data as { items: { id: string; tags: string[] }[] };
		expect(projects.items.map((i) => i.id)).toEqual(['project-two', 'p3']);
		expect(projects.items[1].tags).toEqual(['Go', 'gRPC']);
	});

	it('rejects invalid operations with a readable error', () => {
		const cases: EditOp[] = [
			{ op: 'removeSection', sectionId: 'nope' },
			{ op: 'setTheme', accent: 'blue' },
			{ op: 'updateItem', sectionId: 'projects', itemId: 'project-one', field: 'url', value: 'javascript:x' },
			{ op: 'updateItem', sectionId: 'projects', itemId: 'project-one', field: 'secret', value: 'x' },
			{ op: 'moveSection', sectionId: 'intro', toIndex: 99 },
			{ op: 'addSection', section: emptySection('skills') },
			{ op: 'bogus' } as unknown as EditOp
		];
		for (const op of cases) {
			const r = applyOp(base(), op);
			expect(r.ok, JSON.stringify(op)).toBe(false);
			if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
		}
	});
});

describe('project state', () => {
	const fresh = () => createProject('p', 'Test', base());

	it('stages without touching committed, approves into history', () => {
		let s = fresh();
		const staged = stage(s, { op: 'setTheme', mode: 'dark' });
		expect(staged.ok).toBe(true);
		s = staged.state;
		expect(s.committed.theme.mode).toBe('light');
		expect(proposed(s).theme.mode).toBe('dark');
		const approved = approve(s);
		expect(approved.ok).toBe(true);
		s = approved.state;
		expect(s.committed.theme.mode).toBe('dark');
		expect(s.pending).toEqual([]);
		expect(s.past).toHaveLength(1);
	});

	it('coalesces repeated edits of the same field', () => {
		let s = fresh();
		for (const v of ['S', 'Sa', 'Sam']) s = stage(s, { op: 'updateProfile', field: 'name', value: v }).state;
		expect(s.pending).toHaveLength(1);
	});

	it('rejects invalid ops and leaves state unchanged', () => {
		const s = fresh();
		const r = stage(s, { op: 'removeSection', sectionId: 'missing' });
		expect(r.ok).toBe(false);
		expect(r.state).toBe(s);
	});

	it('stageAll is atomic', () => {
		const r = stageAll(fresh(), [
			{ op: 'setTheme', mode: 'dark' },
			{ op: 'removeSection', sectionId: 'missing' }
		]);
		expect(r.ok).toBe(false);
		expect(r.state.pending).toEqual([]);
	});

	it('unstage refuses to break dependent ops', () => {
		const item = { id: 'link-x', label: 'X', url: 'https://x.com' };
		let s = stage(fresh(), { op: 'addItem', sectionId: 'contact', item }).state;
		s = stage(s, { op: 'updateItem', sectionId: 'contact', itemId: 'link-x', field: 'label', value: 'Twitter' }).state;
		expect(unstage(s, 0).ok).toBe(false);
		expect(unstage(s, 1).ok).toBe(true);
	});

	it('reject, undo and redo', () => {
		let s = approve(stage(fresh(), { op: 'setTheme', mode: 'dark' }).state).state;
		s = stage(s, { op: 'setLayout', layout: 'split' }).state;
		expect(reject(s).pending).toEqual([]);
		s = undo(s); // drops pending first
		expect(s.pending).toEqual([]);
		expect(s.committed.theme.mode).toBe('dark');
		s = undo(s);
		expect(s.committed.theme.mode).toBe('light');
		s = redo(s);
		expect(s.committed.theme.mode).toBe('dark');
	});

	it('repair drops pending ops that no longer apply', () => {
		const s = { ...fresh(), pending: [{ op: 'setTheme', mode: 'dark' }, { op: 'removeSection', sectionId: 'gone' }] as EditOp[] };
		const { state, dropped } = repair(s);
		expect(dropped).toBe(1);
		expect(state.pending).toHaveLength(1);
	});
});

describe('diff', () => {
	it('describes changes, additions and moves', () => {
		const before = base();
		const r = applyOps(before, [
			{ op: 'updateProfile', field: 'name', value: 'Sam' },
			{ op: 'moveSection', sectionId: 'contact', toIndex: 0 },
			{ op: 'removeItem', sectionId: 'projects', itemId: 'project-one' }
		]);
		if (!r.ok) throw new Error(r.error);
		const d = diffPortfolios(before, r.portfolio);
		expect(d).toContainEqual({ kind: 'changed', where: 'Profile › name', before: 'Alex Morgan', after: 'Sam' });
		expect(d.some((e) => e.kind === 'moved' && e.where === 'Section order')).toBe(true);
		expect(d.some((e) => e.kind === 'removed' && e.before === 'Trail Finder')).toBe(true);
	});
});

describe('render', () => {
	it('escapes user text and drops unsafe links', () => {
		const p = base();
		p.profile.name = '<script>alert(1)</script>';
		const projects = p.sections.find((s) => s.type === 'projects')!;
		(projects.data as { items: { url: string }[] }).items[0].url = 'javascript:alert(1)';
		const html = renderPortfolio(p);
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('javascript:');
	});

	it('renders every template and hides hidden sections', () => {
		for (const t of TEMPLATE_IDS) {
			const p = starterPortfolio(t);
			p.sections.find((s) => s.id === 'education')!.visible = false;
			const html = renderPortfolio(p);
			expect(html).toContain('Alex Morgan');
			expect(html).not.toContain('State University');
		}
	});
});
