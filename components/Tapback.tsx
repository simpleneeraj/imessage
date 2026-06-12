import type { IconType } from "react-icons";
import {
  IoHeart,
  IoHeartCircle,
  IoHeartHalf,
  IoThumbsUp,
  IoThumbsDown,
  IoHappy,
  IoAlertCircle,
  IoHelpCircle,
  IoFlame,
  IoSparkles,
  IoEye,
  IoStar,
  IoRocket,
  IoCheckmarkCircle,
  IoBulb,
  IoTrophy,
} from "react-icons/io5";

// Every reaction is an icon. The stored value is a stable token name mapped to
// an io5 icon here, so all viewers render the same glyph regardless of which
// set the reactor used.
const TAPBACK_ICONS: Record<string, IconType> = {
  heart: IoHeart,
  like: IoThumbsUp,
  dislike: IoThumbsDown,
  haha: IoHappy,
  emphasis: IoAlertCircle,
  question: IoHelpCircle,
  heartcircle: IoHeartCircle,
  hearthalf: IoHeartHalf,
  fire: IoFlame,
  sparkles: IoSparkles,
  eye: IoEye,
  star: IoStar,
  rocket: IoRocket,
  check: IoCheckmarkCircle,
  bulb: IoBulb,
  trophy: IoTrophy,
};

export type ReactionSetId = "classic" | "couple" | "friends" | "professional";

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
    items: ["heart", "heartcircle", "fire", "sparkles", "hearthalf", "haha"],
  },
  friends: {
    label: "Friends",
    items: ["like", "fire", "haha", "eye", "star", "rocket"],
  },
  professional: {
    label: "Professional",
    items: ["like", "check", "star", "bulb", "trophy", "rocket"],
  },
};

export function TapbackGlyph({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const Icon = TAPBACK_ICONS[value] ?? IoHeart;
  return <Icon className={className} />;
}
