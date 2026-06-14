'use client';

import { useState } from 'react';
import {
  IoBanOutline,
  IoCheckmark,
  IoCheckmarkCircle,
  IoColorWandOutline,
} from 'react-icons/io5';
import {
  Drawer,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { Conversation, VibeId } from '@/lib/types';
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
import { setReactionSet, useReactionSet } from '@/lib/reactionSet';
import { VIBES } from '@/lib/expressions';
import { supabase } from '@/lib/supabase';
import { iosMenu } from './ui/ios-menu';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REACTION_SETS, TapbackGlyph, type ReactionSetId } from './Tapback';

const menu = iosMenu();

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
  const reactionSet = useReactionSet();
  const vibe = conversation?.vibe ?? 'classic';
  const convId = conversation?.id;
  // The vibe lives server-side; show a spinner on the tapped card until the
  // set_vibe RPC resolves (the new vibe then arrives via the realtime sub).
  const [pendingVibe, setPendingVibe] = useState<VibeId | null>(null);

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
                  active palette accent (--imsg-bubble-out via bg-imsg-blue). */}
              <button
                type="button"
                title="Match theme"
                aria-label="Match theme color"
                onClick={() => apply({ ...wp, bubble: undefined })}
                className={cn(
                  'flex size-9 cursor-pointer items-center justify-center rounded-full bg-imsg-blue text-white ring-offset-2 ring-offset-background active:opacity-80',
                  !wp?.bubble && 'ring-2 ring-imsg-blue',
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
                    wp?.bubble === c.value && 'ring-2 ring-imsg-blue',
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

          {/* Chat vibe: one config for expressions + the chat's reaction set.
              Each card previews its tapback pill; Classic shows your default. */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Chat Vibe
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {VIBES.map((v) => {
                const setId = v.id === 'classic' ? reactionSet : v.id;
                const loading = pendingVibe === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!convId || pendingVibe !== null}
                    onClick={() => {
                      if (!convId || v.id === vibe) return;
                      setPendingVibe(v.id);
                      void supabase
                        .rpc('set_vibe', { conv: convId, v: v.id })
                        .then(() => setPendingVibe(null));
                    }}
                    className={cn(
                      'cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default',
                      vibe === v.id
                        ? 'border-imsg-blue bg-imsg-blue/5'
                        : 'border-border',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[15px] font-medium">
                      <v.icon
                        className={cn(
                          'size-4.5',
                          vibe === v.id
                            ? 'text-imsg-blue'
                            : 'text-imsg-text-gray',
                        )}
                      />
                      {v.label}
                      {loading ? (
                        <span
                          aria-label="Applying"
                          className="ml-auto size-4 animate-spin rounded-full border-2 border-imsg-blue border-t-transparent"
                        />
                      ) : (
                        vibe === v.id && (
                          <IoCheckmark className="ml-auto size-4.5 text-imsg-blue" />
                        )
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {v.blurb}
                    </span>
                    {/* mini tapback-pill preview of this vibe's reaction set */}
                    <span
                      className={menu.surface({
                        class:
                          'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 shadow-sm',
                      })}
                    >
                      {REACTION_SETS[setId].items.map((t) => (
                        <TapbackGlyph
                          key={t}
                          value={t}
                          className="size-3.5 text-imsg-text-gray"
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Default reaction set — every set (not just the vibe-bound four).
                Used in Classic chats; a non-classic vibe overrides it per chat. */}
            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-muted-foreground">
              Reaction set
            </label>
            <Select
              value={reactionSet}
              onValueChange={(v) => setReactionSet(v as ReactionSetId)}
            >
              <SelectTrigger aria-label="Reaction set">
                <SelectValue>
                  {(value: ReactionSetId) => (
                    <span className="flex items-center gap-2">
                      {REACTION_SETS[value]?.label}
                      <span className="flex items-center gap-1">
                        {REACTION_SETS[value]?.items.map((t) => (
                          <TapbackGlyph
                            key={t}
                            value={t}
                            className="size-4 text-imsg-text-gray"
                          />
                        ))}
                      </span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {(Object.keys(REACTION_SETS) as ReactionSetId[]).map((id) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex items-center gap-2">
                      <span className="w-20 shrink-0">
                        {REACTION_SETS[id].label}
                      </span>
                      <span className="flex items-center gap-1">
                        {REACTION_SETS[id].items.map((t) => (
                          <TapbackGlyph
                            key={t}
                            value={t}
                            className="size-4 text-imsg-text-gray"
                          />
                        ))}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </section>
        </div>
      </DrawerPopup>
    </Drawer>
  );
}
