// Benchmark: realistic requests, each with a check on the resulting portfolio.
// Every case starts from the Minimal starter portfolio. Used by /model/bench to
// compare candidate models on this device (PRD §5.4, §15).

import { applyOps, type EditOp } from '#lib/editor/ops.ts';
import { starterPortfolio } from '#lib/portfolio/defaults.ts';
import type { Portfolio, SectionType } from '#lib/portfolio/types.ts';

export interface BenchCase {
	id: string;
	request: string;
	/** Category, for the summary table. */
	kind: 'theme' | 'profile' | 'sections' | 'items' | 'text' | 'refuse';
	/** Return true when the after-state is what the user asked for. */
	check: (after: Portfolio, ops: EditOp[]) => boolean;
}

const sec = (p: Portfolio, t: SectionType) => p.sections.find((s) => s.type === t);
const items = (p: Portfolio, t: SectionType) => ((sec(p, t)?.data as { items?: Record<string, unknown>[] })?.items ?? []) as Record<string, unknown>[];
const order = (p: Portfolio) => p.sections.map((s) => s.type);
const has = (v: unknown, needle: string) => String(v).toLowerCase().includes(needle.toLowerCase());

export const BENCH_CASES: BenchCase[] = [
	{ id: 'dark', kind: 'theme', request: 'Change the theme to dark mode.', check: (p) => p.theme.mode === 'dark' },
	{
		id: 'accent-green',
		kind: 'theme',
		request: 'Make the accent colour green.',
		check: (p) => {
			const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.theme.accent.slice(i, i + 2), 16));
			return g > r && g > b;
		}
	},
	{ id: 'serif', kind: 'theme', request: 'Use a serif font', check: (p) => p.theme.font === 'serif' },
	{ id: 'dark-purple-mono', kind: 'theme', request: 'dark mode, purple accent and a monospace font please', check: (p) => p.theme.mode === 'dark' && p.theme.font === 'mono' && p.theme.accent !== '#2563eb' },
	{ id: 'template-bento', kind: 'theme', request: 'Switch to the bento template', check: (p) => p.template === 'bento' },
	{ id: 'template-magazine', kind: 'theme', request: 'I want a magazine style look', check: (p) => p.template === 'editorial' },
	{ id: 'layout-split', kind: 'theme', request: 'Put my photo next to my name instead of above it', check: (p) => p.layout === 'split' },
	{ id: 'name', kind: 'profile', request: 'My name is Priya Sharma', check: (p) => p.profile.name === 'Priya Sharma' },
	{ id: 'headline', kind: 'profile', request: 'Change my headline to "Data engineer who loves clean pipelines"', check: (p) => p.profile.headline === 'Data engineer who loves clean pipelines' },
	{ id: 'location', kind: 'profile', request: 'I live in Chennai, India', check: (p) => has(p.profile.location, 'Chennai') },
	{ id: 'hide-edu', kind: 'sections', request: 'Hide the education section', check: (p) => sec(p, 'education')?.visible === false },
	{ id: 'remove-exp', kind: 'sections', request: 'Remove the experience section completely', check: (p) => !sec(p, 'experience') },
	{ id: 'projects-first', kind: 'sections', request: 'Move projects to the top', check: (p) => order(p)[0] === 'projects' },
	{ id: 'contact-second', kind: 'sections', request: 'Show contact right after the about section', check: (p) => order(p).indexOf('contact') === order(p).indexOf('intro') + 1 },
	{ id: 'rename-projects', kind: 'sections', request: 'Rename the projects section to "Selected Work"', check: (p) => sec(p, 'projects')?.title === 'Selected Work' },
	{ id: 'hide-two', kind: 'sections', request: 'Hide skills and education', check: (p) => sec(p, 'skills')?.visible === false && sec(p, 'education')?.visible === false },
	{
		id: 'add-project',
		kind: 'items',
		request: 'Add a project called Weather Bot: a Telegram bot that sends daily forecasts, built with Python.',
		check: (p) => items(p, 'projects').some((i) => i.name === 'Weather Bot' && has(i.description, 'telegram'))
	},
	{ id: 'add-github', kind: 'items', request: 'Add my GitHub: https://github.com/priya-dev', check: (p) => items(p, 'contact').some((i) => i.url === 'https://github.com/priya-dev') },
	{
		id: 'add-two-links',
		kind: 'items',
		request: 'Add links to my LinkedIn https://linkedin.com/in/priya and my blog https://priya.dev',
		check: (p) => ['https://linkedin.com/in/priya', 'https://priya.dev'].every((u) => items(p, 'contact').some((i) => i.url === u))
	},
	{ id: 'remove-project', kind: 'items', request: 'Delete the Budget Buddy project', check: (p) => !items(p, 'projects').some((i) => i.name === 'Budget Buddy') && items(p, 'projects').length === 1 },
	{ id: 'project-link', kind: 'items', request: 'The Trail Finder live link is https://trails.app', check: (p) => items(p, 'projects').find((i) => i.name === 'Trail Finder')?.url === 'https://trails.app' },
	{
		id: 'add-skill',
		kind: 'items',
		request: 'Add Rust to my languages',
		check: (p) => {
			const g = items(p, 'skills').find((i) => i.name === 'Languages');
			return Array.isArray(g?.skills) && (g.skills as string[]).includes('Rust') && (g.skills as string[]).includes('TypeScript');
		}
	},
	{
		id: 'add-job',
		kind: 'items',
		request: 'Add a job: Backend Intern at Zoho from 2022 to 2023',
		check: (p) => items(p, 'experience').some((i) => has(i.role, 'backend') && has(i.organization, 'zoho') && i.start === '2022' && i.end === '2023')
	},
	{ id: 'edit-role', kind: 'items', request: 'Change my Frontend Developer role to Senior Frontend Developer', check: (p) => items(p, 'experience').some((i) => i.role === 'Senior Frontend Developer') },
	{ id: 'email', kind: 'text', request: 'My email is priya@example.com', check: (p) => (sec(p, 'contact')?.data as { email: string }).email === 'priya@example.com' },
	{
		id: 'intro',
		kind: 'text',
		request: 'Update my introduction to: "I build data tools that help small teams move fast."',
		check: (p) => has((sec(p, 'intro')?.data as { body: string }).body, 'help small teams move fast')
	},
	{ id: 'contact-msg', kind: 'text', request: 'Set the contact message to "Let\'s build something together."', check: (p) => has((sec(p, 'contact')?.data as { message: string }).message, 'build something together') },
	{ id: 'responsive', kind: 'refuse', request: 'Make the portfolio responsive', check: (_p, ops) => ops.length === 0 },
	{ id: 'unclear', kind: 'refuse', request: 'make it better', check: (_p, ops) => ops.length === 0 },
	{ id: 'out-of-scope', kind: 'refuse', request: 'Add a login system with a database', check: (_p, ops) => ops.length === 0 }
];

export function benchStart(): Portfolio {
	return starterPortfolio('minimal');
}

/** Applies ops to the start state; used by the runner and tests. */
export function benchAfter(ops: EditOp[]): Portfolio | null {
	const r = applyOps(benchStart(), ops);
	return r.ok ? r.portfolio : null;
}

export interface BenchRow {
	id: string;
	kind: BenchCase['kind'];
	request: string;
	/** Model output parsed as JSON in the expected shape. */
	validJson: boolean;
	/** Actions translated and applied cleanly. */
	applied: boolean;
	correct: boolean;
	latencyS: number;
	decodeTokensPerS: number;
	reply: string;
	error?: string;
	raw?: string;
}

export interface BenchSummary {
	model: string;
	device: string;
	date: string;
	cases: number;
	validJson: number;
	applied: number;
	correct: number;
	medianLatencyS: number;
	avgDecodeTokensPerS: number;
	rows: BenchRow[];
}

export function summarize(model: string, device: string, rows: BenchRow[]): BenchSummary {
	const lat = rows.map((r) => r.latencyS).sort((a, b) => a - b);
	const median = lat.length ? (lat.length % 2 ? lat[(lat.length - 1) / 2] : (lat[lat.length / 2 - 1] + lat[lat.length / 2]) / 2) : 0;
	const tps = rows.filter((r) => r.decodeTokensPerS > 0);
	return {
		model,
		device,
		date: new Date().toISOString(),
		cases: rows.length,
		validJson: rows.filter((r) => r.validJson).length,
		applied: rows.filter((r) => r.applied).length,
		correct: rows.filter((r) => r.correct).length,
		medianLatencyS: median,
		avgDecodeTokensPerS: tps.length ? tps.reduce((s, r) => s + r.decodeTokensPerS, 0) / tps.length : 0,
		rows
	};
}
