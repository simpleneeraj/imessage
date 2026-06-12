import { COLORS } from './colors';

// Preset chat themes pairing a wallpaper gradient + pattern with a matching
// outgoing-bubble colour, Telegram "Browse Themes" style.
export type ChatTheme = {
  name: string;
  color: string; // COLORS[].text
  pattern: string; // PATTERNS[].text
  bubble: string; // outgoing bubble hex
};

export const THEMES: ChatTheme[] = [
  { name: 'Meadow', color: 'Default', pattern: 'Animals', bubble: '#34a853' },
  { name: 'Cosmos', color: 'Amethyst', pattern: 'Space', bubble: '#5e5ce6' },
  { name: 'Paris', color: 'France', pattern: 'Paris', bubble: '#2f8af5' },
  { name: 'Lagoon', color: 'Malibu', pattern: 'Underwater World', bubble: '#4f7df7' },
  { name: 'Safari', color: 'Monte Carlo', pattern: 'Zoo', bubble: '#2eaa6e' },
  { name: 'Noël', color: 'Pine Glade', pattern: 'Christmas', bubble: '#2e7d54' },
  { name: 'Frost', color: 'Ice', pattern: 'Snowflakes', bubble: '#4c9ee8' },
  { name: 'Magic', color: 'Viola', pattern: 'Magic', bubble: '#a464f4' },
  { name: 'Shore', color: 'Wewak', pattern: 'Beach', bubble: '#e8833a' },
  { name: 'Candy', color: 'Cheerfulness', pattern: 'Sweets', bubble: '#e9508f' },
  { name: 'Unicorn', color: 'Cashmere', pattern: 'Unicorns', bubble: '#d9699d' },
  { name: 'Fable', color: 'Light Wisteria', pattern: 'Fantasy', bubble: '#8d6fe0' },
  { name: 'Orbit', color: 'Cold Purple', pattern: 'Astronaut Cats', bubble: '#6c8cd4' },
  { name: 'Euler', color: 'Cold Blue', pattern: 'Math', bubble: '#2f7ddd' },
  { name: 'Pets', color: 'Periwinkle Gray', pattern: 'Cats and Dogs', bubble: '#7b88e0' },
  { name: 'Arcade', color: 'Wild Willow', pattern: 'Games', bubble: '#53a653' },
];

// Standalone outgoing-bubble fills. `value` is any CSS background — solid hex
// or gradient — so this list can grow into the hundreds.
export const BUBBLE_COLORS = [
  { name: 'Blue', value: '#007aff' },
  { name: 'Indigo', value: '#5e5ce6' },
  { name: 'Purple', value: '#af52de' },
  { name: 'Pink', value: '#ff375f' },
  { name: 'Orange', value: '#ff9500' },
  { name: 'Green', value: '#34c759' },
  { name: 'Teal', value: '#30b0c7' },
  { name: 'Twilight', value: 'linear-gradient(135deg, #5e5ce6, #af52de)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #ff9500, #ff375f)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #0a84ff, #30b0c7)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #30b0c7, #34c759)' },
  { name: 'Cherry', value: 'linear-gradient(135deg, #ff375f, #af52de)' },
  { name: 'Royal', value: 'linear-gradient(135deg, #007aff, #5e5ce6)' },
  { name: 'Flame', value: 'linear-gradient(135deg, #ffcc00, #ff9500)' },
];

// Representative solid for a bubble fill — used wherever a gradient can't go
// (accent buttons, rings, the tail accent var).
export function bubbleSolid(value: string): string {
  return value.match(/#[0-9a-fA-F]{3,8}/)?.[0] ?? '#007aff';
}

export function gradientFor(colorName: string): string {
  const colors =
    COLORS.find((c) => c.text === colorName)?.colors ?? COLORS[0].colors;
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}
