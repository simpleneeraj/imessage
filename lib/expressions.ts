import type { IconType } from 'react-icons';
import {
  HiBolt,
  HiBriefcase,
  HiChatBubbleLeftRight,
  HiCheckBadge,
  HiFaceFrown,
  HiFire,
  HiHandRaised,
  HiHandThumbUp,
  HiHeart,
  HiRocketLaunch,
  HiSparkles,
  HiTrophy,
} from 'react-icons/hi2';
import type { VibeId } from './types';

// Quick expressions unlocked by a chat's vibe. Sent as E2EE payloads
// { kind: 'expression' } so both sides can fire the matching effect.
// Icons only (hi2) — no emoji.

/** The effect fired when an expression lands in the thread. */
export type ExpressionEffect = 'hearts' | 'confetti' | 'none';

/**
 * Colour palette for a single expression. Drives the {@link ExpressionBubble}
 * presentation: an animated noise-gradient ring, an ambient glow, and a frosted
 * icon disc. Keeping the palette in the config (rather than the component) means
 * every id/label owns its look in one place.
 */
export type ExpressionPalette = {
  /** Three colours feeding the animated noise-gradient ring (outer → accent). */
  gradient: [string, string, string];
  /** Tailwind bg class for the soft ambient glow behind the capsule. */
  glow: string;
  /** Tailwind `from-… to-…` gradient for the icon disc. */
  iconGradient: string;
  /** When true the icon gently pulses (reserved for the warmest expressions). */
  pulse?: boolean;
};

export type Expression = {
  id: string;
  label: string;
  icon: IconType;
  text: string;
  effect: ExpressionEffect;
  palette: ExpressionPalette;
};

/** Neutral fallback used for unknown ids (e.g. payloads from newer clients). */
export const DEFAULT_PALETTE: ExpressionPalette = {
  gradient: ['rgb(195,205,255)', 'rgb(217,192,255)', 'rgb(255,192,238)'],
  glow: 'bg-violet-500/10',
  iconGradient: 'from-indigo-400 to-violet-500',
};

export const EXPRESSIONS: Record<VibeId, Expression[]> = {
  classic: [],
  couple: [
    {
      id: 'love',
      label: 'Love you',
      icon: HiHeart,
      text: 'I love you',
      effect: 'hearts',
      palette: {
        gradient: ['rgb(255,120,160)', 'rgb(255,180,200)', 'rgb(255,120,220)'],
        glow: 'bg-pink-500/10',
        iconGradient: 'from-pink-400 to-rose-500',
        pulse: true,
      },
    },
    {
      id: 'miss',
      label: 'Miss you',
      icon: HiFaceFrown,
      text: 'I miss you',
      effect: 'hearts',
      palette: {
        gradient: ['rgb(120,140,255)', 'rgb(180,170,255)', 'rgb(255,160,210)'],
        glow: 'bg-indigo-500/10',
        iconGradient: 'from-indigo-400 to-violet-500',
      },
    },
    {
      id: 'like',
      label: 'Like you',
      icon: HiHandThumbUp,
      text: 'I like you',
      effect: 'hearts',
      palette: {
        gradient: ['rgb(120,190,255)', 'rgb(160,220,255)', 'rgb(120,240,255)'],
        glow: 'bg-sky-500/10',
        iconGradient: 'from-sky-400 to-cyan-500',
      },
    },
    {
      id: 'hug',
      label: 'Big hug',
      icon: HiSparkles,
      text: 'Sending you the biggest hug',
      effect: 'confetti',
      palette: {
        gradient: ['rgb(255,190,120)', 'rgb(255,170,200)', 'rgb(200,170,255)'],
        glow: 'bg-orange-500/10',
        iconGradient: 'from-orange-400 to-purple-500',
      },
    },
  ],
  friends: [
    {
      id: 'gooo',
      label: "Let's go",
      icon: HiRocketLaunch,
      text: "LET'S GOOO",
      effect: 'confetti',
      palette: {
        gradient: ['rgb(80,255,200)', 'rgb(80,220,255)', 'rgb(100,180,255)'],
        glow: 'bg-cyan-500/10',
        iconGradient: 'from-emerald-400 to-cyan-500',
      },
    },
    {
      id: 'legend',
      label: 'Legend',
      icon: HiTrophy,
      text: "You're a legend",
      effect: 'confetti',
      palette: {
        gradient: ['rgb(255,220,120)', 'rgb(255,200,80)', 'rgb(255,160,60)'],
        glow: 'bg-amber-500/10',
        iconGradient: 'from-yellow-400 to-orange-500',
      },
    },
    {
      id: 'party',
      label: 'Party',
      icon: HiFire,
      text: 'Party time',
      effect: 'confetti',
      palette: {
        gradient: ['rgb(255,120,120)', 'rgb(255,220,100)', 'rgb(160,120,255)'],
        glow: 'bg-fuchsia-500/10',
        iconGradient: 'from-pink-500 to-violet-500',
      },
    },
  ],
  professional: [
    {
      id: 'approved',
      label: 'Approve',
      icon: HiCheckBadge,
      text: 'Approved',
      effect: 'none',
      palette: {
        gradient: ['rgb(120,190,255)', 'rgb(160,220,255)', 'rgb(190,230,255)'],
        glow: 'bg-blue-500/10',
        iconGradient: 'from-blue-500 to-sky-500',
      },
    },
    {
      id: 'onit',
      label: 'On it',
      icon: HiBolt,
      text: "On it — I'll update you shortly.",
      effect: 'none',
      palette: {
        gradient: ['rgb(190,150,255)', 'rgb(220,170,255)', 'rgb(170,120,255)'],
        glow: 'bg-violet-500/10',
        iconGradient: 'from-violet-500 to-purple-500',
      },
    },
    {
      id: 'thanks',
      label: 'Thanks',
      icon: HiHandRaised,
      text: 'Thank you, much appreciated.',
      effect: 'none',
      palette: {
        gradient: ['rgb(120,255,170)', 'rgb(170,255,200)', 'rgb(120,230,180)'],
        glow: 'bg-emerald-500/10',
        iconGradient: 'from-emerald-500 to-green-500',
      },
    },
  ],
};

const ALL = Object.values(EXPRESSIONS).flat();
const BY_ID = new Map(ALL.map((e) => [e.id, e]));

/** Look up an expression by payload id (for rendering received bubbles). */
export function expressionById(id: string): Expression | undefined {
  return BY_ID.get(id);
}

/** Palette for an expression id, falling back to {@link DEFAULT_PALETTE}. */
export function paletteById(id: string): ExpressionPalette {
  return BY_ID.get(id)?.palette ?? DEFAULT_PALETTE;
}

export const VIBES: {
  id: VibeId;
  label: string;
  icon: IconType;
  blurb: string;
}[] = [
  { id: 'classic', label: 'Classic', icon: HiChatBubbleLeftRight, blurb: 'Just great messaging' },
  { id: 'couple', label: 'Couple', icon: HiHeart, blurb: 'Hearts, love notes & confetti' },
  { id: 'friends', label: 'Friends', icon: HiFire, blurb: 'Hype, fire & celebrations' },
  { id: 'professional', label: 'Professional', icon: HiBriefcase, blurb: 'Calm, focused quick replies' },
];
