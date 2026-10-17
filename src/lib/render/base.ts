// Theme tokens and base styles shared by every template. System font stacks only,
// so rendered portfolios need no network requests.

import type { Font, Portfolio, ThemeMode } from '../portfolio/types';
import { onColor } from './util';

export const FONT_STACKS: Record<Font, string> = {
	sans: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
	serif: `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`,
	mono: `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
};

export interface Palette {
	bg: string;
	surface: string;
	fg: string;
	muted: string;
	border: string;
}

export const PALETTES: Record<ThemeMode, Palette> = {
	light: { bg: '#ffffff', surface: '#f6f7f9', fg: '#0f172a', muted: '#526077', border: '#e3e7ee' },
	dark: { bg: '#0b0d10', surface: '#14181e', fg: '#e8eaed', muted: '#9aa3b0', border: '#252b34' }
};

export function themeVars(p: Portfolio, overrides: Partial<Record<ThemeMode, Partial<Palette>>> = {}): string {
	const pal = { ...PALETTES[p.theme.mode], ...overrides[p.theme.mode] };
	return `:root{--bg:${pal.bg};--surface:${pal.surface};--fg:${pal.fg};--muted:${pal.muted};--border:${pal.border};--accent:${p.theme.accent};--on-accent:${onColor(
		p.theme.accent
	)};--font:${FONT_STACKS[p.theme.font]};color-scheme:${p.theme.mode}}`;
}

export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);line-height:1.6;font-size:17px;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
a{color:inherit}
h1,h2,h3{line-height:1.15;margin:0}
p{margin:0 0 1em}
p:last-child{margin-bottom:0}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:16px;top:16px;background:var(--bg);padding:8px 12px;z-index:10}
.nav{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;justify-content:space-between}
.nav-name{font-weight:700;text-decoration:none}
.nav-links{display:flex;flex-wrap:wrap;gap:4px 18px}
.nav-links a{text-decoration:none;color:var(--muted);font-size:.92em}
.nav-links a:hover{color:var(--fg)}
.avatar{width:120px;height:120px;border-radius:50%;object-fit:cover;flex-shrink:0}
.avatar-initials{display:grid;place-items:center;background:var(--accent);color:var(--on-accent);font-weight:700;font-size:2.4rem}
.tags{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.tags li{font-size:.8em;padding:3px 10px;border:1px solid var(--border);border-radius:999px;color:var(--muted)}
.link,.social{color:var(--fg);text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:4px}
.project-links{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;font-size:.92em}
.timeline{list-style:none;margin:0;padding:0;display:grid;gap:28px}
.timeline li{display:grid;gap:4px 24px}
@media (min-width:640px){.timeline li{grid-template-columns:150px 1fr}}
.timeline-when{color:var(--muted);font-size:.9em;font-variant-numeric:tabular-nums}
.timeline-org{color:var(--muted)}
.timeline-body p{margin-top:8px}
.button{display:inline-block;background:var(--accent);color:var(--on-accent);padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;word-break:break-all}
.contact-message{font-size:1.25em;margin-bottom:20px}
.socials{display:flex;flex-wrap:wrap;gap:18px;margin-top:22px}
.skill-groups{display:grid;gap:20px}
.skill-group h3{font-size:.95em;margin-bottom:10px}
.prose{max-width:65ch}
.hero-location{color:var(--muted);font-size:.95em}
.hero{display:flex;flex-direction:column;gap:28px}
.hero-centered{align-items:center;text-align:center}
.hero-centered .hero-headline{margin-inline:auto}
@media (min-width:760px){.hero-split{flex-direction:row-reverse;align-items:center;justify-content:space-between}.hero-split .avatar{width:180px;height:180px}}
.hero-headline{max-width:38ch}
.footer{color:var(--muted);font-size:.85em}
`;
