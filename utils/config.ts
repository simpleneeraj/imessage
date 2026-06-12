import { COLORS } from './colors';
import { PATTERN_SIZE, PATTERNS } from './patterns';
import { MaskWallpaperOptions } from '@/plugins/mask-wallpaper/types';

export const wallpaperOptions: MaskWallpaperOptions = {
  fps: 30,
  tails: 30,
  animate: false,
  colors: COLORS[0].colors,
  pattern: {
    image: PATTERNS[0].path,
    background: '#000',
    size: PATTERN_SIZE,
    opacity: 0.2,
    blur: 0,
    mask: true,
  },
};

// A per-chat theme is stored on the conversation as JSON:
// { color, pattern, bubble } where `color` is a COLORS[].text, `pattern` is a
// PATTERNS[].text and `bubble` is a hex for the outgoing bubble. All optional —
// a bubble colour can be set without a wallpaper.
export type ChatWallpaperConfig = {
  color?: string;
  pattern?: string;
  bubble?: string;
};

export function parseWallpaper(
  value: string | null | undefined,
): ChatWallpaperConfig | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ChatWallpaperConfig>;
    if (parsed.color || parsed.pattern || parsed.bubble) {
      return {
        color: parsed.color,
        pattern: parsed.pattern,
        bubble: parsed.bubble,
      };
    }
  } catch {
    // legacy/invalid value
  }
  return null;
}

export function serializeWallpaper(config: ChatWallpaperConfig): string {
  return JSON.stringify(config);
}

export function wallpaperOptionsFor(
  value: string | null | undefined,
): MaskWallpaperOptions | null {
  const config = parseWallpaper(value);
  // bubble-only configs have no wallpaper layer
  if (!config?.color || !config.pattern) return null;
  const colors = COLORS.find((c) => c.text === config.color)?.colors ?? COLORS[0].colors;
  const pattern = PATTERNS.find((p) => p.text === config.pattern) ?? PATTERNS[0];
  return {
    fps: 30,
    tails: 30,
    animate: false,
    colors,
    pattern: {
      image: pattern.path,
      background: '#000',
      size: PATTERN_SIZE,
      opacity: 0.2,
      blur: 0,
      mask: true,
    },
  };
}
