'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';

// Full-screen, image-style chat effect (Instagram/iMessage feel) built from
// crafted SVG stickers animated with motion — no canvas, no external lib.
// Mounted with a key per celebration; the parent unmounts it after ~3s.

const HEART_COLORS = ['#ff375f', '#ff5e7e', '#ff2d55', '#e0398f', '#ff8fab'];
const CONFETTI_COLORS = [
  '#5e5ce6',
  '#af52de',
  '#ff375f',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#30b0c7',
];

// Deterministic PRNG (mulberry32) so a given effect lays out the same each run.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function HeartSticker({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="size-full drop-shadow-md">
      <defs>
        <radialGradient id="hg" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>
      <path
        fill="url(#hg)"
        d="M16 28S3 20.5 3 11.8C3 7.5 6.4 4.5 10.2 4.5c2.4 0 4.5 1.2 5.8 3.1 1.3-1.9 3.4-3.1 5.8-3.1C25.6 4.5 29 7.5 29 11.8 29 20.5 16 28 16 28z"
      />
    </svg>
  );
}

function StarSticker({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="size-full drop-shadow">
      <path
        fill={color}
        d="M16 2l3.7 8.5L29 11.3l-7 6.1 2.1 9.1L16 21.9 7.9 26.5 10 17.4l-7-6.1 9.3-.8z"
      />
    </svg>
  );
}

function SparkleSticker({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 32" className="size-full">
      <path
        fill={color}
        d="M16 1c1 7.5 4.5 11 14 15-9.5 4-13 7.5-14 15-1-7.5-4.5-11-14-15 9.5-4 13-7.5 14-15z"
      />
    </svg>
  );
}

function BalloonSticker({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 32 44" className="size-full drop-shadow-lg">
      <defs>
        <radialGradient id={`bg-${color}`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="15" rx="13" ry="15" fill={`url(#bg-${color})`} />
      <path d="M16 30l2 3h-4l2-3z" fill={color} />
      <path
        d="M16 33c0 3-3 4-3 7s3 2 3 4"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
      />
    </svg>
  );
}

function ConfettiSticker({ color }: { color: string }) {
  return (
    <span
      className="block size-full rounded-[2px]"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    />
  );
}

export function Celebration({ kind }: { kind: 'hearts' | 'confetti' }) {
  const particles = useMemo(() => {
    const rand = rng(kind === 'hearts' ? 7 : 42);
    const count = kind === 'hearts' ? 22 : 46;
    return Array.from({ length: count }, (_, i) => {
      const depth = rand(); // 0 = far (small, blurred), 1 = near
      return {
        i,
        x: rand() * 100,
        delay: rand() * 0.7,
        duration: 2 + rand() * 1.8,
        size: 18 + depth * 30,
        drift: (rand() - 0.5) * 26,
        rotate: (rand() - 0.5) * 220,
        blur: depth < 0.25 ? 2 : 0,
        opacity: 0.6 + depth * 0.4,
        roll: rand(),
      };
    });
  }, [kind]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {kind === 'hearts'
        ? particles.map((p) => (
            <motion.div
              key={p.i}
              initial={{ opacity: 0, y: 60, scale: 0.4 }}
              animate={{
                opacity: [0, p.opacity, p.opacity, 0],
                y: '-115vh',
                x: [0, p.drift, -p.drift, p.drift / 2],
                scale: 1,
                rotate: [0, p.rotate * 0.15, -p.rotate * 0.15, 0],
              }}
              transition={{
                duration: p.duration + 0.8,
                delay: p.delay,
                ease: 'easeOut',
              }}
              className="absolute bottom-[-40px]"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                filter: p.blur ? `blur(${p.blur}px)` : undefined,
              }}
            >
              <HeartSticker
                color={HEART_COLORS[p.i % HEART_COLORS.length]}
              />
            </motion.div>
          ))
        : particles.map((p) => {
            // Friends "celebration": balloons rise, confetti + stars fall.
            const isBalloon = p.roll > 0.82;
            const isStar = !isBalloon && p.roll > 0.62;
            const color = CONFETTI_COLORS[p.i % CONFETTI_COLORS.length];
            if (isBalloon) {
              return (
                <motion.div
                  key={p.i}
                  initial={{ opacity: 0, y: '20vh' }}
                  animate={{
                    opacity: [0, p.opacity, p.opacity, 0],
                    y: '-120vh',
                    x: [0, p.drift, -p.drift, 0],
                  }}
                  transition={{
                    duration: p.duration + 2,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                  className="absolute bottom-[-60px]"
                  style={{
                    left: `${p.x}%`,
                    width: p.size * 1.4,
                    height: p.size * 1.9,
                    filter: p.blur ? `blur(${p.blur}px)` : undefined,
                  }}
                >
                  <BalloonSticker color={color} />
                </motion.div>
              );
            }
            return (
              <motion.div
                key={p.i}
                initial={{ opacity: 1, y: '-15vh', rotate: 0 }}
                animate={{
                  opacity: [1, 1, 0.85, 0],
                  y: '115vh',
                  x: [0, p.drift, -p.drift / 2, p.drift],
                  rotate: p.rotate * 3,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: 'easeIn',
                }}
                className="absolute top-0"
                style={{
                  left: `${p.x}%`,
                  width: isStar ? p.size : p.size * 0.55,
                  height: isStar ? p.size : p.size * 0.8,
                  filter: p.blur ? `blur(${p.blur}px)` : undefined,
                }}
              >
                {isStar ? (
                  p.roll > 0.72 ? (
                    <StarSticker color={color} />
                  ) : (
                    <SparkleSticker color={color} />
                  )
                ) : (
                  <ConfettiSticker color={color} />
                )}
              </motion.div>
            );
          })}
    </div>
  );
}
