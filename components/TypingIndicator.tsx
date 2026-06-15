"use client";

import { motion } from "motion/react";
import { Avatar } from "./Avatar";
import type { Profile } from "@/lib/types";

function typingLabel(typists: Profile[]): string {
  const names = typists.map((p) => p.display_name.split(" ")[0]);
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more are typing…`;
}

export function TypingIndicator({
  typists,
  isGroup,
}: {
  typists: Profile[];
  isGroup: boolean;
}) {
  const first = typists[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="mt-2"
      data-testid="typing-indicator"
    >
      {isGroup && first && (
        <div className="mb-0.5 pl-12 text-[11px] text-muted-foreground">
          {typingLabel(typists)}
        </div>
      )}
      <div className="flex items-end">
        {first ? (
          <Avatar
            name={first.display_name}
            size={28}
            className="relative z-2 mr-2"
          />
        ) : (
          <div className="mr-2 w-7 shrink-0" aria-hidden />
        )}
        <div className="tail tail-in rounded-[18px] bg-muted px-4 py-3">
          <div className="relative z-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
                className="size-2 rounded-full bg-muted-foreground"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
