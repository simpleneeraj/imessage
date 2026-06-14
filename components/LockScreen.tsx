'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { IoBackspaceOutline, IoLockClosed } from 'react-icons/io5';
import { hashPasscode } from '@/lib/passcode';
import { cn } from '@/lib/utils';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function LockScreen({
  conversationId,
  passcodeHash,
  title,
  onUnlock,
}: {
  conversationId: string;
  passcodeHash: string;
  title: string;
  onUnlock: () => void;
}) {
  const [entry, setEntry] = useState('');
  const [shake, setShake] = useState(0);
  const [checking, setChecking] = useState(false);

  async function press(key: string) {
    if (checking) return;
    if (key === 'del') {
      setEntry((e) => e.slice(0, -1));
      return;
    }
    const next = entry + key;
    setEntry(next);
    if (next.length < 4) return;

    setChecking(true);
    const hash = await hashPasscode(next, conversationId);
    if (hash === passcodeHash) {
      onUnlock();
    } else {
      setShake((s) => s + 1);
      setEntry('');
    }
    setChecking(false);
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 bg-background/80 px-6 backdrop-blur-2xl">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted">
          <IoLockClosed className="size-7 text-muted-foreground" />
        </span>
        <p className="text-[17px] font-semibold">{title} is locked</p>
        <p className="text-[13px] text-muted-foreground">
          Enter your 4-digit passcode
        </p>
      </div>

      <motion.div
        key={shake}
        animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : false}
        transition={{ duration: 0.4 }}
        className="flex gap-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'size-3.5 rounded-full border border-muted-foreground transition-colors',
              entry.length > i && 'bg-foreground border-foreground',
            )}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              aria-label={key === 'del' ? 'Delete' : key}
              onClick={() => void press(key)}
              className="flex size-17 cursor-pointer items-center justify-center rounded-full bg-muted/70 text-[26px] font-light active:bg-muted"
            >
              {key === 'del' ? (
                <IoBackspaceOutline className="size-6.5" />
              ) : (
                key
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
