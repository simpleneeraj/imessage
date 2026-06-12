'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { IoArrowUndo } from 'react-icons/io5';
import { cn } from '@/lib/utils';
import type { MessageRow } from '@/lib/group';
import type {
  Message,
  Profile,
  Reaction,
  ReactionKind,
  VibeId,
} from '@/lib/types';
import { expressionById } from '@/lib/expressions';
import { Avatar } from './Avatar';
import { ReactionPicker } from './ReactionPicker';
import { ReactionBadges } from './ReactionBadges';

const LONG_PRESS_MS = 450;

export function MessageBubble({
  row,
  sender,
  me,
  vibe = 'classic',
  reactions,
  repliedTo,
  repliedSender,
  onReact,
  onReply,
  onUnsend,
  onEdit,
  children,
}: {
  row: MessageRow;
  sender: Profile | undefined;
  me: string;
  vibe?: VibeId;
  reactions: Reaction[];
  repliedTo?: Message;
  repliedSender?: Profile;
  onReact: (messageId: string, kind: ReactionKind) => void;
  onReply: (message: Message) => void;
  onUnsend: (message: Message) => void;
  onEdit: (message: Message) => void;
  /** Attachment bubbles render here instead of text. */
  children?: React.ReactNode;
}) {
  const {
    message,
    mine,
    isFirstInGroup,
    isLastInGroup,
    showSenderLabel,
    showAvatar,
  } = row;
  const [pickerOpen, setPickerOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const pending = message.status === 'sending' || message.status === 'queued';
  const myReaction = reactions.find((r) => r.user_id === me)?.reaction ?? null;
  const canSwipe = !message.status && !message.deleted_at;
  const expression =
    message.payload?.kind === 'expression' ? message.payload : null;

  // Swipe-to-reply: drag the bubble toward its leading edge to reveal an arrow;
  // released past the threshold it fires onReply. mine swipes left, others right.
  const SWIPE_THRESHOLD = 56;
  const dragX = useMotionValue(0);
  const arrowOpacity = useTransform(
    dragX,
    mine ? [-SWIPE_THRESHOLD, -16] : [16, SWIPE_THRESHOLD],
    mine ? [1, 0] : [0, 1],
  );
  const arrowScale = useTransform(
    dragX,
    mine ? [-SWIPE_THRESHOLD, -24] : [24, SWIPE_THRESHOLD],
    mine ? [1, 0.4] : [0.4, 1],
  );

  if (message.deleted_at) {
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start pl-9')}>
        <p className="py-1 text-[12px] italic text-imsg-text-gray">
          {mine
            ? 'You unsent a message.'
            : `${sender?.display_name ?? 'Someone'} unsent a message.`}
        </p>
      </div>
    );
  }

  const startPress = () => {
    if (message.status) return; // can't react to unsent-yet messages
    pressTimer.current = setTimeout(() => setPickerOpen(true), LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div
      className={cn(
        isFirstInGroup ? 'mt-2' : 'mt-0.5',
        reactions.length > 0 && 'mt-5',
      )}
    >
      {showSenderLabel && (
        <div className="mb-0.5 pl-12 text-[11px] text-imsg-text-gray">
          {sender?.display_name ?? 'Unknown'}
        </div>
      )}

      <div
        className={cn(
          'relative flex items-end',
          mine ? 'justify-end' : 'justify-start',
        )}
      >
        {canSwipe && (
          <motion.span
            aria-hidden
            style={{ opacity: arrowOpacity, scale: arrowScale }}
            className={cn(
              'pointer-events-none absolute bottom-1 flex size-7 items-center justify-center rounded-full bg-imsg-gray text-imsg-text-gray',
              // received rows have a 36px avatar gutter — keep the arrow clear of it
              mine ? 'right-1' : 'left-10',
            )}
          >
            <IoArrowUndo className="size-4" />
          </motion.span>
        )}

        {!mine &&
          (showAvatar ? (
            <Avatar
              name={sender?.display_name ?? '?'}
              size={28}
              className="relative z-2 mr-2"
            />
          ) : (
            <div className="mr-2 w-7 shrink-0" aria-hidden />
          ))}

        <motion.div
          initial={
            mine && message.status ? { scale: 0.85, y: 8, opacity: 0.6 } : false
          }
          animate={{ scale: 1, y: 0, opacity: 1 }}
          whileHover={{ scale: 1.015 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ x: dragX, touchAction: 'pan-y' }}
          drag={canSwipe ? 'x' : false}
          dragDirectionLock
          dragSnapToOrigin
          dragElastic={0.4}
          dragConstraints={mine ? { left: -80, right: 0 } : { left: 0, right: 80 }}
          onDragStart={cancelPress}
          onDragEnd={(_, info) => {
            const past = mine
              ? info.offset.x <= -SWIPE_THRESHOLD
              : info.offset.x >= SWIPE_THRESHOLD;
            if (past) onReply(message);
          }}
          className={cn(
            'relative flex max-w-[75%] cursor-grab flex-col active:cursor-grabbing',
            mine ? 'items-end' : 'items-start',
          )}
        >
          <ReactionBadges reactions={reactions} mine={mine} me={me} />
          <ReactionPicker
            open={pickerOpen}
            mine={mine}
            vibe={vibe}
            message={message}
            myReaction={myReaction}
            anchor={bubbleRef}
            onPick={(kind) => onReact(message.id, kind)}
            onReply={() => onReply(message)}
            onEdit={() => onEdit(message)}
            onUnsend={() => onUnsend(message)}
            onClose={() => setPickerOpen(false)}
          />

          {repliedTo && (
            <div
              className={cn(
                'mb-0.5 max-w-full rounded-[14px] px-3 py-1 text-[13px] backdrop-blur-xs',
                mine
                  ? 'bg-imsg-gray/70 text-imsg-text-gray'
                  : 'bg-imsg-gray/70 text-imsg-text-gray',
              )}
            >
              <span className="block text-[11px] font-semibold text-imsg-blue">
                {repliedSender?.id === me
                  ? 'You'
                  : (repliedSender?.display_name ?? 'Unknown')}
              </span>
              <span className="line-clamp-1 wrap-anywhere">
                {repliedTo.deleted_at
                  ? 'Unsent message'
                  : repliedTo.payload?.kind === 'file'
                    ? 'Attachment'
                    : (repliedTo.text ?? 'Message')}
              </span>
            </div>
          )}

          <div
            ref={bubbleRef}
            onContextMenu={(e) => {
              if (message.status) return;
              e.preventDefault();
              setPickerOpen(true);
            }}
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            className={cn(
              'select-none rounded-[18px] text-[17px] leading-5',
              children
                ? 'overflow-hidden'
                : 'px-3.5 py-1.75 whitespace-pre-wrap wrap-anywhere',
              // background (not bg-color) so themed gradients paint too
              mine
                ? 'text-white [background:var(--imsg-bubble-out-bg)]'
                : 'bg-imsg-gray text-foreground',
              // expressions render oversized; gradient replaces the tail
              expression && 'rounded-[22px] px-4.5 py-2.5 text-[21px] leading-7',
              isLastInGroup && !children && !expression && 'tail',
              isLastInGroup &&
                !children &&
                !expression &&
                (mine ? 'tail-out' : 'tail-in'),
              pending && 'opacity-60',
            )}
            style={
              expression && mine && expression.effect !== 'none'
                ? {
                    background:
                      expression.effect === 'hearts'
                        ? 'linear-gradient(135deg, #ff375f, #af52de)'
                        : 'linear-gradient(135deg, #5e5ce6, #af52de)',
                  }
                : undefined
            }
          >
            {children || (
              <span
                className={cn(
                  'relative z-2',
                  expression && 'flex items-center gap-2',
                )}
              >
                {expression &&
                  (() => {
                    const Icon = expressionById(expression.id)?.icon;
                    return Icon ? <Icon className="size-6 shrink-0" /> : null;
                  })()}
                {message.text === null ? (
                  <span className="italic opacity-70">Unable to decrypt</span>
                ) : (
                  (message.text ?? '…')
                )}
              </span>
            )}
          </div>

          {message.edited_at && (
            <p
              className={cn(
                'mt-0.5 text-[11px] text-imsg-text-gray',
                mine ? 'text-right' : 'text-left',
              )}
            >
              Edited
            </p>
          )}
        </motion.div>
      </div>

      {mine && message.status === 'queued' && isLastInGroup && (
        <div className="mt-0.5 text-right text-[11px] text-imsg-text-gray">
          Waiting for connection…
        </div>
      )}
    </div>
  );
}
