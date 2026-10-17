// Bento: developer-style card grid. Each section is a tile; projects and skills
// get wide tiles. Dark by default with a bright accent and mono type.

import type { Portfolio, SectionType } from '../../portfolio/types';
import { hero, nav, sectionAnchor, sectionBody, visibleSections } from '../sections';
import { esc } from '../util';
import type { Template } from './types';

const WIDE: SectionType[] = ['projects', 'experience', 'contact'];

const css = `
.page{max-width:1120px;margin:0 auto;padding:20px 16px 48px}
.nav{padding:14px 18px;border:1px solid var(--border);border-radius:18px;background:var(--surface);margin-bottom:16px}
.grid{display:grid;gap:16px}
@media (min-width:820px){.grid{grid-template-columns:repeat(2,1fr)}.tile-wide{grid-column:1/-1}}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:28px}
.hero.tile{grid-column:1/-1;padding:36px}
.hero h1{font-size:clamp(2rem,6vw,3.4rem);letter-spacing:-.02em}
.hero-headline{color:var(--muted);font-size:1.1rem;margin-top:12px}
.hero .avatar{border-radius:20px}
.section-title{font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);margin-bottom:20px;font-weight:600}
.projects{display:grid;gap:14px}
@media (min-width:640px){.projects{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}}
.project{position:relative;border:1px solid var(--border);border-radius:16px;padding:22px;background:var(--bg);transition:border-color .2s}
.project:hover{border-color:var(--accent)}
.project-index{font-size:.75em;color:var(--muted)}
.project h3{font-size:1.1rem;margin:6px 0 8px}
.project p{color:var(--muted);font-size:.95em}
.project .tags{margin-top:12px}
.tags li{background:var(--bg)}
.skill-groups{gap:18px}
.contact{display:flex;flex-direction:column;align-items:flex-start}
.footer{text-align:center;padding-top:28px}
`;

function render(p: Portfolio): string {
	const tiles = visibleSections(p)
		.map(
			(s) =>
				`<section class="tile section-${s.type}${WIDE.includes(s.type) ? ' tile-wide' : ''}" id="${sectionAnchor(s)}"><h2 class="section-title">${esc(
					s.title
				)}</h2>${sectionBody(s)}</section>`
		)
		.join('');
	const heroHtml = hero(p).replace('class="hero ', 'class="hero tile ');
	return `<div class="page">${nav(p)}<main id="main" class="grid">${heroHtml}${tiles}</main><footer class="footer">© ${esc(p.profile.name)}</footer></div>`;
}

export const bento: Template = {
	id: 'bento',
	name: 'Bento',
	description: 'Developer-style card grid with a bold accent colour.',
	css,
	palette: { dark: { bg: '#08090a', surface: '#111316', border: '#22262c' }, light: { bg: '#f3f4f6', surface: '#ffffff' } },
	render
};
