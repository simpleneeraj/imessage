"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IoClose, IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { downloadAndDecrypt, revokeAttachmentUrl } from "@/lib/attachments";
import { useMarkAttachmentViewed } from "@/hooks/useMarkAttachmentViewed";
import type { MessagePayload } from "@/lib/crypto";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilePayload = Extract<MessagePayload, { kind: "file" }>;

// Instagram-style view-once: a tappable pill; opening shows the media
// fullscreen, and closing it destroys the attachment for everyone.
export function ViewOnceBubble({
  message,
  payload,
  mine,
}: {
  message: Message;
  payload: FilePayload;
  mine: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { trigger: markViewed } = useMarkAttachmentViewed();
  const consumed = message.viewed_at !== null;
  const label = payload.mime.startsWith("video/") ? "Video" : "Photo";

  async function open() {
    if (consumed || opening || mine) return; // sender can't re-view; keep it simple
    setOpening(true);
    try {
      setUrl(await downloadAndDecrypt(payload));
    } catch {
      setOpening(false);
    }
  }

  async function close() {
    setUrl(null);
    setOpening(false);
    revokeAttachmentUrl(payload.path);
    // Destroys the storage object server-side; everyone gets the UPDATE event.
    await markViewed({ messageId: message.id });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        disabled={consumed || mine}
        className={cn(
          "flex items-center gap-2 px-3.5 py-2.5 text-[15px] font-medium",
          consumed && "opacity-60"
        )}
      >
        {consumed ? (
          <IoEyeOffOutline className="size-5" />
        ) : (
          <IoEyeOutline className="size-5" />
        )}
        {consumed ? "Opened" : mine ? `${label} — View once` : `Tap to view ${label}`}
      </button>

      <AnimatePresence>
        {url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            onClick={() => void close()}
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 text-white/80"
              onClick={() => void close()}
            >
              <IoClose className="size-8" />
            </button>
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              className="max-h-full max-w-full"
            >
              {payload.mime.startsWith("video/") ? (
                <video src={url} autoPlay controls playsInline className="max-h-dvh max-w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL
                <img src={url} alt="" className="max-h-dvh max-w-full object-contain" />
              )}
            </motion.div>
            <p className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-[13px] text-white/60">
              This {label.toLowerCase()} disappears when you close it
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
