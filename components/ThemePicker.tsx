'use client';

import {
  IoBanOutline,
  IoCheckmarkCircle,
  IoColorWandOutline,
} from 'react-icons/io5';
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
import {
  BUBBLE_COLORS,
  THEMES,
  gradientFor,
  type ChatTheme,
} from '@/utils/themes';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const pattern = theme ? PATTERNS.find((p) => p.text === theme.pattern) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative aspect-3/4 w-28 shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl ring-offset-2 ring-offset-background transition-shadow active:opacity-80',
        selected ? 'ring-2 ring-primary' : 'ring-1 ring-border',
        !theme && 'bg-(--chat-bg)',
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
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <IoBanOutline className="size-6" />
          <span className="text-[12px] font-medium">None</span>
        </span>
      )}
      <span
        className={cn(
          'absolute inset-x-0 bottom-0 pb-1.5 text-center text-[11px] font-semibold',
          theme ? 'text-black/60' : 'text-muted-foreground',
        )}
      >
        {theme?.name ?? ''}
      </span>
      {selected && (
        <IoCheckmarkCircle className="absolute right-1.5 top-1.5 size-5 text-primary drop-shadow" />
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
        variant="inset"
        showBar={!isDesktop}
        className={cn('flex flex-col')}
      >
        <DrawerHeader>
          <DrawerTitle>Browse Themes</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-w-0 flex-1 flex-col gap-7 overflow-y-auto px-6 pb-8">
          {/* Preset themes: wallpaper + pattern + matching bubble colour.
              Horizontal carousel (Telegram "Browse Themes" style). min-w-0 lets
              this row scroll instead of stretching its flex-col parent wide. */}
          <section className="flex min-w-0 snap-x snap-mandatory items-start gap-2.5 overflow-x-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
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
                  apply({
                    color: t.color,
                    pattern: t.pattern,
                    bubble: t.bubble,
                  })
                }
              />
            ))}
          </section>

          {/* Bubble colour — overrides the theme accent for this chat only */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Bubble Color
            </h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Match-theme: clears the override so the bubble follows the
                  active palette accent (--bubble-bg via bg-primary). */}
              <button
                type="button"
                title="Match theme"
                aria-label="Match theme color"
                onClick={() => apply({ ...wp, bubble: undefined })}
                className={cn(
                  'flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary text-white ring-offset-2 ring-offset-background active:opacity-80',
                  !wp?.bubble && 'ring-2 ring-primary',
                )}
              >
                <IoColorWandOutline className="size-4.5" />
              </button>
              {BUBBLE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={`Bubble color ${c.name}`}
                  onClick={() => apply({ ...wp, bubble: c.value })}
                  className={cn(
                    'flex size-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background active:opacity-80',
                    wp?.bubble === c.value && 'ring-2 ring-primary',
                  )}
                  style={{ background: c.value }}
                >
                  {wp?.bubble === c.value && (
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
              <Select
                value={wp.pattern ?? null}
                onValueChange={(v) =>
                  apply({ ...wp, pattern: (v as string | null) ?? undefined })
                }
              >
                <SelectTrigger aria-label="Pattern">
                  <SelectValue placeholder="Choose a pattern" />
                </SelectTrigger>
                <SelectPopup>
                  {PATTERNS.map((p) => (
                    <SelectItem key={p.text} value={p.text}>
                      {p.text}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </section>
          )}
        </div>
      </DrawerPopup>
    </Drawer>
  );
}
