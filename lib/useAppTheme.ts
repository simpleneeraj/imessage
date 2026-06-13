'use client';

import { useTheme } from 'next-themes';
import { parseTheme, type PaletteId, type ThemeMode } from './themes';

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
  return {
    palette,
    mode,
    isDark: mode === 'dark',
    setPalette: (p) => setTheme(`${p}-${mode}`),
    toggleMode: () => setTheme(`${palette}-${mode === 'dark' ? 'light' : 'dark'}`),
  };
}
