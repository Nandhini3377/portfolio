// The portfolio document. Every template renders this shape, every edit operation
// transforms it, and it is what gets saved, exported and (later) sent to the model
// as context. Keep this file free of imports: it is copied verbatim into exports.

export const SCHEMA_VERSION = 1;

export const TEMPLATE_IDS = ['minimal', 'bento', 'editorial'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const LAYOUTS = ['stacked', 'split', 'centered'] as const;
export type Layout = (typeof LAYOUTS)[number];

export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const FONTS = ['sans', 'serif', 'mono'] as const;
export type Font = (typeof FONTS)[number];

export interface Theme {
	mode: ThemeMode;
	/** Hex colour, `#rrggbb`. */
	accent: string;
	font: Font;
}

export interface Profile {
	name: string;
	headline: string;
	location: string;
	/** Absolute https URL, or empty. */
	avatarUrl: string;
}

export interface Link {
	id: string;
	label: string;
	url: string;
}

export interface SkillGroup {
	id: string;
	name: string;
	skills: string[];
}

export interface Project {
	id: string;
	name: string;
	description: string;
	tags: string[];
	url: string;
	repoUrl: string;
}

export interface Experience {
	id: string;
	role: string;
	organization: string;
	start: string;
	end: string;
	summary: string;
}

export interface Education {
	id: string;
	institution: string;
	qualification: string;
	start: string;
	end: string;
	summary: string;
}

export interface SectionDataMap {
	intro: { body: string };
	skills: { items: SkillGroup[] };
	projects: { items: Project[] };
	experience: { items: Experience[] };
	education: { items: Education[] };
	contact: { email: string; message: string; items: Link[] };
}

export type SectionType = keyof SectionDataMap;
export const SECTION_TYPES = [
	'intro',
	'skills',
	'projects',
	'experience',
	'education',
	'contact'
] as const satisfies readonly SectionType[];

/** Section types whose data holds a list of `items`. */
export type ListSectionType = {
	[K in SectionType]: SectionDataMap[K] extends { items: unknown[] } ? K : never;
}[SectionType];

export type ItemOf<T extends ListSectionType> = SectionDataMap[T]['items'][number];

export type Section = {
	[K in SectionType]: {
		id: string;
		type: K;
		title: string;
		visible: boolean;
		data: SectionDataMap[K];
	};
}[SectionType];

export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

export interface Portfolio {
	schemaVersion: typeof SCHEMA_VERSION;
	template: TemplateId;
	layout: Layout;
	theme: Theme;
	profile: Profile;
	sections: Section[];
}
