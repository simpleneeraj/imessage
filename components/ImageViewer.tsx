'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { IoClose } from 'react-icons/io5';

// Full-screen image lightbox: pinch / double-tap / wheel to zoom, drag to pan
// when zoomed, swipe-down (or tap the backdrop / ✕ / Esc) to dismiss — the
// behavior people expect from WhatsApp / iMessage / Photos.

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_PX = 120;

export function ImageViewer({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  // Vertical offset for swipe-to-dismiss (only meaningful at scale 1).
  const [dragY, setDragY] = useState(0);
  const [gesturing, setGesturing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(
    null,
  );
  const lastTap = useRef(0);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    setDragY(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keep panning inside the image so you can't drag it off-screen.
  const clampPan = useCallback((nx: number, ny: number, s: number) => {
    const el = imgRef.current;
    if (!el) return { x: nx, y: ny };
    const maxX = Math.max(0, (el.clientWidth * s - el.clientWidth) / 2);
    const maxY = Math.max(0, (el.clientHeight * s - el.clientHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nx)),
      y: Math.min(maxY, Math.max(-maxY, ny)),
    };
  }, []);

  const toggleZoom = () =>
    scale > 1 ? reset() : setScale(DOUBLE_TAP_SCALE);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
      pan.current = null;
    } else if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, tx, ty };
      const now = Date.now();
      if (now - lastTap.current < 280) {
        toggleZoom();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = Math.min(
        MAX_SCALE,
        Math.max(1, pinch.current.scale * (dist / pinch.current.dist)),
      );
      setScale(next);
      const p = clampPan(tx, ty, next);
      setTx(p.x);
      setTy(p.y);
    } else if (pointers.current.size === 1 && pan.current) {
      const dx = e.clientX - pan.current.x;
      const dy = e.clientY - pan.current.y;
      if (scale > 1) {
        const p = clampPan(pan.current.tx + dx, pan.current.ty + dy, scale);
        setTx(p.x);
        setTy(p.y);
      } else {
        setDragY(dy);
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;

    if (pointers.current.size === 0) {
      setGesturing(false);
      pan.current = null;
      if (scale < 1.05) {
        if (Math.abs(dragY) > DISMISS_PX) {
          onClose();
          return;
        }
        reset();
      }
    } else {
      // A finger lifted mid-pinch — keep panning with the one that remains.
      const remaining = [...pointers.current.values()][0];
      pan.current = { x: remaining.x, y: remaining.y, tx, ty };
    }
  }

  function onWheel(e: React.WheelEvent) {
    const next = Math.min(MAX_SCALE, Math.max(1, scale - e.deltaY * 0.0025));
    setScale(next);
    if (next <= 1) {
      setTx(0);
      setTy(0);
    }
  }

  const backdropOpacity =
    scale <= 1 ? 1 - Math.min(Math.abs(dragY) / 300, 0.85) : 1;

  return (
    // Reset zoom/pan after the close animation so the next open starts clean.
    <AnimatePresence onExitComplete={reset}>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
          style={{ opacity: backdropOpacity }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && scale <= 1) onClose();
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur active:scale-90"
          >
            <IoClose className="size-6" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element -- decrypted blob URL */}
          <img
            ref={imgRef}
            src={src}
            alt={alt ?? ''}
            draggable={false}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            style={{
              transform: `translate(${tx}px, ${ty + (scale <= 1 ? dragY : 0)}px) scale(${scale})`,
              transition: gesturing ? 'none' : 'transform 0.25s ease',
              touchAction: 'none',
              cursor: scale > 1 ? 'grab' : 'zoom-in',
            }}
            className="max-h-[100dvh] max-w-full touch-none select-none object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
