// Colour palette × light/dark, encoded as a single next-themes theme id like
// "anthropic-dark". One provider drives both dimensions (see app/layout.tsx);
// the matching CSS lives in globals.css as `.<palette>-<mode>` token blocks.

export const PALETTES = [
  { id: 'imessage', label: 'iMessage' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'royal', label: 'Royal' },
] as const;

export type PaletteId = (typeof PALETTES)[number]['id'];
export type ThemeMode = 'light' | 'dark';

export const DEFAULT_THEME = 'imessage-light';

export const THEMES = PALETTES.flatMap((p) => [`${p.id}-light`, `${p.id}-dark`]);

export function parseTheme(theme: string | undefined): {
  palette: PaletteId;
  mode: ThemeMode;
} {
  const [p, m] = (theme ?? DEFAULT_THEME).split('-');
  const palette = (PALETTES.find((x) => x.id === p)?.id ?? 'imessage') as PaletteId;
  return { palette, mode: m === 'dark' ? 'dark' : 'light' };
}
