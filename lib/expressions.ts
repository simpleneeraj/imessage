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
export type Expression = {
  id: string;
  label: string;
  icon: IconType;
  text: string;
  effect: 'hearts' | 'confetti' | 'none';
};

export const EXPRESSIONS: Record<VibeId, Expression[]> = {
  classic: [],
  couple: [
    { id: 'love', label: 'Love you', icon: HiHeart, text: 'I love you', effect: 'hearts' },
    { id: 'miss', label: 'Miss you', icon: HiFaceFrown, text: 'I miss you', effect: 'hearts' },
    { id: 'like', label: 'Like you', icon: HiHandThumbUp, text: 'I like you', effect: 'hearts' },
    { id: 'hug', label: 'Big hug', icon: HiSparkles, text: 'Sending you the biggest hug', effect: 'confetti' },
  ],
  friends: [
    { id: 'gooo', label: "Let's go", icon: HiRocketLaunch, text: "LET'S GOOO", effect: 'confetti' },
    { id: 'legend', label: 'Legend', icon: HiTrophy, text: "You're a legend", effect: 'confetti' },
    { id: 'party', label: 'Party', icon: HiFire, text: 'Party time', effect: 'confetti' },
  ],
  professional: [
    { id: 'approved', label: 'Approve', icon: HiCheckBadge, text: 'Approved', effect: 'none' },
    { id: 'onit', label: 'On it', icon: HiBolt, text: "On it — I'll update you shortly.", effect: 'none' },
    { id: 'thanks', label: 'Thanks', icon: HiHandRaised, text: 'Thank you, much appreciated.', effect: 'none' },
  ],
};

const ALL = Object.values(EXPRESSIONS).flat();

/** Look up an expression by payload id (for rendering received bubbles). */
export function expressionById(id: string): Expression | undefined {
  return ALL.find((e) => e.id === id);
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
