"use client";

import type { RefObject } from "react";
import { motion } from "motion/react";
import { IoPencil, IoTrashOutline, IoArrowUndoOutline } from "react-icons/io5";
import type { Message, ReactionKind, VibeId } from "@/lib/types";
import { REACTION_SETS, TapbackGlyph } from "./Tapback";
import { useReactionSet } from "@/lib/reactionSet";
import { Menu, MenuItem, MenuPopup } from "@/components/ui/menu";
import { iosMenu, iosMenuItem } from "@/components/ui/ios-menu";
import { cn } from "@/lib/utils";

// iMessage-style tapback + context menu, rendered through a coss Menu anchored
// to the bubble: a frosted reaction pill floating above a frosted action card.
const menu = iosMenu();

export function ReactionPicker({
  open,
  mine,
  vibe = "classic",
  message,
  myReaction,
  anchor,
  onPick,
  onReply,
  onEdit,
  onUnsend,
  onClose,
}: {
  open: boolean;
  mine: boolean;
  vibe?: VibeId;
  message: Message;
  myReaction: ReactionKind | null;
  anchor: RefObject<HTMLElement | null>;
  onPick: (kind: ReactionKind) => void;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
  onClose: () => void;
}) {
  const localSet = useReactionSet();
  // a non-classic chat vibe brings its matching reaction set with it
  const setId = vibe !== "classic" ? vibe : localSet;
  const tapbacks = REACTION_SETS[setId].items;
  const canReply = !message.status && !message.deleted_at;
  const canEdit = mine && message.payload?.kind !== "file" && !message.status;
  const canUnsend = mine && !message.status;
  const hasActions = canReply || canEdit || canUnsend;

  return (
    <Menu open={open} onOpenChange={(o) => !o && onClose()}>
      <MenuPopup
        anchor={anchor}
        side="top"
        align={mine ? "end" : "start"}
        sideOffset={10}
        // strip the default coss card; we render iOS-style frosted surfaces inside
        className={menu.popup()}
      >
        <div
          className={cn(
            "flex flex-col gap-2.5",
            mine ? "items-end" : "items-start"
          )}
        >
          {/* Reaction pill */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
            className={menu.surface({
              class: "flex items-center gap-1 rounded-full px-2 py-1.5",
            })}
          >
            {tapbacks.map((kind, i) => (
              <motion.button
                key={kind}
                type="button"
                aria-label={`React ${kind}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 22,
                  delay: 0.02 * i,
                }}
                whileHover={{ scale: 1.3, y: -4 }}
                whileTap={{ scale: 1.1 }}
                onClick={() => {
                  onPick(kind);
                  onClose();
                }}
                className={cn(
                  "flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors",
                  myReaction === kind
                    ? "bg-imsg-blue text-white"
                    : "text-imsg-text-gray hover:text-foreground"
                )}
              >
                <TapbackGlyph value={kind} className="size-[22px] text-current" />
              </motion.button>
            ))}
          </motion.div>

          {/* Action card */}
          {hasActions && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 30, delay: 0.05 }}
              className={cn(
                menu.card({ class: "w-56 origin-top" }),
                menu.group()
              )}
            >
              {canReply && (
                <MenuItem className={iosMenuItem()} onClick={onReply}>
                  Reply
                  <IoArrowUndoOutline className="size-[22px] text-foreground" />
                </MenuItem>
              )}
              {canEdit && (
                <MenuItem className={iosMenuItem()} onClick={onEdit}>
                  Edit
                  <IoPencil className="size-[20px] text-foreground" />
                </MenuItem>
              )}
              {canUnsend && (
                <MenuItem
                  className={iosMenuItem({ destructive: true })}
                  onClick={onUnsend}
                >
                  Unsend
                  <IoTrashOutline className="size-[20px]" />
                </MenuItem>
              )}
            </motion.div>
          )}
        </div>
      </MenuPopup>
    </Menu>
  );
}
