'use client';

import { useEffect, useRef, useState } from 'react';
import {
  IoAdd,
  IoArrowUp,
  IoCloseCircle,
  IoDocumentOutline,
  IoImagesOutline,
  IoMic,
  IoMicOutline,
} from 'react-icons/io5';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { iosMenu, iosMenuItem } from '@/components/ui/ios-menu';
import { useOnline } from '@/lib/useOnline';
import { useDictation } from '@/lib/useDictation';
import { MAX_FILE_BYTES, formatBytes } from '@/lib/attachments';
import { EXPRESSIONS, type Expression } from '@/lib/expressions';
import type { Message, VibeId } from '@/lib/types';
import { cn } from '@/lib/utils';

type Staged = { file: File; viewOnce: boolean; previewUrl: string | null };

const menu = iosMenu();

// iMessage input bar: "+" attach button, pill field with "iMessage"
// placeholder, mic icon swapping to the blue ↑ send button when typing.
export function Composer({
  onSend,
  onSendFile,
  onTyping,
  replyingTo,
  replyName,
  onCancelReply,
  vibe = 'classic',
  onExpression,
  placeholder = 'iMessage',
}: {
  onSend: (body: string) => void;
  onSendFile?: (file: File, viewOnce: boolean) => Promise<void>;
  onTyping?: () => void;
  replyingTo?: Message | null;
  replyName?: string;
  onCancelReply?: () => void;
  vibe?: VibeId;
  onExpression?: (e: Expression) => void;
  placeholder?: string;
}) {
  const expressions = EXPRESSIONS[vibe];
  const [value, setValue] = useState('');
  const [sugIndex, setSugIndex] = useState(0);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const online = useOnline();
  const canSend = value.trim().length > 0 || (staged !== null && !uploading);

  // Dictation: speech lands in the input live; finalized + interim text is
  // appended to whatever was typed before the mic started.
  const dictBase = useRef('');
  const { listening, start, stop } = useDictation((finalText, interim) => {
    setValue(dictBase.current + finalText + interim);
    requestAnimationFrame(autoGrow);
    onTyping?.();
  });

  function toggleMic() {
    if (listening) {
      stop();
      return;
    }
    setError('');
    dictBase.current = value ? `${value.trimEnd()} ` : '';
    if (!start()) {
      setError("Dictation isn't supported in this browser.");
    }
  }

  function pickFile(accept: string) {
    const el = fileRef.current;
    if (!el) return;
    el.accept = accept;
    el.click();
  }

  // "/" autocomplete: typing "/lo" filters the vibe's expression presets.
  const slash = /^\/(\w*)$/.exec(value);
  const suggestions =
    slash && onExpression
      ? expressions.filter((e) =>
          `${e.id} ${e.label} ${e.text}`
            .toLowerCase()
            .includes(slash[1].toLowerCase()),
        )
      : [];
  const activeSug = Math.min(sugIndex, Math.max(suggestions.length - 1, 0));

  function pickSuggestion(e: (typeof suggestions)[number]) {
    onExpression?.(e);
    setValue('');
    setSugIndex(0);
    requestAnimationFrame(autoGrow);
    textareaRef.current?.focus();
  }

  useEffect(
    () => () => {
      if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    },
    [staged],
  );

  // Jump straight into the input when a reply target is set (e.g. swipe-to-reply).
  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus once per distinct reply target
  }, [replyingTo?.id]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function stage(file: File) {
    setError('');
    if (file.size > MAX_FILE_BYTES) {
      setError(`Files up to ${formatBytes(MAX_FILE_BYTES)} are supported.`);
      return;
    }
    setStaged({
      file,
      viewOnce: false,
      previewUrl: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null,
    });
  }

  async function submit() {
    if (uploading) return;
    if (listening) stop();
    setError('');

    if (staged && onSendFile) {
      setUploading(true);
      try {
        await onSendFile(staged.file, staged.viewOnce);
        if (staged.previewUrl) URL.revokeObjectURL(staged.previewUrl);
        setStaged(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const body = value.trim();
    if (body) {
      setValue('');
      requestAnimationFrame(autoGrow);
      onSend(body);
    }
    textareaRef.current?.focus();
  }

  return (
    <div className="shrink-0 bg-(--imsg-chat-bg) px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
      <div className="mx-auto w-full max-w-2xl">
        {error && (
          <p className="px-1 pb-1 text-[12px] text-destructive">{error}</p>
        )}

        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-2 flex items-center gap-2 rounded-[14px] border-l-[3px] border-imsg-blue bg-imsg-gray/60 px-3 py-2 backdrop-blur-xs"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold text-imsg-blue">
                  Replying to {replyName}
                </span>
                <span className="block truncate text-[13px] text-imsg-text-gray">
                  {replyingTo.payload?.kind === 'file'
                    ? 'Attachment'
                    : (replyingTo.text ?? 'Message')}
                </span>
              </span>
              <button
                type="button"
                aria-label="Cancel reply"
                onClick={onCancelReply}
                className="shrink-0 text-imsg-text-gray active:opacity-60"
              >
                <IoCloseCircle className="size-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {staged && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-2 flex items-center gap-3 rounded-[14px] bg-imsg-gray/60 p-2"
            >
              {staged.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img
                  src={staged.previewUrl}
                  alt=""
                  className="size-14 rounded-[10px] object-cover"
                />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-[10px] bg-black/5 dark:bg-white/10">
                  <IoDocumentOutline className="size-6 text-imsg-text-gray" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {staged.file.name}
                </span>
                <span className="block text-[12px] text-imsg-text-gray">
                  {formatBytes(staged.file.size)}
                  {uploading && ' — encrypting & uploading…'}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setStaged({ ...staged, viewOnce: !staged.viewOnce })
                }
                aria-pressed={staged.viewOnce}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold',
                  staged.viewOnce
                    ? 'border-imsg-blue bg-imsg-blue text-white'
                    : 'border-imsg-chevron text-imsg-text-gray',
                )}
                title="View once"
              >
                1
              </button>
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setStaged(null)}
                className="shrink-0 text-imsg-text-gray active:opacity-60"
              >
                <IoCloseCircle className="size-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2.5">
          {/* "/" preset suggestions (frosted iOS card above the input) */}
          {suggestions.length > 0 && (
            <div
              className={menu.card({
                class: 'absolute bottom-full left-11 right-0 z-20 mb-2',
              })}
            >
              <div className={menu.group()}>
                {suggestions.map((e, i) => (
                  <button
                    key={e.id}
                    type="button"
                    onMouseEnter={() => setSugIndex(i)}
                    onClick={() => pickSuggestion(e)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left',
                      i === activeSug && 'bg-black/5 dark:bg-white/10',
                    )}
                  >
                    <e.icon className="size-5.5 shrink-0 text-imsg-blue" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">
                        /{e.id}
                        <span className="ml-2 text-[13px] font-normal text-imsg-text-gray">
                          {e.label}
                        </span>
                      </span>
                      <span className="block truncate text-[13px] text-imsg-text-gray">
                        {e.text}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) stage(file);
              e.target.value = '';
            }}
          />
          {/* "+" feature menu (iOS frosted card) — new features slot in here */}
          <Menu>
            <MenuTrigger
              aria-label="Add"
              disabled={!online || !onSendFile}
              title={online ? 'Add to message' : 'Attachments need a connection'}
              className="mb-0.75 flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-imsg-gray text-imsg-text-gray active:opacity-60 disabled:opacity-40"
            >
              <IoAdd className="size-5.5" />
            </MenuTrigger>
            <MenuPopup
              align="start"
              side="top"
              sideOffset={8}
              className={menu.popup()}
            >
              <div className={menu.card({ class: 'w-60' })}>
                <div className={menu.group()}>
                  <MenuItem
                    onClick={() => pickFile('image/*,video/*')}
                    className={iosMenuItem()}
                  >
                    Photo or Video
                    <IoImagesOutline className="size-5.5 text-foreground" />
                  </MenuItem>
                  <MenuItem
                    onClick={() => pickFile('')}
                    className={iosMenuItem()}
                  >
                    Document
                    <IoDocumentOutline className="size-5.5 text-foreground" />
                  </MenuItem>
                </div>

                {/* vibe expressions — one tap, full-screen effect on both sides */}
                {expressions.length > 0 && onExpression && (
                  <>
                    <div className={menu.separator()} />
                    <div className={menu.group()}>
                      {expressions.map((e) => (
                        <MenuItem
                          key={e.id}
                          onClick={() => onExpression(e)}
                          className={iosMenuItem()}
                        >
                          {e.label}
                          <e.icon className="size-5.5 text-foreground" />
                        </MenuItem>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </MenuPopup>
          </Menu>

          <div className="relative flex min-h-9 flex-1 items-center rounded-[18px] border border-imsg-chevron/60 bg-(--imsg-chat-bg) backdrop-blur">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                autoGrow();
                if (e.target.value.trim()) onTyping?.();
              }}
              onKeyDown={(e) => {
                if (suggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSugIndex((i) => (i + 1) % suggestions.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSugIndex(
                      (i) => (i - 1 + suggestions.length) % suggestions.length,
                    );
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    pickSuggestion(suggestions[activeSug]);
                    return;
                  }
                  if (e.key === 'Escape') {
                    setValue('');
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              placeholder={placeholder}
              enterKeyHint="send"
              maxLength={4000}
              className="max-h-30 flex-1 resize-none bg-transparent py-1.5 pl-3.5 pr-9 text-[17px] leading-5.5 outline-none placeholder:text-imsg-text-gray"
            />

            <AnimatePresence initial={false} mode="popLayout">
              {listening ? (
                // dictating: red pulsing mic, tap to stop — stays visible even
                // while speech fills the input
                <motion.button
                  key="listening"
                  type="button"
                  aria-label="Stop dictation"
                  onClick={stop}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1, 1.12, 1], opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{
                    scale: { repeat: Infinity, duration: 1.2 },
                    opacity: { duration: 0.15 },
                  }}
                  className="absolute bottom-0.75 right-0.75 flex size-7.25 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white active:opacity-70"
                >
                  <IoMic className="size-4.5" />
                </motion.button>
              ) : canSend ? (
                <motion.button
                  key="send"
                  type="button"
                  aria-label="Send"
                  onClick={() => void submit()}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                  className="absolute bottom-0.75 right-0.75 flex size-7.25 cursor-pointer items-center justify-center rounded-full bg-imsg-blue text-white active:opacity-70"
                >
                  <IoArrowUp className="size-4.5" />
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  type="button"
                  aria-label="Dictate"
                  onClick={toggleMic}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-1.5 right-2.5 cursor-pointer text-imsg-text-gray active:opacity-60"
                >
                  <IoMicOutline className="size-5.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
