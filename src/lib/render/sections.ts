// Semantic markup for each section type, shared by all templates.
// Templates restyle these classes; they do not change the content model.

import type { Portfolio, Section, SectionOf } from '../portfolio/types';
import { esc, hostOf, href, initials, paragraphs, range, slug } from './util';

export function sectionAnchor(s: Section): string {
	return slug(s.title || s.type);
}

export function visibleSections(p: Portfolio): Section[] {
	return p.sections.filter((s) => s.visible);
}

export function avatar(p: Portfolio): string {
	const src = href(p.profile.avatarUrl);
	if (src) return `<img class="avatar" src="${src}" alt="${esc(p.profile.name)}" width="160" height="160">`;
	return `<div class="avatar avatar-initials" aria-hidden="true">${esc(initials(p.profile.name))}</div>`;
}

export function nav(p: Portfolio): string {
	const links = visibleSections(p)
		.filter((s) => s.type !== 'intro')
		.map((s) => `<a href="#${sectionAnchor(s)}">${esc(s.title)}</a>`)
		.join('');
	return `<nav class="nav" aria-label="Sections"><a class="nav-name" href="#top">${esc(p.profile.name)}</a><div class="nav-links">${links}</div></nav>`;
}

function link(url: string, label: string, cls = 'link'): string {
	const h = href(url);
	return h ? `<a class="${cls}" href="${h}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '';
}

function tags(list: string[]): string {
	return list.length ? `<ul class="tags">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
}

function intro(s: SectionOf<'intro'>) {
	return `<div class="prose">${paragraphs(s.data.body)}</div>`;
}

function skills(s: SectionOf<'skills'>) {
	return `<div class="skill-groups">${s.data.items
		.map((g) => `<div class="skill-group"><h3>${esc(g.name)}</h3>${tags(g.skills)}</div>`)
		.join('')}</div>`;
}

function projects(s: SectionOf<'projects'>) {
	return `<div class="projects">${s.data.items
		.map((pr, i) => {
			const links = [link(pr.url, pr.url ? `Live · ${hostOf(pr.url)}` : ''), link(pr.repoUrl, 'Source')].filter(Boolean).join('');
			return `<article class="project"><span class="project-index">${String(i + 1).padStart(2, '0')}</span><h3>${esc(pr.name)}</h3>${
				pr.description ? `<p>${esc(pr.description)}</p>` : ''
			}${tags(pr.tags)}${links ? `<div class="project-links">${links}</div>` : ''}</article>`;
		})
		.join('')}</div>`;
}

function timeline(items: Array<{ title: string; org: string; when: string; summary: string }>) {
	return `<ol class="timeline">${items
		.map(
			(e) =>
				`<li><div class="timeline-when">${e.when}</div><div class="timeline-body"><h3>${esc(e.title)}</h3><div class="timeline-org">${esc(e.org)}</div>${
					e.summary ? `<p>${esc(e.summary)}</p>` : ''
				}</div></li>`
		)
		.join('')}</ol>`;
}

function experience(s: SectionOf<'experience'>) {
	return timeline(s.data.items.map((e) => ({ title: e.role, org: e.organization, when: range(e.start, e.end), summary: e.summary })));
}

function education(s: SectionOf<'education'>) {
	return timeline(
		s.data.items.map((e) => ({ title: e.qualification || e.institution, org: e.qualification ? e.institution : '', when: range(e.start, e.end), summary: e.summary }))
	);
}

function contact(s: SectionOf<'contact'>) {
	const email = s.data.email ? `<a class="button" href="${href(`mailto:${s.data.email}`)}">${esc(s.data.email)}</a>` : '';
	const links = s.data.items.map((l) => link(l.url, l.label, 'social')).filter(Boolean).join('');
	return `<div class="contact">${s.data.message ? `<p class="contact-message">${esc(s.data.message)}</p>` : ''}${email}${
		links ? `<div class="socials">${links}</div>` : ''
	}</div>`;
}

export function sectionBody(s: Section): string {
	switch (s.type) {
		case 'intro':
			return intro(s);
		case 'skills':
			return skills(s);
		case 'projects':
			return projects(s);
		case 'experience':
			return experience(s);
		case 'education':
			return education(s);
		case 'contact':
			return contact(s);
	}
}

export function hero(p: Portfolio, extra = ''): string {
	return `<header class="hero hero-${p.layout}" id="top">${avatar(p)}<div class="hero-text"><h1>${esc(p.profile.name)}</h1>${
		p.profile.headline ? `<p class="hero-headline">${esc(p.profile.headline)}</p>` : ''
	}${p.profile.location ? `<p class="hero-location">${esc(p.profile.location)}</p>` : ''}${extra}</div></header>`;
}
