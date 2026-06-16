"use client";

import { useEffect, useState } from "react";
import { IoDocumentOutline, IoPlayCircle } from "react-icons/io5";
import { downloadAndDecrypt, formatBytes } from "@/lib/attachments";
import type { MessagePayload } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { ImageViewer } from "./ImageViewer";

type FilePayload = Extract<MessagePayload, { kind: "file" }>;

export function AttachmentBubble({
  payload,
  mine,
}: {
  payload: FilePayload;
  mine: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const isImage = payload.mime.startsWith("image/");
  const isVideo = payload.mime.startsWith("video/");

  useEffect(() => {
    if (!isImage && !isVideo) return;
    let cancelled = false;
    downloadAndDecrypt(payload)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, isImage, isVideo]);

  if (failed) {
    return (
      <p className="px-3.5 py-2 text-[15px] italic opacity-70">
        Attachment unavailable
      </p>
    );
  }

  if (isImage || isVideo) {
    const ratio =
      payload.w && payload.h ? payload.w / payload.h : 4 / 3;
    return (
      <div
        className="relative max-h-[340px] min-h-24 w-[min(75vw,280px)] bg-black/5 dark:bg-white/5"
        style={{ aspectRatio: ratio }}
      >
        {url ? (
          isImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL; next/image can't optimize it */}
              <img
                src={url}
                alt={payload.name}
                draggable={false}
                // Keep the bubble's swipe/long-press gestures from hijacking a
                // tap on the image — tapping should just open the zoom viewer.
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerOpen(true);
                }}
                className="size-full cursor-zoom-in select-none object-cover"
              />
              <ImageViewer
                src={url}
                alt={payload.name}
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
              />
            </>
          ) : (
            <video src={url} controls playsInline className="size-full object-cover" />
          )
        ) : (
          <div className="flex size-full items-center justify-center">
            {isVideo && <IoPlayCircle className="size-10 opacity-50" />}
            <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white">
              Decrypting…
            </span>
          </div>
        )}
      </div>
    );
  }

  // Generic file card: tap to download + open.
  return (
    <button
      type="button"
      onClick={() =>
        void downloadAndDecrypt(payload).then((u) => {
          const a = document.createElement("a");
          a.href = u;
          a.download = payload.name;
          a.click();
        })
      }
      className="flex w-60 items-center gap-3 px-3.5 py-2.5 text-left"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
          mine ? "bg-white/20" : "bg-black/5 dark:bg-white/10"
        )}
      >
        <IoDocumentOutline className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium">
          {payload.name}
        </span>
        <span
          className={cn(
            "block text-[12px]",
            mine ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {formatBytes(payload.size)}
        </span>
      </span>
    </button>
  );
}
