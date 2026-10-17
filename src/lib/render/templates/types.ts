import type { Palette } from '../base';
import type { Portfolio, TemplateId, ThemeMode } from '../../portfolio/types';

export interface Template {
	id: TemplateId;
	name: string;
	description: string;
	css: string;
	/** Per-mode palette tweaks so each template has its own feel. */
	palette?: Partial<Record<ThemeMode, Partial<Palette>>>;
	/** Returns the inner HTML of <body>. */
	render(p: Portfolio): string;
}
