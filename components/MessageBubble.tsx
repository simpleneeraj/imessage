'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { IoArrowUndo, IoCall, IoImage, IoVideocam } from 'react-icons/io5';
import { cn } from '@/lib/utils';
import type { MessageRow } from '@/lib/group';
import type {
  Message,
  Profile,
  Reaction,
  ReactionKind,
  VibeId,
} from '@/lib/types';
import { Avatar } from './Avatar';
import { ReactionPicker } from './ReactionPicker';
import { ReactionBadges } from './ReactionBadges';
import { ExpressionBubble } from './ExpressionBubble';

const LONG_PRESS_MS = 450;

// Telegram-style reply quote: a rounded accent bar, the original sender's name
// in colour, and a one-line snippet on a tinted strip. Nested inside text
// bubbles; sits just above full-bleed attachment bubbles.
function ReplyQuote({
  mine,
  me,
  repliedTo,
  repliedSender,
  onJumpTo,
  className,
}: {
  mine: boolean;
  me: string;
  repliedTo: Message;
  repliedSender?: Profile;
  onJumpTo?: (messageId: string) => void;
  className?: string;
}) {
  const name =
    repliedSender?.id === me
      ? 'You'
      : (repliedSender?.display_name ?? 'Unknown');
  const isImage =
    repliedTo.payload?.kind === 'file' &&
    repliedTo.payload.mime?.startsWith('image/');
  const snippet = repliedTo.deleted_at
    ? 'Unsent message'
    : repliedTo.payload?.kind === 'file'
      ? isImage
        ? 'Photo'
        : (repliedTo.payload.name ?? 'Attachment')
      : (repliedTo.text ?? 'Message');

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onJumpTo?.(repliedTo.id);
      }}
      className={cn(
        'relative z-2 mb-1 flex max-w-full items-stretch gap-2 text-left active:opacity-70',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'w-0.75 shrink-0 rounded-full',
          mine ? 'bg-white/80' : 'bg-primary',
        )}
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[12px] font-semibold leading-tight',
            mine ? 'text-white' : 'text-primary',
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-[12px] leading-tight',
            mine ? 'text-white/85' : 'text-muted-foreground',
          )}
        >
          {isImage && <IoImage className="size-3 shrink-0" />}
          <span className="truncate">{snippet}</span>
        </span>
      </div>
    </button>
  );
}

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
  onJumpTo,
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
  /** Scroll to + flash the original message when its reply quote is tapped. */
  onJumpTo?: (messageId: string) => void;
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
  const call = message.payload?.kind === 'call' ? message.payload : null;

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
        <p className="py-1 text-[12px] italic text-muted-foreground">
          {mine
            ? 'You unsent a message.'
            : `${sender?.display_name ?? 'Someone'} unsent a message.`}
        </p>
      </div>
    );
  }

  if (call) {
    const Icon = call.media === 'video' ? IoVideocam : IoCall;
    const kind = call.media === 'video' ? 'Video' : 'Voice';
    const missed = call.outcome === 'missed';
    const mm = Math.floor(call.duration / 60);
    const ss = String(call.duration % 60).padStart(2, '0');
    const label = !missed
      ? `${kind} call · ${mm}:${ss}`
      : mine
        ? `${kind} call · No answer`
        : `Missed ${kind.toLowerCase()} call`;
    return (
      <div className="my-2 flex justify-center">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-[12px] font-medium backdrop-blur-xs',
            missed && !mine ? 'text-red-500' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </span>
      </div>
    );
  }

  const startPress = () => {
    if (message.status) return;
    pressTimer.current = setTimeout(() => setPickerOpen(true), LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  if (expression) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-1.5',
          isFirstInGroup ? 'mt-4' : 'mt-2',
          reactions.length > 0 && 'mt-7',
        )}
      >
        <div ref={bubbleRef} className="relative">
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

          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
            onContextMenu={(e) => {
              if (message.status) return;
              e.preventDefault();
              setPickerOpen(true);
            }}
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
          >
            <motion.div animate={{ y: [0, -3, 0] }}>
              <ExpressionBubble
                id={expression.id}
                text={message.text ?? expression.text}
                pending={pending}
              />
            </motion.div>
          </motion.div>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          {mine ? 'You' : (sender?.display_name ?? 'Unknown')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        isFirstInGroup ? 'mt-2' : 'mt-0.5',
        reactions.length > 0 && 'mt-5',
      )}
    >
      {showSenderLabel && (
        <div className="mb-0.5 pl-12 text-[11px] text-muted-foreground">
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
              'pointer-events-none absolute bottom-1 flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground',
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
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ x: dragX, touchAction: 'pan-y' }}
          drag={canSwipe ? 'x' : false}
          dragDirectionLock
          dragSnapToOrigin
          dragElastic={0.4}
          dragConstraints={
            mine ? { left: -80, right: 0 } : { left: 0, right: 80 }
          }
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

          {repliedTo && children && (
            <ReplyQuote
              mine={mine}
              me={me}
              repliedTo={repliedTo}
              repliedSender={repliedSender}
              onJumpTo={onJumpTo}
              className="self-start"
            />
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
              mine
                ? 'text-white [background:var(--bubble-bg)]'
                : 'bg-muted text-foreground',
              isLastInGroup && !children && 'tail',
              isLastInGroup && !children && (mine ? 'tail-out' : 'tail-in'),
              pending && 'opacity-60',
            )}
          >
            {repliedTo && !children && (
              <ReplyQuote
                mine={mine}
                me={me}
                repliedTo={repliedTo}
                repliedSender={repliedSender}
                onJumpTo={onJumpTo}
              />
            )}

            {children || (
              <span className="relative z-2 text-sm">
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
                'mt-0.5 text-[11px] text-muted-foreground',
                mine ? 'text-right' : 'text-left',
              )}
            >
              Edited
            </p>
          )}
        </motion.div>
      </div>

      {mine && message.status === 'queued' && isLastInGroup && (
        <div className="mt-0.5 text-right text-[11px] text-muted-foreground">
          Waiting for connection…
        </div>
      )}
    </div>
  );
}
