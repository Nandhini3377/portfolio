// Minimal: content-first single column, large type, generous whitespace,
// small uppercase section labels in a left gutter on wide screens.

import type { Portfolio } from '../../portfolio/types';
import { hero, nav, sectionAnchor, sectionBody, visibleSections } from '../sections';
import { esc } from '../util';
import type { Template } from './types';

const css = `
.page{max-width:820px;margin:0 auto;padding:28px 20px 64px}
.nav{padding-bottom:56px}
.hero{padding-bottom:72px;border-bottom:1px solid var(--border)}
.hero h1{font-size:clamp(2.4rem,7vw,4rem);letter-spacing:-.03em;font-weight:700}
.hero-headline{font-size:clamp(1.15rem,2.6vw,1.45rem);color:var(--muted);margin-top:16px}
.section{display:grid;gap:18px;padding:56px 0;border-bottom:1px solid var(--border)}
@media (min-width:760px){.section{grid-template-columns:170px 1fr;gap:32px}}
.section-title{font-size:.78rem;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-weight:600;padding-top:4px}
.projects{display:grid;gap:36px}
.project h3{font-size:1.2rem;margin-bottom:6px}
.project p{color:var(--muted)}
.project .tags{margin-top:12px}
.project-index{display:none}
.skill-group{display:grid;gap:8px}
@media (min-width:560px){.skill-group{grid-template-columns:130px 1fr;align-items:start}}
.skill-group h3{margin:3px 0 0;font-weight:600;color:var(--muted)}
.footer{padding-top:40px}
`;

function render(p: Portfolio): string {
	const sections = visibleSections(p)
		.map(
			(s) =>
				`<section class="section section-${s.type}" id="${sectionAnchor(s)}"><h2 class="section-title">${esc(s.title)}</h2><div>${sectionBody(s)}</div></section>`
		)
		.join('');
	return `<div class="page">${nav(p)}${hero(p)}<main id="main">${sections}</main><footer class="footer">© ${esc(p.profile.name)}</footer></div>`;
}

export const minimal: Template = {
	id: 'minimal',
	name: 'Minimal',
	description: 'Clean single column with large type and lots of whitespace.',
	css,
	render
};
