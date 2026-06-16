'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  IoDownloadOutline,
  IoFlashOutline,
  IoLogoAndroid,
  IoNotificationsOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import { siteConfig } from '@/lib/site-config';

// Download CTA for the public quotes page: encourages visitors to install the
// Android app (the signed APK that scripts/build-apk.sh publishes to
// /public/downloads). Self-hiding when already running inside the installed app
// (TWA / standalone), and platform-aware so non-Android visitors get a hint
// rather than a useless .apk download.

const APK_URL = '/downloads/festhub.apk';
const META_URL = '/downloads/version.json';

type Meta = { version?: string; size?: number };

function formatSize(bytes?: number): string | null {
  if (!bytes) return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FEATURES = [
  { icon: IoNotificationsOutline, label: 'Instant notifications' },
  { icon: IoFlashOutline, label: 'Fast & lightweight' },
  { icon: IoShieldCheckmarkOutline, label: 'Signed & safe to install' },
];

const noopSubscribe = () => () => {};

// Static browser facts read via useSyncExternalStore: correct after hydration
// without setState-in-effect (which triggers cascading-render warnings).
// getServerSnapshot returns false so SSR + first client render agree.
function useShouldShow(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      !(
        window.matchMedia('(display-mode: standalone)').matches ||
        document.referrer.startsWith('android-app://') ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true
      ),
    () => false,
  );
}

function useIsAndroid(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /android/i.test(navigator.userAgent),
    () => false,
  );
}

export function GetTheApp() {
  const show = useShouldShow();
  const isAndroid = useIsAndroid();
  const [meta, setMeta] = useState<Meta>({});

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    // Best-effort: show the real version/size if build-apk.sh published it.
    // (setMeta runs in an async callback, not synchronously in the effect.)
    fetch(META_URL)
      .then((r) => (r.ok ? (r.json() as Promise<Meta>) : null))
      .then((d) => {
        if (d && !cancelled) setMeta(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [show]);

  if (!show) return null;

  const size = formatSize(meta.size);
  const appName = siteConfig.name;

  return (
    <section className="mt-10 overflow-hidden rounded-lg border border-[#e0d8c4] bg-linear-to-b from-[#fbf4df] to-white">
      <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#382110] text-[#f4f1ea] shadow-sm">
          <IoLogoAndroid className="size-9" />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-quote text-[19px] font-bold text-[#382110]">
            Get {appName} on your phone
          </h3>
          <p className="mt-1 text-[13px] leading-5 text-[#7a6a55]">
            A quote a day, right in your pocket — and never miss a beat.
          </p>

          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 sm:justify-start">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 text-[12px] font-medium text-[#5a4a3a]"
              >
                <Icon className="size-4 text-[#00635d]" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-1.5 sm:w-auto">
          <a
            href={APK_URL}
            download
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#382110] px-5 py-2.5 text-[14px] font-semibold text-[#f4f1ea] shadow-sm transition-opacity hover:opacity-95 active:opacity-80 sm:w-auto"
          >
            <IoDownloadOutline className="size-4.5" />
            {isAndroid ? 'Download for Android' : 'Download .apk'}
          </a>
          <p className="text-[11px] text-[#9b8e79]">
            {[
              'Android',
              meta.version && `v${meta.version}`,
              size,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {!isAndroid && (
        <p className="border-t border-[#efe7d5] bg-[#faf6ec] px-6 py-2.5 text-center text-[11.5px] text-[#9b8e79]">
          Made for Android phones — open this page on your phone to install.
        </p>
      )}
    </section>
  );
}
