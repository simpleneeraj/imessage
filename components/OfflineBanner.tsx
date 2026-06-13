'use client';

import { useOnline } from '@/lib/useOnline';
import { IoCloudOffline } from 'react-icons/io5';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="hairline-b shrink-0 bg-imsg-gray py-1 text-center text-[12px] text-accent-foreground/50 flex items-center justify-center gap-1">
      <IoCloudOffline />
      Not Connected — messages will send when you&apos;re back online
    </div>
  );
}
