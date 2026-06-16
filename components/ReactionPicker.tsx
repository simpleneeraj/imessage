'use client';

import type { RefObject } from 'react';
import { motion } from 'motion/react';
import {
  IoPencil,
  IoTrashOutline,
  IoArrowUndoOutline,
  IoCopyOutline,
} from 'react-icons/io5';
import type { Message, ReactionKind } from '@/lib/types';
import { REACTION_SETS, TapbackGlyph } from './Tapback';
import { Menu, MenuItem, MenuPopup } from '@/components/ui/menu';
import { iosMenu, iosMenuItem } from '@/components/ui/ios-menu';
import { cn } from '@/lib/utils';

// iMessage-style tapback + context menu, rendered through a coss Menu anchored
// to the bubble: a frosted reaction pill floating above a frosted action card.
const menu = iosMenu();

const META_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function ReactionPicker({
  open,
  mine,
  message,
  read,
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
  message: Message;
  /** Other participant(s) have read this (own messages) → "Read" vs "Delivered". */
  read?: boolean;
  myReaction: ReactionKind | null;
  anchor: RefObject<HTMLElement | null>;
  onPick: (kind: ReactionKind) => void;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
  onClose: () => void;
}) {
  // One fixed set of classic iMessage tapbacks, like iOS.
  const tapbacks = REACTION_SETS.classic.items;
  const canReply = !message.status && !message.deleted_at;
  const canCopy =
    !message.status && !message.deleted_at && Boolean(message.text);
  const canEdit = mine && message.payload?.kind !== 'file' && !message.status;
  const canUnsend = mine && !message.status;
  const hasActions = canReply || canCopy || canEdit || canUnsend;

  const copyText = () => {
    void navigator.clipboard?.writeText(message.text ?? '');
  };

  // Long-press caption: when this message was sent + its read/received state.
  const statusLabel = message.status
    ? message.status === 'queued'
      ? 'Waiting'
      : 'Sending'
    : mine
      ? read
        ? 'Read'
        : 'Delivered'
      : 'Received';
  const metaLabel = `${statusLabel} · ${META_FMT.format(new Date(message.created_at))}`;

  return (
    <Menu open={open} onOpenChange={(o) => !o && onClose()}>
      <MenuPopup
        anchor={anchor}
        side="top"
        align={mine ? 'end' : 'start'}
        sideOffset={10}
        // strip the default coss card; we render iOS-style frosted surfaces inside
        className={menu.popup()}
      >
        <div
          className={cn(
            'flex flex-col gap-2.5',
            mine ? 'items-end' : 'items-start',
          )}
        >
          {/* Time + read/received caption */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className={menu.surface({
              class:
                'rounded-full px-3 py-1 text-[11px] font-medium text-muted-foreground',
            })}
          >
            {metaLabel}
          </motion.div>

          {/* Reaction pill */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            className={menu.surface({
              class: 'flex items-center gap-1 rounded-full px-2 py-1.5',
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
                  type: 'spring',
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
                  'flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors',
                  myReaction === kind
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <TapbackGlyph value={kind} className="size-5 text-current" />
              </motion.button>
            ))}
          </motion.div>

          {/* Action card */}
          {hasActions && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 520,
                damping: 30,
                delay: 0.05,
              }}
              className={cn(
                menu.card({ class: 'w-56 origin-top' }),
                menu.group(),
              )}
            >
              {canReply && (
                <MenuItem className={iosMenuItem()} onClick={onReply}>
                  Reply
                  <IoArrowUndoOutline className="size-5 text-foreground" />
                </MenuItem>
              )}
              {canCopy && (
                <MenuItem className={iosMenuItem()} onClick={copyText}>
                  Copy
                  <IoCopyOutline className="size-5 text-foreground" />
                </MenuItem>
              )}
              {canEdit && (
                <MenuItem className={iosMenuItem()} onClick={onEdit}>
                  Edit
                  <IoPencil className="size-5 text-foreground" />
                </MenuItem>
              )}
              {canUnsend && (
                <MenuItem
                  className={iosMenuItem({ destructive: true })}
                  onClick={onUnsend}
                >
                  Unsend
                  <IoTrashOutline className="size-5" />
                </MenuItem>
              )}
            </motion.div>
          )}
        </div>
      </MenuPopup>
    </Menu>
  );
}
