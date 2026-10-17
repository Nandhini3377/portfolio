// Prompt construction. Context is a compact text summary of the portfolio (not
// the full JSON) plus the last couple of turns, to keep prompts well under the
// 4k-token window of small browser models.

import { SECTION_TYPES, type Portfolio } from '#lib/portfolio/types.ts';
import { ITEM_TITLE } from './protocol.ts';

export interface ChatTurn {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const q = (s: string) => JSON.stringify(s);

export function describePortfolio(p: Portfolio): string {
	const lines = [
		`template ${p.template}; layout ${p.layout}; ${p.theme.mode} mode, accent ${p.theme.accent}, font ${p.theme.font}`,
		`profile: name ${q(p.profile.name)}; headline ${q(clip(p.profile.headline, 100))}; location ${q(p.profile.location)}`,
		'sections:'
	];
	p.sections.forEach((s, i) => {
		const head = `${i + 1}. ${s.type} titled ${q(s.title)}${s.visible ? '' : ' (hidden)'}`;
		if (s.type === 'intro') lines.push(`${head}: body ${q(clip(s.data.body, 160))}`);
		else {
			const key = ITEM_TITLE[s.type];
			const names = (s.data.items as unknown as Record<string, unknown>[]).map((it) => q(String(it[key])));
			const extra = s.type === 'contact' ? `email ${q(s.data.email)}; message ${q(clip(s.data.message, 100))}; ` : '';
			lines.push(`${head}: ${extra}entries [${names.join(', ')}]`);
		}
	});
	const missing = SECTION_TYPES.filter((t) => !p.sections.some((s) => s.type === t));
	lines.push(`sections that can be added: ${missing.length ? missing.join(', ') : 'none'}`);
	return lines.join('\n');
}

// Kept short on purpose: on integrated GPUs, reading the prompt (prefill) is most
// of the response time, so every line here costs the user seconds.
const SYSTEM = `You edit a portfolio website. Reply ONLY with JSON {"actions":[...]}. Make ONLY the changes the user asked for, usually 1 or 2 actions.
If the request is unclear, reply {"actions":[],"ask":"<short question>"}.
Actions:
set_theme{mode:light|dark,accent:"#rrggbb",font:sans|serif|mono} (only changed fields)
set_template{template:minimal|bento|editorial}
set_layout{layout:stacked|split|centered}
update_profile{field:name|headline|location|avatarUrl,value}
add_section/remove_section/show_section/hide_section{section}
move_section{section,position(1=top)}
rename_section{section,title}
set_text{section:intro,field:body,value} or {section:contact,field:email|message,value}
add_item{section,item:{fields}}
update_item{section,item:"<entry name>",field,value}
remove_item{section,item:"<entry name>"}
Sections: intro, skills, projects, experience, education, contact.
Entry fields: skills{name,skills[]} projects{name,description,tags[],url,repoUrl} experience{role,organization,start,end,summary} education{institution,qualification,start,end,summary} contact{label,url}
Style words: cards/grid/tiles/boxes -> template bento (takes priority). professional/clean/simple -> template minimal. elegant/magazine/classic -> template editorial. All templates are already responsive.
Rules: use only existing sections/entries. Links start with https://. Never invent facts about the user. Do not change anything that was not requested.`;

const EXAMPLES: ChatMessage[] = [
	{ role: 'user', content: 'Dark mode, purple accent, and add my GitHub https://github.com/sam' },
	{
		role: 'assistant',
		content:
			'{"actions":[{"action":"set_theme","mode":"dark","accent":"#7c3aed"},{"action":"add_item","section":"contact","item":{"label":"GitHub","url":"https://github.com/sam"}}]}'
	},
	{ role: 'user', content: 'Make it more professional with cards for my projects' },
	{ role: 'assistant', content: '{"actions":[{"action":"set_template","template":"bento"}]}' },
	{ role: 'user', content: 'Change the font' },
	{ role: 'assistant', content: '{"actions":[],"ask":"Which style would you like: sans, serif or mono?"}' }
];

/** Builds the chat messages for one request. `history` holds prior turns (oldest first). */
export function buildMessages(p: Portfolio, request: string, history: ChatTurn[] = []): ChatMessage[] {
	return [
		{ role: 'system', content: SYSTEM },
		...EXAMPLES,
		...history.slice(-2).map((t) => ({ role: t.role, content: clip(t.content, 200) })),
		{ role: 'user', content: `Current portfolio:\n${describePortfolio(p)}\n\nRequest: ${clip(request.trim(), 600)}` }
	];
}
