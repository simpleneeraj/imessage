// Colour palette × light/dark, encoded as a single next-themes theme id like
// "anthropic-dark". One provider drives both dimensions (see app/layout.tsx);
// the matching CSS lives in globals.css as `.<palette>-<mode>` token blocks.

// `id` is persisted by next-themes and keys the `.{id}-{mode}` CSS blocks in
// globals.css — never rename an id. `label` is display-only and safe to change.
export const PALETTES = [
  { id: 'imessage', label: 'Cobalt' },
  { id: 'neutral', label: 'Graphite' },
  { id: 'anthropic', label: 'Clay' },
  { id: 'royal', label: 'Amethyst' },
  { id: 'beige', label: 'Sand' },
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
