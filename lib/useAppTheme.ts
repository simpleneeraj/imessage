'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { THEMES, parseTheme, type PaletteId, type ThemeMode } from './themes';

// Thin wrapper over next-themes that splits the combined theme id into a palette
// + light/dark mode, so components get a clean two-dimension API while a single
// provider (and next-themes' own no-flash script) handles persistence.
export function useAppTheme(): {
  palette: PaletteId;
  mode: ThemeMode;
  isDark: boolean;
  setPalette: (p: PaletteId) => void;
  toggleMode: () => void;
} {
  const { theme, setTheme } = useTheme();
  const { palette, mode } = parseTheme(theme);

  // Migrate stale theme IDs (e.g. imessage-dark, neutral-light) left in
  // localStorage from before the Goodreads palette migration.
  useEffect(() => {
    if (theme && !THEMES.includes(theme)) {
      setTheme(`${palette}-${mode}`);
    }
  }, [theme, palette, mode, setTheme]);

  return {
    palette,
    mode,
    isDark: mode === 'dark',
    setPalette: (p) => setTheme(`${p}-${mode}`),
    toggleMode: () => setTheme(`${palette}-${mode === 'dark' ? 'light' : 'dark'}`),
  };
}
