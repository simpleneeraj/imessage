import type { IconType } from "react-icons";
import {
  HiAcademicCap,
  HiBadgeCheck,
  HiBell,
  HiBriefcase,
  HiCake,
  HiCamera,
  HiChartBar,
  HiCheckCircle,
  HiClipboardCheck,
  HiClock,
  HiCloud,
  HiColorSwatch,
  HiCurrencyDollar,
  HiEmojiHappy,
  HiEmojiSad,
  HiExclamationCircle,
  HiEye,
  HiFire,
  HiFlag,
  HiGift,
  HiGlobe,
  HiHand,
  HiHeart,
  HiKey,
  HiLightBulb,
  HiLightningBolt,
  HiMap,
  HiMicrophone,
  HiMoon,
  HiMusicNote,
  HiNewspaper,
  HiPaperAirplane,
  HiPhotograph,
  HiPuzzle,
  HiQuestionMarkCircle,
  HiScale,
  HiShieldCheck,
  HiSparkles,
  HiStar,
  HiSun,
  HiThumbDown,
  HiThumbUp,
  HiTicket,
  HiTrendingUp,
  HiTruck,
} from "react-icons/hi";

// Every reaction is an icon. The stored value is a stable token name mapped to
// a Heroicon here, so all viewers render the same glyph regardless of which set
// the reactor used. Tokens are forever — never repurpose one, only add new ones.
const TAPBACK_ICONS: Record<string, IconType> = {
  // Classic — expressive iMessage-style tapbacks
  heart: HiHeart,
  like: HiThumbUp,
  dislike: HiThumbDown,
  haha: HiEmojiHappy,
  emphasis: HiExclamationCircle,
  question: HiQuestionMarkCircle,

  // Couple — warmth & romance (also reuses `heart` from Classic)
  sparkles: HiSparkles,
  fire: HiFire,
  gift: HiGift,
  cake: HiCake,
  moon: HiMoon,

  // Friends — hype & play
  star: HiStar,
  bolt: HiLightningBolt,
  flag: HiFlag,
  eye: HiEye,
  bell: HiBell,
  hand: HiHand,

  // Professional — work acknowledgements
  approve: HiBadgeCheck,
  bulb: HiLightBulb,
  trending: HiTrendingUp,
  clipboard: HiClipboardCheck,
  news: HiNewspaper,
  gradcap: HiAcademicCap,

  // Hustle — money & work energy
  cash: HiCurrencyDollar,
  chart: HiChartBar,
  briefcase: HiBriefcase,
  clock: HiClock,
  key: HiKey,
  scale: HiScale,

  // Creative — maker vibes
  palette: HiColorSwatch,
  camera: HiCamera,
  photo: HiPhotograph,
  mic: HiMicrophone,
  music: HiMusicNote,
  puzzle: HiPuzzle,

  // Travel — on the go
  globe: HiGlobe,
  map: HiMap,
  ticket: HiTicket,
  cloud: HiCloud,
  truck: HiTruck,
  plane: HiPaperAirplane,

  // Legacy / spare tokens — kept so historical reactions still render after the
  // Heroicons migration. Not offered in any set anymore.
  sun: HiSun,
  sad: HiEmojiSad,
  check: HiCheckCircle,
  shield: HiShieldCheck,
  rocket: HiPaperAirplane,
  trophy: HiStar,
  heartcircle: HiHeart,
  hearthalf: HiHeart,
};

export type ReactionSetId =
  | "classic"
  | "couple"
  | "friends"
  | "professional"
  | "hustle"
  | "creative"
  | "travel";

// Curated sets. Glyphs are unique within a set; across sets they're distinct
// too, except `heart` — intentionally shared by Classic and Couple as the
// universal love icon (a romance set without a heart felt wrong).
export const REACTION_SETS: Record<
  ReactionSetId,
  { label: string; items: string[] }
> = {
  classic: {
    label: "Classic",
    items: ["heart", "like", "dislike", "haha", "emphasis", "question"],
  },
  couple: {
    label: "Couple",
    items: ["heart", "sparkles", "fire", "gift", "cake", "moon"],
  },
  friends: {
    label: "Friends",
    items: ["star", "bolt", "flag", "eye", "bell", "hand"],
  },
  professional: {
    label: "Professional",
    items: ["approve", "bulb", "trending", "clipboard", "news", "gradcap"],
  },
  hustle: {
    label: "Hustle",
    items: ["cash", "chart", "briefcase", "clock", "key", "scale"],
  },
  creative: {
    label: "Creative",
    items: ["palette", "camera", "photo", "mic", "music", "puzzle"],
  },
  travel: {
    label: "Travel",
    items: ["globe", "map", "ticket", "cloud", "truck", "plane"],
  },
};

export function TapbackGlyph({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const Icon = TAPBACK_ICONS[value] ?? HiHeart;
  return <Icon className={className} />;
}
