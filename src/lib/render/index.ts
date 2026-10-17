import type { Portfolio, TemplateId } from '../portfolio/types';
import { BASE_CSS, themeVars } from './base';
import { bento } from './templates/bento';
import { editorial } from './templates/editorial';
import { minimal } from './templates/minimal';
import type { Template } from './templates/types';
import { esc } from './util';

export const TEMPLATES: Record<TemplateId, Template> = { minimal, bento, editorial };

export function renderStyles(p: Portfolio): string {
	const t = TEMPLATES[p.template];
	return `${themeVars(p, t.palette)}${BASE_CSS}${t.css}`;
}

export function renderBody(p: Portfolio): string {
	return `<a class="skip" href="#main">Skip to content</a>${TEMPLATES[p.template].render(p)}`;
}

/** A complete, self-contained HTML document (no scripts, no external requests). */
export function renderPortfolio(p: Portfolio): string {
	const title = p.profile.headline ? `${p.profile.name} — ${p.profile.headline}` : p.profile.name;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.profile.headline)}">
<style>${renderStyles(p)}</style>
</head>
<body>${renderBody(p)}</body>
</html>`;
}
