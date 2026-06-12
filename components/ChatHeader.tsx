'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  IoChevronBack,
  IoChevronForward,
  IoColorPaletteOutline,
  IoEllipsisHorizontal,
  IoInformationCircleOutline,
  IoKeypadOutline,
  IoMoonOutline,
  IoSunnyOutline,
  IoTimerOutline,
  IoTrashOutline,
  IoArrowUndoOutline,
} from 'react-icons/io5';
import type { Profile } from '@/lib/types';
import { Avatar } from './Avatar';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { iosMenu, iosMenuItem } from '@/components/ui/ios-menu';
import { cn } from '@/lib/utils';

const menu = iosMenu();

export function ChatHeader({
  title,
  others,
  onOpenDetails,
  onOpenTheme,
  onOpenPasscode,
  hasPasscode,
  vanish,
  onToggleVanish,
  isAdmin,
  deleted,
  onDeleteForMe,
  onDeleteForEveryone,
  onRestore,
}: {
  title: string;
  others: Profile[];
  onOpenDetails?: () => void;
  onOpenTheme?: () => void;
  onOpenPasscode?: () => void;
  hasPasscode?: boolean;
  vanish: boolean;
  onToggleVanish: () => void;
  isAdmin: boolean;
  deleted: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onRestore: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  // undefined during SSR/first paint → hydration-safe without a mounted flag
  const isDark = resolvedTheme === 'dark';

  // Groups can have 100+ members — show two avatars and roll the rest into
  // a "+N" badge (capped at 99+).
  const shown = others.slice(0, 2);
  const overflow = others.length - shown.length;
  const overflowLabel = overflow > 99 ? '99+' : `+${overflow}`;

  return (
    <header className="hairline-b shrink-0 bg-imsg-bar/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-2xl grid-cols-[64px_1fr_64px] items-center px-2 pb-1.5 pt-1">
        <Link
          href="/chats"
          aria-label="Back to conversations"
          className="flex h-11 items-center justify-start pl-1 text-imsg-blue active:opacity-60 md:invisible"
        >
          <IoChevronBack className="size-6.5" />
        </Link>

        <button
          type="button"
          onClick={onOpenDetails}
          className="flex flex-col items-center gap-1 active:opacity-60"
        >
          {shown.length > 1 ? (
            <div className="flex h-12 items-center">
              <Avatar
                name={shown[0].display_name}
                size={40}
                className="ring-2 ring-imsg-bar"
              />
              <Avatar
                name={shown[1].display_name}
                size={32}
                className="-ml-3 mt-3 ring-2 ring-imsg-bar"
              />
              {overflow > 0 && (
                <span className="z-1 -ml-2.5 mt-3 flex h-8 min-w-8 items-center justify-center rounded-full bg-imsg-gray px-1 text-[11px] font-semibold text-imsg-text-gray ring-2 ring-imsg-bar">
                  {overflowLabel}
                </span>
              )}
            </div>
          ) : (
            <Avatar name={shown[0]?.display_name ?? '?'} size={44} />
          )}
          <span className="flex max-w-50 items-center gap-0.5 text-[12px] leading-none">
            <span className="truncate">{title}</span>
            <IoChevronForward className="size-3 shrink-0 text-imsg-chevron" />
          </span>
        </button>

        <div className="flex h-11 items-center justify-end pr-1">
          <Menu>
            <MenuTrigger
              aria-label="More"
              className="flex size-9 cursor-pointer items-center justify-center text-imsg-blue active:opacity-60"
            >
              <IoEllipsisHorizontal className="size-6" />
            </MenuTrigger>
            {/* strip the default coss card; render an iOS frosted menu inside */}
            <MenuPopup align="end" sideOffset={6} className={menu.popup()}>
              <div className={menu.card({ class: 'w-62' })}>
                <div className={menu.group()}>
                  <MenuItem onClick={onOpenDetails} className={iosMenuItem()}>
                    Chat Info
                    <IoInformationCircleOutline className="size-5.5 text-foreground" />
                  </MenuItem>

                  <MenuItem onClick={onOpenTheme} className={iosMenuItem()}>
                    Change Theme
                    <IoColorPaletteOutline className="size-5.5 text-foreground" />
                  </MenuItem>
                  <MenuItem onClick={onToggleVanish} className={iosMenuItem()}>
                    Vanish Mode
                    <span className="flex items-center gap-2">
                      {vanish && (
                        <span className="text-[15px] text-imsg-text-gray">
                          On
                        </span>
                      )}
                      <IoTimerOutline
                        className={cn(
                          'size-5.5',
                          vanish ? 'text-[#5e5ce6]' : 'text-foreground',
                        )}
                      />
                    </span>
                  </MenuItem>

                  <MenuItem onClick={onOpenPasscode} className={iosMenuItem()}>
                    Passcode
                    <span className="flex items-center gap-2">
                      {hasPasscode && (
                        <span className="text-[15px] text-imsg-text-gray">
                          On
                        </span>
                      )}
                      <IoKeypadOutline
                        className={cn(
                          'size-5.5',
                          hasPasscode ? 'text-imsg-blue' : 'text-foreground',
                        )}
                      />
                    </span>
                  </MenuItem>

                  <MenuItem
                    closeOnClick={false}
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className={iosMenuItem()}
                  >
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                    {isDark ? (
                      <IoSunnyOutline className="size-5.5 text-foreground" />
                    ) : (
                      <IoMoonOutline className="size-5.5 text-foreground" />
                    )}
                  </MenuItem>
                </div>

                {/* iOS thick group separator before destructive actions */}
                <div className={menu.separator()} />

                <div className={menu.group()}>
                  {deleted && isAdmin && (
                    <MenuItem onClick={onRestore} className={iosMenuItem()}>
                      Restore Chat
                      <IoArrowUndoOutline className="size-5.5 text-foreground" />
                    </MenuItem>
                  )}

                  <MenuItem
                    onClick={onDeleteForMe}
                    className={iosMenuItem({ destructive: true })}
                  >
                    Delete for Me
                    <IoTrashOutline className="size-5.5" />
                  </MenuItem>

                  {isAdmin && !deleted && (
                    <MenuItem
                      onClick={onDeleteForEveryone}
                      className={iosMenuItem({ destructive: true })}
                    >
                      Delete for Everyone
                      <IoTrashOutline className="size-5.5" />
                    </MenuItem>
                  )}
                </div>
              </div>
            </MenuPopup>
          </Menu>
        </div>
      </div>
    </header>
  );
}
