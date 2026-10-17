// Output-safety helpers. Every piece of user text goes through esc(); every link
// through href(). Renderer files import only from this folder and ../portfolio/types
// so they can be copied into exported projects unchanged.

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value: string): string {
	return value.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

/** Returns an escaped, safe href, or '' for anything that isn't http(s)/mailto. */
export function href(value: string): string {
	try {
		const url = new URL(value);
		if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return esc(url.href);
	} catch {
		/* not a URL */
	}
	return '';
}

export function hostOf(value: string): string {
	try {
		return new URL(value).host.replace(/^www\./, '');
	} catch {
		return '';
	}
}

/** Blank-line separated paragraphs; single newlines become <br>. */
export function paragraphs(value: string): string {
	return value
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean)
		.map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

export function initials(name: string): string {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]!.toUpperCase())
			.join('') || '?'
	);
}

export function range(start: string, end: string): string {
	if (start && end) return `${esc(start)} – ${esc(end)}`;
	return esc(start || end);
}

export function slug(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

/** Black or white, whichever reads better on the given #rrggbb background. */
export function onColor(hex: string): string {
	const n = parseInt(hex.slice(1), 16);
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
	return l > 0.4 ? '#0a0a0a' : '#ffffff';
}
