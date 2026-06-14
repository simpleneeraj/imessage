'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IoCall,
  IoHandLeft,
  IoHandLeftOutline,
  IoHappyOutline,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
} from 'react-icons/io5';
import { useCall } from './CallProvider';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { REACTION_SETS, TapbackGlyph } from './Tapback';

function fmtDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function useElapsed(connectedAt: number | null): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!connectedAt) return;
    const update = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)));
    const seed = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, [connectedAt]);
  return connectedAt ? seconds : 0;
}

function Stream({
  stream,
  muted,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted} className={className} />
  );
}

function RoundButton({
  onClick,
  onVideo,
  engaged,
  danger,
  label,
  children,
}: {
  onClick: () => void;
  onVideo: boolean;
  engaged?: boolean;
  danger?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'flex size-14 items-center justify-center rounded-full shadow-sm transition-colors',
        danger
          ? 'bg-red-500 text-white'
          : engaged
            ? onVideo
              ? 'bg-white text-black'
              : 'bg-foreground text-background'
            : onVideo
              ? 'bg-white/15 text-white backdrop-blur'
              : 'bg-foreground/10 text-foreground',
      )}
    >
      {children}
    </motion.button>
  );
}

export function CallUI() {
  const {
    status,
    media,
    peer,
    localStream,
    remoteStream,
    micOn,
    camOn,
    error,
    connectedAt,
    endedInfo,
    handRaised,
    peerRaised,
    reactions,
    accept,
    decline,
    hangup,
    toggleMic,
    toggleCam,
    toggleHand,
    sendReaction,
  } = useCall();

  const elapsed = useElapsed(connectedAt);
  const [pickerOpen, setPickerOpen] = useState(false);
  // In-call reactions use the same classic tapback set as messages.
  const reactionItems = REACTION_SETS.classic.items;

  if (status === 'idle') return null;

  const name = peer?.name ?? endedInfo?.peerName ?? '';

  // Incoming → compact ringer sheet that drops from the top.
  if (status === 'incoming') {
    return (
      <div className="fixed inset-x-0 top-0 z-60 flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <motion.div
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex w-full max-w-md items-center gap-3 rounded-[22px] border border-border bg-card/95 p-3 text-card-foreground shadow-2xl backdrop-blur-xl"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <Avatar name={name || '?'} size={48} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold">{name}</p>
            <p className="text-[13px] text-muted-foreground">
              Incoming {media === 'video' ? 'video' : 'voice'} call…
            </p>
          </div>
          <button
            type="button"
            onClick={decline}
            aria-label="Decline"
            className="flex size-11 items-center justify-center rounded-full bg-red-500 text-white active:opacity-80"
          >
            <IoCall className="size-5 rotate-135" />
          </button>
          <motion.button
            type="button"
            onClick={accept}
            aria-label="Accept"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex size-11 items-center justify-center rounded-full bg-green-500 text-white active:opacity-80"
          >
            <IoCall className="size-5" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const onVideo = media === 'video' && Boolean(remoteStream);
  const ringing = status === 'outgoing' || status === 'connecting';
  const subtitle =
    status === 'outgoing'
      ? 'Calling…'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'active'
          ? fmtDuration(elapsed)
          : endedInfo && endedInfo.duration > 0
            ? `Call ended · ${fmtDuration(endedInfo.duration)}`
            : 'Call ended';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed inset-0 z-60 flex flex-col',
          onVideo ? 'bg-black text-white' : 'bg-background text-foreground',
        )}
      >
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {onVideo && (
            <Stream stream={remoteStream} className="size-full object-cover" />
          )}

          {/* Name + status/duration up top */}
          <div
            className={cn(
              'absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]',
              onVideo && 'bg-linear-to-b from-black/40 to-transparent',
            )}
          >
            <p className="text-[26px] font-semibold tracking-tight">{name}</p>
            <motion.p
              key={subtitle}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'text-[15px] tabular-nums',
                onVideo ? 'text-white/80' : 'text-muted-foreground',
              )}
            >
              {subtitle}
            </motion.p>

            {/* Peer raised hand */}
            <AnimatePresence>
              {peerRaised && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-2 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[13px] font-medium text-black"
                >
                  <motion.span
                    animate={{ rotate: [0, 18, -8, 14, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    ✋
                  </motion.span>
                  {name} raised their hand
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Centre avatar (audio / no remote video yet) with ring pulse */}
          {!onVideo && (
            <div className="relative flex items-center justify-center">
              {ringing && (
                <>
                  <motion.span
                    className="absolute size-32 rounded-full bg-primary/25"
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <motion.span
                    className="absolute size-32 rounded-full bg-primary/25"
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: 0.9 }}
                  />
                </>
              )}
              <motion.div
                animate={
                  status === 'ended' ? { scale: 0.94, opacity: 0.85 } : {}
                }
              >
                <Avatar name={name || '?'} size={128} />
              </motion.div>
            </div>
          )}

          {/* Local PiP */}
          {media === 'video' && localStream && camOn && status !== 'ended' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 h-40 w-28 overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/20"
            >
              <Stream
                stream={localStream}
                muted
                className="size-full -scale-x-100 object-cover"
              />
              {handRaised && (
                <span className="absolute bottom-1 left-1 rounded-full bg-amber-400 px-1.5 text-[12px]">
                  ✋
                </span>
              )}
            </motion.div>
          )}

          {/* Floating reactions */}
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.span
                  key={r.id}
                  initial={{ opacity: 0, y: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -260, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3.2, ease: 'easeOut' }}
                  className="absolute bottom-28"
                  style={{ left: r.mine ? '62%' : '30%' }}
                >
                  <TapbackGlyph
                    value={r.emoji}
                    className="size-12 drop-shadow-lg"
                  />
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {error && (
            <p className="absolute bottom-28 z-20 rounded-full bg-red-500/90 px-4 py-1.5 text-[13px] text-white">
              {error}
            </p>
          )}
        </div>

        {/* Controls */}
        <AnimatePresence>
          {status !== 'ended' && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative flex flex-col items-center gap-3 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-5"
            >
              {/* Emoji picker */}
              <AnimatePresence>
                {pickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.9 }}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lg',
                      onVideo ? 'bg-white/15 backdrop-blur' : 'bg-muted',
                    )}
                  >
                    {reactionItems.map((token) => (
                      <motion.button
                        key={token}
                        type="button"
                        aria-label={`React with ${token}`}
                        whileTap={{ scale: 0.8 }}
                        whileHover={{ scale: 1.25, y: -3 }}
                        onClick={() => {
                          sendReaction(token);
                          setPickerOpen(false);
                        }}
                        className="flex size-10 items-center justify-center"
                      >
                        <TapbackGlyph value={token} className="size-7" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-center gap-4">
                <RoundButton
                  onClick={toggleMic}
                  onVideo={onVideo}
                  engaged={!micOn}
                  label={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? (
                    <IoMic className="size-6" />
                  ) : (
                    <IoMicOff className="size-6" />
                  )}
                </RoundButton>

                {media === 'video' && (
                  <RoundButton
                    onClick={toggleCam}
                    onVideo={onVideo}
                    engaged={!camOn}
                    label={camOn ? 'Turn camera off' : 'Turn camera on'}
                  >
                    {camOn ? (
                      <IoVideocam className="size-6" />
                    ) : (
                      <IoVideocamOff className="size-6" />
                    )}
                  </RoundButton>
                )}

                <RoundButton
                  onClick={toggleHand}
                  onVideo={onVideo}
                  engaged={handRaised}
                  label={handRaised ? 'Lower hand' : 'Raise hand'}
                >
                  {handRaised ? (
                    <IoHandLeft className="size-6" />
                  ) : (
                    <IoHandLeftOutline className="size-6" />
                  )}
                </RoundButton>

                <RoundButton
                  onClick={() => setPickerOpen((o) => !o)}
                  onVideo={onVideo}
                  engaged={pickerOpen}
                  label="React"
                >
                  <IoHappyOutline className="size-6" />
                </RoundButton>

                <RoundButton
                  onClick={hangup}
                  onVideo={onVideo}
                  danger
                  label="End call"
                >
                  <IoCall className="size-6 rotate-135" />
                </RoundButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
