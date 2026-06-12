"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Reaction } from "@/lib/types";
import { TapbackGlyph } from "./Tapback";
import { cn } from "@/lib/utils";

// Tapback badges overlapping the bubble's top corner, iMessage style:
// on the opposite side of the bubble's alignment.
export function ReactionBadges({
  reactions,
  mine,
  me,
}: {
  reactions: Reaction[];
  mine: boolean;
  me: string;
}) {
  if (reactions.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute -top-4 z-3 flex",
        mine ? "-left-3 flex-row" : "-right-3 flex-row-reverse"
      )}
    >
      <AnimatePresence>
        {reactions.slice(0, 3).map((r, i) => {
          const isMine = r.user_id === me;
          return (
            <motion.span
              key={`${r.user_id}-${r.reaction}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              style={{ zIndex: 3 - i }}
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-[11px] font-bold shadow-sm ring-2 ring-[var(--imsg-chat-bg)]",
                i > 0 && (mine ? "-ml-2.5" : "-mr-2.5"),
                isMine
                  ? "bg-imsg-blue text-white"
                  : "bg-imsg-gray text-imsg-text-gray dark:bg-[#2c2c2e]"
              )}
            >
              <TapbackGlyph value={r.reaction} className="size-3.5 text-current" />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
