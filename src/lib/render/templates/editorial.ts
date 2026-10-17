// Editorial: magazine feel. Serif display type, numbered sections in alternating
// bands, projects presented as large case-study rows.

import type { Portfolio } from '../../portfolio/types';
import { hero, nav, sectionAnchor, sectionBody, visibleSections } from '../sections';
import { esc } from '../util';
import type { Template } from './types';

const css = `
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.topbar{border-bottom:1px solid var(--border)}
.topbar .nav{padding:18px 0}
.hero{padding:72px 0 80px}
.hero h1{font-size:clamp(2.8rem,9vw,5.6rem);letter-spacing:-.035em;font-weight:600}
.hero-headline{font-size:clamp(1.2rem,2.8vw,1.7rem);margin-top:20px;font-style:italic;max-width:30ch}
.hero .avatar{border-radius:4px}
.band{padding:72px 0;border-top:1px solid var(--border)}
.band:nth-child(even){background:var(--surface)}
.band-head{display:flex;align-items:baseline;gap:18px;margin-bottom:36px}
.band-num{color:var(--accent);font-size:.95rem;font-variant-numeric:tabular-nums}
.section-title{font-size:clamp(1.8rem,4.5vw,2.6rem);font-weight:600;letter-spacing:-.02em}
.prose{font-size:1.15em}
.projects{display:grid}
.project{display:grid;gap:6px 32px;padding:28px 0;border-top:1px solid var(--border)}
.project:last-child{border-bottom:1px solid var(--border)}
@media (min-width:760px){.project{grid-template-columns:70px 1fr 1fr}.project p,.project .tags,.project .project-links{grid-column:3}.project h3{grid-column:2;grid-row:1/4}}
.project-index{color:var(--accent);font-variant-numeric:tabular-nums}
.project h3{font-size:clamp(1.4rem,3vw,1.9rem);font-weight:600}
.project p{color:var(--muted)}
.skill-groups{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}
.skill-group h3{font-size:1.1rem;border-bottom:2px solid var(--accent);padding-bottom:8px;margin-bottom:14px;display:inline-block}
.contact-message{font-size:clamp(1.5rem,3.5vw,2.2rem);line-height:1.25;max-width:24ch}
.footer{padding:28px 0 48px}
`;

function render(p: Portfolio): string {
	const bands = visibleSections(p)
		.map(
			(s, i) =>
				`<section class="band section-${s.type}" id="${sectionAnchor(s)}"><div class="wrap"><div class="band-head"><span class="band-num">${String(
					i + 1
				).padStart(2, '0')}</span><h2 class="section-title">${esc(s.title)}</h2></div>${sectionBody(s)}</div></section>`
		)
		.join('');
	return `<div class="topbar"><div class="wrap">${nav(p)}</div></div><div class="wrap">${hero(p)}</div><main id="main">${bands}</main><div class="wrap"><footer class="footer">© ${esc(
		p.profile.name
	)}</footer></div>`;
}

export const editorial: Template = {
	id: 'editorial',
	name: 'Editorial',
	description: 'Magazine-style serif layout with numbered case-study sections.',
	css,
	palette: { light: { bg: '#faf7f2', surface: '#f2ede4', border: '#e4dccf', fg: '#1c1917', muted: '#6b625a' }, dark: { bg: '#14110f', surface: '#1c1815', border: '#2e2823' } },
	render
};
