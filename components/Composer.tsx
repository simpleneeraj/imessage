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

  async function stage(file: File) {
    setError('');
    if (file.size > MAX_FILE_BYTES) {
      setError(`Files up to ${formatBytes(MAX_FILE_BYTES)} are supported.`);
      return;
    }
    let stable: File;
    try {
      const bytes = await file.arrayBuffer();
      stable = new File([bytes], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      });
    } catch {
      setError('Could not read that file. Please pick it again.');
      return;
    }
    setStaged({
      file: stable,
      viewOnce: false,
      previewUrl: stable.type.startsWith('image/')
        ? URL.createObjectURL(stable)
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
    <div className="shrink-0 bg-(--chat-bg) px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
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
              className="mb-2 flex items-center gap-2 rounded-[14px] border-l-[3px] border-primary bg-muted/60 px-3 py-2 backdrop-blur-xs"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold text-primary">
                  Replying to {replyName}
                </span>
                <span className="block truncate text-[13px] text-muted-foreground">
                  {replyingTo.payload?.kind === 'file'
                    ? 'Attachment'
                    : (replyingTo.text ?? 'Message')}
                </span>
              </span>
              <button
                type="button"
                aria-label="Cancel reply"
                onClick={onCancelReply}
                className="shrink-0 text-muted-foreground active:opacity-60"
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
              className="mb-2 flex items-center gap-3 rounded-[14px] bg-muted/60 p-2"
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
                  <IoDocumentOutline className="size-6 text-muted-foreground" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {staged.file.name}
                </span>
                <span className="block text-[12px] text-muted-foreground">
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
                    ? 'border-primary bg-primary text-white'
                    : 'border-ring text-muted-foreground',
                )}
                title="View once"
              >
                1
              </button>
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setStaged(null)}
                className="shrink-0 text-muted-foreground active:opacity-60"
              >
                <IoCloseCircle className="size-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2.5">
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
                    <e.icon className="size-5.5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">
                        /{e.id}
                        <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                          {e.label}
                        </span>
                      </span>
                      <span className="block truncate text-[13px] text-muted-foreground">
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
              if (file) void stage(file);
              e.target.value = '';
            }}
          />
          <Menu>
            <MenuTrigger
              aria-label="Add"
              disabled={!online || !onSendFile}
              title={online ? 'Add to message' : 'Attachments need a connection'}
              className="mb-0.75 flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground active:opacity-60 disabled:opacity-40"
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

          <div className="relative flex min-h-9 flex-1 items-center rounded-[18px] border border-ring/60 bg-(--chat-bg) backdrop-blur">
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
              className="max-h-30 flex-1 resize-none bg-transparent py-1.5 pl-3.5 pr-9 text-[17px] leading-5.5 outline-none placeholder:text-muted-foreground"
            />

            <AnimatePresence initial={false} mode="popLayout">
              {listening ? (
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
                  className="absolute bottom-0.75 right-0.75 flex size-7.25 cursor-pointer items-center justify-center rounded-full bg-primary text-white active:opacity-70"
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
                  className="absolute bottom-1.5 right-2.5 cursor-pointer text-muted-foreground active:opacity-60"
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
