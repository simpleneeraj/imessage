'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ConversationList } from './ConversationList';

// Desktop: persistent 380px sidebar + detail pane (iMessage on macOS).
// Mobile: sidebar IS the home screen; thread routes take the full screen.
// One ConversationList instance either way, so its realtime subscriptions
// and caches survive navigation.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inDetail = pathname !== '/chats';

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside
        className={cn(
          'w-full flex-col md:flex md:w-95 md:shrink-0 md:border-r md:border-imsg-separator/50',
          inDetail ? 'hidden' : 'flex',
        )}
      >
        <ConversationList />
      </aside>
      <main
        className={cn(
          'min-w-0 flex-1 flex-col md:flex',
          inDetail ? 'flex' : 'hidden',
        )}
      >
        {children}
      </main>
    </div>
  );
}
