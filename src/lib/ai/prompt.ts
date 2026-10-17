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
		`template: ${p.template}; layout: ${p.layout}; theme: ${p.theme.mode}, accent ${p.theme.accent}, font ${p.theme.font}`,
		`profile: name ${q(p.profile.name)}; headline ${q(clip(p.profile.headline, 120))}; location ${q(p.profile.location)}; avatarUrl ${q(p.profile.avatarUrl)}`,
		'sections in order:'
	];
	p.sections.forEach((s, i) => {
		const head = `${i + 1}. ${s.type} titled ${q(s.title)}${s.visible ? '' : ' (hidden)'}`;
		if (s.type === 'intro') lines.push(`${head}: body ${q(clip(s.data.body, 240))}`);
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

const SYSTEM = `You edit a personal portfolio website. Reply ONLY with JSON: {"reply": "<one short sentence to the user>", "actions": [ ... ]}.

Actions (use exactly these names and fields):
- {"action":"set_theme","mode":"light|dark","accent":"#rrggbb","font":"sans|serif|mono"}  (include only fields that change)
- {"action":"set_template","template":"minimal|bento|editorial"}
- {"action":"set_layout","layout":"stacked|split|centered"}
- {"action":"update_profile","field":"name|headline|location|avatarUrl","value":"..."}
- {"action":"add_section","section":"<type>"}   types: intro, skills, projects, experience, education, contact
- {"action":"remove_section","section":"<type>"}
- {"action":"show_section","section":"<type>"} / {"action":"hide_section","section":"<type>"}
- {"action":"move_section","section":"<type>","position":<1-based number>}
- {"action":"rename_section","section":"<type>","title":"..."}
- {"action":"set_text","section":"intro","field":"body","value":"..."}   or section "contact" with field "email" or "message"
- {"action":"add_item","section":"<list type>","item":{...}}
- {"action":"update_item","section":"<list type>","item":"<entry name>","field":"<field>","value":"..."}
- {"action":"remove_item","section":"<list type>","item":"<entry name>"}

Entry fields by list type:
- skills: name, skills (list of strings)
- projects: name, description, tags (list), url, repoUrl
- experience: role, organization, start, end, summary
- education: institution, qualification, start, end, summary
- contact: label, url   (social links like GitHub, LinkedIn)

Rules:
- Only use sections and entries that exist in the current portfolio, unless you add them first.
- Links must start with https:// (or mailto:). Colours are hex like #7c3aed.
- Every template is already responsive on phones; for "make it responsive" reply that it already is and return no actions.
- If the request is unclear or impossible, ask a short question in "reply" and return no actions.
- Never invent personal facts. If the user didn't give details, use their words only.
- Keep "reply" under 25 words.`;

const EXAMPLES: ChatMessage[] = [
	{ role: 'user', content: 'Switch to dark mode with a purple accent' },
	{ role: 'assistant', content: '{"reply":"Switched to dark mode with a purple accent.","actions":[{"action":"set_theme","mode":"dark","accent":"#7c3aed"}]}' },
	{ role: 'user', content: 'Add my GitHub https://github.com/sam and hide education' },
	{
		role: 'assistant',
		content:
			'{"reply":"Added your GitHub link and hid the education section.","actions":[{"action":"add_item","section":"contact","item":{"label":"GitHub","url":"https://github.com/sam"}},{"action":"hide_section","section":"education"}]}'
	},
	{ role: 'user', content: 'Put projects first' },
	{ role: 'assistant', content: '{"reply":"Moved projects to the top.","actions":[{"action":"move_section","section":"projects","position":1}]}' }
];

/** Builds the chat messages for one request. `history` holds prior turns (oldest first). */
export function buildMessages(p: Portfolio, request: string, history: ChatTurn[] = []): ChatMessage[] {
	return [
		{ role: 'system', content: SYSTEM },
		...EXAMPLES,
		...history.slice(-4).map((t) => ({ role: t.role, content: clip(t.content, 400) })),
		{ role: 'user', content: `Current portfolio:\n${describePortfolio(p)}\n\nRequest: ${clip(request.trim(), 600)}` }
	];
}
