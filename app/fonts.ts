import { cn } from '@/lib/utils';
import {
  Alice,
  Amita,
  Arya,
  Dekko,
  Rozha_One,
  Merriweather,
} from 'next/font/google';

/**
 * @font Fraunces
 * - Display serif with a modern editorial vibe
 * - Great for logos, wordmarks, and headings where you want contrast
 * - Supports variable optical sizes and weights
 */
// export const fraunces = Fraunces({
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700", "800", "900"],
//   variable: "--font-fraunces",
//   fallback: ["Georgia", "serif"],
// });

/**
 * @font Merriweather
 * - Classic serif
 * - Great for headings, quotes, and literary feel
 */
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-merriweather',
  fallback: ['Georgia', 'serif'],
});

/**
 * @font Alice
 * - Vintage serif
 * - Perfect for branding / logos with old-style bookish vibe
 */
const alice = Alice({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-alice',
});

/**
 * @font Amita
 * - Decorative serif, slightly calligraphic
 * - Works well for headings, invites, festive branding
 */
const amita = Amita({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-amita',
});

/**
 * @font Arya
 * - Clean sans serif
 * - Good for body text and captions
 */
const arya = Arya({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-arya',
});

/**
 * @font Dekko
 * - Handwritten playful style
 * - Works well for informal, friendly UI
 */
const dekko = Dekko({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dekko',
});

/**
 * @font Rozha One
 * - High contrast display serif
 * - Great for impactful headings and editorial style
 */
const rozhaOne = Rozha_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-rozha-one',
});

export default cn(
  merriweather.variable,
  alice.variable,
  amita.variable,
  arya.variable,
  dekko.variable,
  rozhaOne.variable,
);
