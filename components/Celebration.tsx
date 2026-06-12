'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';

const CONFETTI_COLORS = [
  '#5e5ce6',
  '#af52de',
  '#ff375f',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#30b0c7',
];

// Deterministic PRNG (mulberry32) so particle layout is pure per render.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Full-screen celebratory overlay (pure motion, no canvas). Mount it with a
// key per celebration; the parent unmounts it after ~2.5s.
export function Celebration({ kind }: { kind: 'hearts' | 'confetti' }) {
  const particles = useMemo(() => {
    const rand = rng(kind === 'hearts' ? 7 : 42);
    return Array.from({ length: kind === 'hearts' ? 18 : 60 }, (_, i) => ({
      x: rand() * 100,
      delay: rand() * 0.6,
      duration: 1.6 + rand() * 1.2,
      size: 0.7 + rand() * 0.9,
      rotate: (rand() - 0.5) * 540,
      drift: (rand() - 0.5) * 30,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      emoji: ['❤️', '💖', '💘', '💕'][i % 4],
    }));
  }, [kind]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {kind === 'hearts'
        ? particles.map((p, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: '-110vh',
                x: [0, p.drift, -p.drift, 0],
                scale: p.size * 1.4,
              }}
              transition={{ duration: p.duration + 0.8, delay: p.delay, ease: 'easeOut' }}
              className="absolute bottom-0 text-3xl"
              style={{ left: `${p.x}%` }}
            >
              {p.emoji}
            </motion.span>
          ))
        : particles.map((p, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 1, y: '-10vh', rotate: 0 }}
              animate={{
                opacity: [1, 1, 0.8, 0],
                y: '110vh',
                x: [0, p.drift, -p.drift / 2],
                rotate: p.rotate,
              }}
              transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
              className="absolute top-0 rounded-xs"
              style={{
                left: `${p.x}%`,
                width: `${p.size * 10}px`,
                height: `${p.size * 14}px`,
                background: p.color,
              }}
            />
          ))}
    </div>
  );
}
