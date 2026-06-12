'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  IoArrowForward,
  IoArrowUndo,
  IoCalendarOutline,
  IoCheckmarkCircle,
  IoCheckmarkDone,
  IoCloudOfflineOutline,
  IoColorPaletteOutline,
  IoEyeOffOutline,
  IoFlashOutline,
  IoHappyOutline,
  IoHeart,
  IoKeypadOutline,
  IoLanguageOutline,
  IoLockClosed,
  IoMicOutline,
  IoMoonOutline,
  IoPeopleOutline,
  IoPricetagOutline,
  IoSparkles,
  IoTimerOutline,
  IoVideocamOutline,
} from 'react-icons/io5';
import { cn } from '@/lib/utils';

/* ---------------------------------- data --------------------------------- */

const FEATURES = [
  {
    icon: IoLockClosed,
    title: 'True end-to-end encryption',
    body: 'AES-256-GCM with ECDH key exchange. The server only ever stores ciphertext — yet your full history restores when you sign in anywhere.',
  },
  {
    icon: IoFlashOutline,
    title: 'Realtime everything',
    body: 'Messages, typing indicators, reactions and read receipts land instantly over Supabase realtime channels.',
  },
  {
    icon: IoCloudOfflineOutline,
    title: 'Offline-first PWA',
    body: 'Install it like a native app. Compose offline — the outbox encrypts and sends the moment you reconnect.',
  },
  {
    icon: IoHeart,
    title: 'Tapbacks & reaction sets',
    body: 'iOS-style tapbacks with switchable sets — Classic, Couple, Friends or Professional.',
  },
  {
    icon: IoColorPaletteOutline,
    title: 'Themes & gradient bubbles',
    body: 'Telegram-style theme gallery, per-chat wallpapers with patterns, and bubble colors — solid or gradient.',
  },
  {
    icon: IoTimerOutline,
    title: 'Vanish mode',
    body: 'Flip a switch and messages destroy themselves after everyone has seen them. Instagram-style, fully synced.',
  },
  {
    icon: IoEyeOffOutline,
    title: 'View-once attachments',
    body: 'Encrypted file sharing with optional view-once photos that are destroyed — actually destroyed — after opening.',
  },
  {
    icon: IoArrowUndo,
    title: 'Swipe to reply, edit & unsend',
    body: 'Swipe any bubble to reply, fix typos after sending, or unsend entirely — synced live to everyone.',
  },
  {
    icon: IoPeopleOutline,
    title: 'Groups built to scale',
    body: '100+ member groups with admin controls, member management and an enterprise-grade audit history.',
  },
  {
    icon: IoMicOutline,
    title: 'Voice dictation',
    body: 'Tap the mic and speak — words stream into the composer in real time.',
  },
  {
    icon: IoCheckmarkDone,
    title: 'Receipts & presence',
    body: 'Delivered → Read with timestamps, plus who-is-typing across groups.',
  },
  {
    icon: IoMoonOutline,
    title: 'Pixel-perfect, day & night',
    body: 'An obsessively crafted iOS aesthetic with seamless light and dark modes.',
  },
];

const ROADMAP = [
  {
    icon: IoSparkles,
    title: 'Chat Vibes',
    body: 'Tune a chat as Couple, Friends or Professional — unlock expressions like "Love you" with full-screen confetti and floating hearts.',
  },
  {
    icon: IoPricetagOutline,
    title: 'Nicknames',
    body: 'Pet names per chat — what you call each other is nobody else’s business.',
  },
  {
    icon: IoKeypadOutline,
    title: 'Passcode-locked chats',
    body: 'A 4-digit lock on your most private conversations, on top of E2EE.',
  },
  {
    icon: IoMicOutline,
    title: 'Voice messages',
    body: 'Hold-to-record encrypted voice notes with waveform playback.',
  },
  {
    icon: IoVideocamOutline,
    title: 'Calls',
    body: 'Encrypted voice & video calls, one-to-one and group.',
  },
  {
    icon: IoHappyOutline,
    title: 'Stickers & GIFs',
    body: 'An expressive sticker library and GIF search built in.',
  },
  {
    icon: IoCalendarOutline,
    title: 'Scheduled messages',
    body: 'Write now, deliver at the perfect moment.',
  },
  {
    icon: IoLanguageOutline,
    title: 'Live translation',
    body: 'Read any conversation in your language without leaving the chat.',
  },
];

const TIERS = [
  {
    name: 'Courtier',
    price: '$0',
    cadence: 'forever',
    blurb: 'Everything you need to chat in private.',
    features: [
      'Unlimited 1:1 & group chats',
      'Full end-to-end encryption',
      'Installable PWA + offline outbox',
      'Tapbacks, replies, edit & unsend',
      'Light & dark themes',
    ],
    cta: 'Start messaging',
    href: '/chats',
    highlight: false,
  },
  {
    name: 'Royal',
    price: '$4',
    cadence: 'per month',
    blurb: 'The full Monarch experience.',
    features: [
      'Everything in Courtier',
      'All themes, wallpapers & gradient bubbles',
      'Chat Vibes — Couple, Friends, Professional',
      'Vanish mode & view-once attachments',
      'Passcode-locked chats',
      'Priority support',
    ],
    cta: 'Coming soon',
    href: null,
    highlight: true,
  },
  {
    name: 'Monarch',
    price: '$49',
    cadence: 'once, forever',
    blurb: 'Lifetime crown. Every feature, every future feature.',
    features: [
      'Everything in Royal — for life',
      'All future releases included',
      'Early access to new features',
      'Founding-member badge',
    ],
    cta: 'Coming soon',
    href: null,
    highlight: false,
  },
];

/* ------------------------------- primitives ------------------------------ */

function Crown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 18.5 1.8 8.6c-.06-.5.52-.83.9-.5L7 11.5l4.2-6.3c.38-.57 1.22-.57 1.6 0L17 11.5l4.3-3.4c.38-.33.96 0 .9.5L21 18.5c-.07.57-.55 1-1.12 1H4.12c-.57 0-1.05-.43-1.12-1Z" />
    </svg>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.65, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">
        {kicker}
      </p>
      <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      {sub && <p className="mt-4 text-pretty text-lg text-white/55">{sub}</p>}
    </Reveal>
  );
}

/* ------------------------------ chat mockup ------------------------------ */

function PhoneMockup() {
  const bubbles = [
    { mine: false, text: 'have you tried Monarch yet?? 👀' },
    { mine: true, text: 'just installed it. these bubbles are gorgeous' },
    { mine: false, text: 'right?! and it’s actually end-to-end encrypted' },
    { mine: true, text: 'love you for this ❤️', expression: true },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, delay: 0.35, ease: [0.21, 0.65, 0.36, 1] }}
      className="relative mx-auto w-full max-w-95"
    >
      {/* glow */}
      <div className="absolute -inset-8 rounded-[44px] bg-linear-to-tr from-[#5e5ce6]/30 via-[#af52de]/20 to-[#ff375f]/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0c0c12] shadow-2xl">
        {/* status bar + header */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-white/2 px-5 pb-3 pt-5 backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-[#5e5ce6] to-[#af52de] text-sm font-bold text-white">
            S
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-white">
              Sam 👑
            </span>
            <span className="block text-[11px] text-emerald-400">
              online now
            </span>
          </span>
          <IoLockClosed className="ml-auto size-4 text-white/30" />
        </div>

        <div className="flex flex-col gap-2 px-4 py-5">
          {bubbles.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.9 + i * 0.55,
                type: 'spring',
                stiffness: 400,
                damping: 26,
              }}
              className={cn(
                'max-w-[80%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-5',
                b.mine
                  ? 'self-end text-white'
                  : 'self-start bg-[#26262e] text-white/90',
              )}
              style={
                b.mine
                  ? {
                      background: b.expression
                        ? 'linear-gradient(135deg, #ff375f, #af52de)'
                        : 'linear-gradient(135deg, #5e5ce6, #7d7aff)',
                    }
                  : undefined
              }
            >
              {b.text}
            </motion.div>
          ))}

          {/* floating hearts over the expression bubble */}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={`h${i}`}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                y: -90 - i * 18,
                x: (i % 2 === 0 ? 1 : -1) * (8 + i * 6),
                scale: 1,
              }}
              transition={{
                delay: 3.4 + i * 0.18,
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 4,
              }}
              className="pointer-events-none absolute bottom-24 right-10 text-xl"
              aria-hidden
            >
              ❤️
            </motion.span>
          ))}

          {/* typing indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.4 }}
            className="mt-1 flex w-fit items-center gap-1 rounded-[18px] bg-[#26262e] px-3.5 py-2.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                className="size-1.5 rounded-full bg-white/60"
              />
            ))}
          </motion.div>
        </div>

        {/* composer */}
        <div className="border-t border-white/5 px-4 pb-5 pt-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[14px] text-white/35">
            Message
            <IoMicOutline className="ml-auto size-4.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* --------------------------------- page ---------------------------------- */

export function Landing() {
  return (
    <div className="min-h-dvh scroll-smooth bg-[#06060b] text-white selection:bg-[#5e5ce6]/40">
      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#06060b]/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-5">
          <Link href="/" className="flex items-center gap-2">
            <Crown className="size-6 text-amber-400" />
            <span className="text-lg font-bold tracking-tight">Monarch</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#roadmap" className="transition-colors hover:text-white">
              Roadmap
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </div>
          <Link
            href="/chats"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
          >
            Open App <IoArrowForward className="size-3.5" />
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden px-5 pb-24 pt-36 sm:pt-44">
        {/* backdrop glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-150 w-225 -translate-x-1/2 rounded-full bg-[#5e5ce6]/20 blur-[140px]" />
        <div className="pointer-events-none absolute right-[-10%] top-40 h-100 w-100 rounded-full bg-[#af52de]/15 blur-[120px]" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[13px] text-white/70"
            >
              <IoLockClosed className="size-3.5 text-amber-400" />
              End-to-end encrypted. Zero plaintext on our servers.
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
            >
              Rule your
              <span className="block bg-linear-to-r from-[#7d7aff] via-[#c084fc] to-[#ff5e8a] bg-clip-text text-transparent">
                conversations.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-xl text-pretty text-lg text-white/55 lg:mx-0"
            >
              Monarch is a beautifully crafted messenger with the polish of
              iMessage and privacy it never had. Realtime, offline-first,
              endlessly themeable — your messages, your keys, your kingdom.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            >
              <Link
                href="/chats"
                className="group flex items-center gap-2 rounded-full bg-linear-to-r from-[#5e5ce6] to-[#af52de] px-7 py-3.5 text-[15px] font-semibold shadow-lg shadow-[#5e5ce6]/30 transition-transform hover:scale-[1.04] active:scale-95"
              >
                Start messaging — free
                <IoArrowForward className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#pricing"
                className="rounded-full border border-white/15 px-7 py-3.5 text-[15px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                See pricing
              </a>
            </motion.div>

            {/* stats */}
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 text-center lg:text-left"
            >
              {[
                ['AES-256', 'GCM encryption'],
                ['100+', 'member groups'],
                ['0 ms', 'to feel at home'],
              ].map(([stat, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-2xl font-bold sm:text-3xl">{stat}</dd>
                  <dd className="mt-1 text-[13px] text-white/45">{label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <PhoneMockup />
        </div>
      </section>

      {/* features */}
      <section id="features" className="scroll-mt-24 px-5 py-24">
        <SectionHeading
          kicker="Built & shipping today"
          title="Everything a messenger should be"
          sub="No feature checkboxes — every one of these is live, encrypted and synced in realtime."
        />
        <div className="mx-auto mt-14 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-white/8 bg-white/3 p-6 transition-colors hover:border-[#5e5ce6]/40 hover:bg-white/5">
                <f.icon className="size-6 text-[#a78bfa] transition-transform group-hover:scale-110" />
                <h3 className="mt-4 text-[17px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[14.5px] leading-6 text-white/50">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* roadmap */}
      <section id="roadmap" className="scroll-mt-24 px-5 py-24">
        <SectionHeading
          kicker="The royal roadmap"
          title="Coming to the kingdom"
          sub="Shipping next — Royal and Monarch members get them the day they land."
        />
        <div className="mx-auto mt-14 grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 0.07}>
              <div className="h-full rounded-2xl border border-dashed border-white/12 p-6">
                <span className="flex items-center justify-between">
                  <f.icon className="size-6 text-amber-400/90" />
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                    Soon
                  </span>
                </span>
                <h3 className="mt-4 text-[16px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-5.5 text-white/45">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="scroll-mt-24 px-5 py-24">
        <SectionHeading
          kicker="Pricing"
          title="Crowns for every court"
          sub="Start free. Upgrade when you want the full kingdom. Payments powered by DodoPayments — checkout opening soon."
        />
        <div className="mx-auto mt-14 grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1} className="h-full">
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-3xl border p-7',
                  t.highlight
                    ? 'border-[#5e5ce6]/60 bg-linear-to-b from-[#5e5ce6]/15 to-transparent shadow-xl shadow-[#5e5ce6]/10'
                    : 'border-white/10 bg-white/3',
                )}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-[#5e5ce6] to-[#af52de] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                    Most popular
                  </span>
                )}
                <span className="flex items-center gap-2">
                  {t.name === 'Monarch' && (
                    <Crown className="size-4.5 text-amber-400" />
                  )}
                  <h3 className="text-[17px] font-semibold">{t.name}</h3>
                </span>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight">
                    {t.price}
                  </span>
                  <span className="text-sm text-white/45">{t.cadence}</span>
                </p>
                <p className="mt-2 text-[14px] text-white/55">{t.blurb}</p>
                <ul className="mt-6 flex flex-col gap-2.5 text-[14px] text-white/70">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <IoCheckmarkCircle className="mt-0.5 size-4.5 shrink-0 text-[#a78bfa]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex-1" />
                {t.href ? (
                  <Link
                    href={t.href}
                    className="rounded-full bg-white py-3 text-center text-[15px] font-semibold text-black transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    {t.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Checkout via DodoPayments — coming soon"
                    className={cn(
                      'cursor-not-allowed rounded-full py-3 text-center text-[15px] font-semibold',
                      t.highlight
                        ? 'bg-linear-to-r from-[#5e5ce6] to-[#af52de] opacity-80'
                        : 'border border-white/15 text-white/60',
                    )}
                  >
                    {t.cta} · DodoPayments
                  </button>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="px-5 pb-28 pt-8">
        <Reveal className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-linear-to-br from-[#5e5ce6]/25 via-[#af52de]/15 to-transparent px-8 py-16 text-center">
          <Crown className="mx-auto size-10 text-amber-400" />
          <h2 className="mx-auto mt-5 max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Your messages deserve a throne.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/55">
            Free forever for the essentials. Thirty seconds to your first
            encrypted message.
          </p>
          <Link
            href="/chats"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-bold text-black transition-transform hover:scale-[1.04] active:scale-95"
          >
            Claim your crown <IoArrowForward className="size-4" />
          </Link>
        </Reveal>
      </section>

      {/* footer */}
      <footer className="border-t border-white/5 px-5 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-[13px] text-white/40 sm:flex-row">
          <span className="flex items-center gap-2">
            <Crown className="size-4 text-amber-400/80" />
            <span className="font-semibold text-white/70">Monarch</span> — rule
            your conversations.
          </span>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-white/70">
              Features
            </a>
            <a href="#pricing" className="hover:text-white/70">
              Pricing
            </a>
            <Link href="/chats" className="hover:text-white/70">
              Open App
            </Link>
          </div>
          <span>© 2026 Monarch. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
