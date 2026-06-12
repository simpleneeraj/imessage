'use client';

import { IoBanOutline, IoCheckmarkCircle } from 'react-icons/io5';
import {
  Drawer,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { Conversation } from '@/lib/types';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { PATTERNS } from '@/utils/patterns';
import { parseWallpaper, serializeWallpaper } from '@/utils/config';
import { BUBBLE_COLORS, THEMES, gradientFor, type ChatTheme } from '@/utils/themes';
import { cn } from '@/lib/utils';

// Mini chat preview painted on each theme card, Telegram "Browse Themes" style.
function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: ChatTheme | null;
  selected: boolean;
  onClick: () => void;
}) {
  const pattern = theme
    ? PATTERNS.find((p) => p.text === theme.pattern)
    : null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative aspect-3/4 cursor-pointer overflow-hidden rounded-2xl ring-offset-2 ring-offset-background transition-shadow active:opacity-80',
        selected ? 'ring-2 ring-imsg-blue' : 'ring-1 ring-border',
        !theme && 'bg-(--imsg-chat-bg)',
      )}
      style={theme ? { backgroundImage: gradientFor(theme.color) } : undefined}
    >
      {pattern && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `url(${pattern.path})`,
            backgroundSize: '220px',
          }}
        />
      )}
      {theme ? (
        <span className="absolute inset-0 flex flex-col justify-center gap-1.5 p-3">
          <span className="h-5 w-3/4 self-start rounded-[10px] rounded-bl-sm bg-white/90" />
          <span
            className="h-5 w-3/4 self-end rounded-[10px] rounded-br-sm"
            style={{ background: theme.bubble }}
          />
        </span>
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-imsg-text-gray">
          <IoBanOutline className="size-6" />
          <span className="text-[12px] font-medium">None</span>
        </span>
      )}
      <span
        className={cn(
          'absolute inset-x-0 bottom-0 pb-1.5 text-center text-[11px] font-semibold',
          theme ? 'text-black/60' : 'text-imsg-text-gray',
        )}
      >
        {theme?.name ?? ''}
      </span>
      {selected && (
        <IoCheckmarkCircle className="absolute right-1.5 top-1.5 size-5 text-imsg-blue drop-shadow" />
      )}
    </button>
  );
}

export function ThemePicker({
  open,
  onOpenChange,
  conversation,
  onWallpaper,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  onWallpaper: (theme: string | null) => void;
}) {
  const isDesktop = useIsDesktop();
  const wp = parseWallpaper(conversation?.wallpaper);

  const apply = (next: {
    color?: string;
    pattern?: string;
    bubble?: string;
  }) =>
    next.color || next.pattern || next.bubble
      ? onWallpaper(serializeWallpaper(next))
      : onWallpaper(null);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      position={isDesktop ? 'right' : 'bottom'}
    >
      <DrawerPopup
        showBar={!isDesktop}
        className={cn('flex flex-col', isDesktop ? 'h-full' : 'max-h-[88dvh]')}
      >
        <DrawerHeader>
          <DrawerTitle>Browse Themes</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 pb-8">
          {/* Preset themes: wallpaper + pattern + matching bubble colour */}
          <section className="grid grid-cols-3 gap-2.5">
            <ThemeCard
              theme={null}
              selected={!wp?.color}
              onClick={() => apply({ bubble: wp?.bubble })}
            />
            {THEMES.map((t) => (
              <ThemeCard
                key={t.name}
                theme={t}
                selected={wp?.color === t.color && wp?.pattern === t.pattern}
                onClick={() =>
                  apply({ color: t.color, pattern: t.pattern, bubble: t.bubble })
                }
              />
            ))}
          </section>

          {/* Bubble colour — independent of the wallpaper */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Bubble Color
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {BUBBLE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={`Bubble color ${c.name}`}
                  onClick={() => apply({ ...wp, bubble: c.value })}
                  className={cn(
                    'flex size-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background active:opacity-80',
                    (wp?.bubble ?? BUBBLE_COLORS[0].value) === c.value &&
                      'ring-2 ring-imsg-blue',
                  )}
                  style={{ background: c.value }}
                >
                  {(wp?.bubble ?? BUBBLE_COLORS[0].value) === c.value && (
                    <IoCheckmarkCircle className="size-5 text-white" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Pattern override for the active wallpaper */}
          {wp?.color && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Pattern
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {PATTERNS.map((p) => (
                  <button
                    key={p.text}
                    type="button"
                    onClick={() => apply({ ...wp, pattern: p.text })}
                    className={cn(
                      'cursor-pointer rounded-full border px-3 py-1.5 text-[13px] active:opacity-70',
                      wp.pattern === p.text
                        ? 'border-imsg-blue bg-imsg-blue/10 text-imsg-blue'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </DrawerPopup>
    </Drawer>
  );
}
