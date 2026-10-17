import {
	SCHEMA_VERSION,
	type ItemOf,
	type ListSectionType,
	type Portfolio,
	type Section,
	type SectionDataMap,
	type SectionType,
	type TemplateId
} from './types';

export function newId(prefix: string): string {
	const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
	return `${prefix}-${rand}`.slice(0, 40);
}

export const SECTION_LABELS: Record<SectionType, string> = {
	intro: 'About',
	skills: 'Skills',
	projects: 'Projects',
	experience: 'Experience',
	education: 'Education',
	contact: 'Contact'
};

export function emptyData<T extends SectionType>(type: T): SectionDataMap[T] {
	const data: { [K in SectionType]: SectionDataMap[K] } = {
		intro: { body: '' },
		skills: { items: [] },
		projects: { items: [] },
		experience: { items: [] },
		education: { items: [] },
		contact: { email: '', message: '', items: [] }
	};
	return data[type];
}

export function emptySection(type: SectionType): Section {
	return { id: newId(type), type, title: SECTION_LABELS[type], visible: true, data: emptyData(type) } as Section;
}

export function emptyItem<T extends ListSectionType>(type: T): ItemOf<T> {
	const items: { [K in ListSectionType]: ItemOf<K> } = {
		skills: { id: newId('skill'), name: 'New group', skills: [] },
		projects: { id: newId('project'), name: 'New project', description: '', tags: [], url: '', repoUrl: '' },
		experience: { id: newId('job'), role: 'Role', organization: 'Organization', start: '', end: '', summary: '' },
		education: { id: newId('edu'), institution: 'Institution', qualification: '', start: '', end: '', summary: '' },
		contact: { id: newId('link'), label: 'Link', url: '' }
	};
	return items[type];
}

const TEMPLATE_THEME: Record<TemplateId, Portfolio['theme']> = {
	minimal: { mode: 'light', accent: '#2563eb', font: 'sans' },
	bento: { mode: 'dark', accent: '#a3e635', font: 'mono' },
	editorial: { mode: 'light', accent: '#c2410c', font: 'serif' }
};

/** Placeholder content shown when a user starts from a template. */
export function starterPortfolio(template: TemplateId): Portfolio {
	return {
		schemaVersion: SCHEMA_VERSION,
		template,
		layout: template === 'editorial' ? 'split' : template === 'bento' ? 'stacked' : 'centered',
		theme: { ...TEMPLATE_THEME[template] },
		profile: {
			name: 'Alex Morgan',
			headline: 'Software engineer building fast, accessible web apps.',
			location: 'Remote',
			avatarUrl: ''
		},
		sections: [
			{
				id: 'intro',
				type: 'intro',
				title: 'About',
				visible: true,
				data: {
					body: "I'm a developer who enjoys turning rough ideas into polished products.\n\nI care about performance, accessibility and clear interfaces. Replace this text with a short story about you."
				}
			},
			{
				id: 'skills',
				type: 'skills',
				title: 'Skills',
				visible: true,
				data: {
					items: [
						{ id: 'languages', name: 'Languages', skills: ['TypeScript', 'Python', 'SQL'] },
						{ id: 'frameworks', name: 'Frameworks', skills: ['Svelte', 'Node.js', 'Tailwind CSS'] },
						{ id: 'tools', name: 'Tools', skills: ['Git', 'Docker', 'Figma'] }
					]
				}
			},
			{
				id: 'projects',
				type: 'projects',
				title: 'Projects',
				visible: true,
				data: {
					items: [
						{
							id: 'project-one',
							name: 'Trail Finder',
							description: 'A map app that suggests hiking trails based on weather and difficulty.',
							tags: ['Svelte', 'Maps API'],
							url: 'https://example.com',
							repoUrl: ''
						},
						{
							id: 'project-two',
							name: 'Budget Buddy',
							description: 'A privacy-first budgeting tool that keeps all data on your device.',
							tags: ['TypeScript', 'IndexedDB'],
							url: '',
							repoUrl: 'https://github.com'
						}
					]
				}
			},
			{
				id: 'experience',
				type: 'experience',
				title: 'Experience',
				visible: true,
				data: {
					items: [
						{
							id: 'job-one',
							role: 'Frontend Developer',
							organization: 'Acme Studio',
							start: '2023',
							end: 'Present',
							summary: 'Built and maintained client web apps; cut page load times by 40%.'
						}
					]
				}
			},
			{
				id: 'education',
				type: 'education',
				title: 'Education',
				visible: true,
				data: {
					items: [
						{
							id: 'edu-one',
							institution: 'State University',
							qualification: 'B.Sc. Computer Science',
							start: '2019',
							end: '2023',
							summary: ''
						}
					]
				}
			},
			{
				id: 'contact',
				type: 'contact',
				title: 'Contact',
				visible: true,
				data: {
					email: 'alex@example.com',
					message: "I'm open to new opportunities. Say hello!",
					items: [
						{ id: 'github', label: 'GitHub', url: 'https://github.com' },
						{ id: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com' }
					]
				}
			}
		]
	};
}
