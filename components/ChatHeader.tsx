'use client';

import Link from 'next/link';
import {
  IoArrowUndo,
  IoChevronBack,
  IoChevronForward,
  IoEllipsisHorizontalCircle,
} from 'react-icons/io5';
import {
  IoIosTimer,
  IoIosTrash,
  IoIosCall,
  IoIosVideocam,
  IoLogoOctocat,
  IoIosColorPalette,
  IoIosInformationCircle,
} from 'react-icons/io';
import type { Profile } from '@/lib/types';
import { useCall } from './CallProvider';
import { Avatar } from './Avatar';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { iosMenu, iosMenuItem } from '@/components/ui/ios-menu';
import { cn } from '@/lib/utils';

const menu = iosMenu();

export function ChatHeader({
  title,
  others,
  conversationId,
  onOpenDetails,
  onOpenTheme,
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
  conversationId: string;
  onOpenDetails?: () => void;
  onOpenTheme?: () => void;
  vanish: boolean;
  onToggleVanish: () => void;
  isAdmin: boolean;
  deleted: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onRestore: () => void;
}) {
  const { startCall, status: callStatus } = useCall();
  const callPeer =
    others.length === 1
      ? { id: others[0].id, name: others[0].display_name }
      : null;

  const shown = others.slice(0, 2);

  return (
    <header className="hairline-b shrink-0 bg-sidebar/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-2xl grid-cols-[64px_1fr_64px] items-center px-2 pb-1.5 pt-1">
        <Link
          href="/letters"
          aria-label="Back to conversations"
          className="flex h-11 items-center justify-start pl-1 text-primary active:opacity-60 md:invisible"
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
                size={36}
                className="ring-2 ring-sidebar"
              />
              <Avatar
                name={shown[1].display_name}
                size={28}
                className="-ml-3 mt-3 ring-2 ring-sidebar"
              />
            </div>
          ) : (
            <Avatar name={shown[0]?.display_name ?? '?'} size={44} />
          )}
          <span className="flex max-w-50 items-center gap-0.5 text-[12px] leading-none">
            <span className="truncate">{title}</span>
            <IoChevronForward className="size-3 shrink-0 text-ring" />
          </span>
        </button>

        <div className="flex items-center justify-end gap-4 pr-1 sm:pr-0">
          {callPeer && (
            <Menu>
              <MenuTrigger
                aria-label="Call options"
                render={<button className="cursor-pointer" />}
              >
                <IoLogoOctocat className="text-primary size-6" />
              </MenuTrigger>
              <MenuPopup align="end" sideOffset={6} className={menu.popup()}>
                <div className={menu.card()}>
                  <div className={menu.group()}>
                    <MenuItem
                      onClick={() =>
                        startCall(callPeer, 'audio', conversationId)
                      }
                      disabled={callStatus !== 'idle'}
                      className={iosMenuItem()}
                    >
                      Voice Call
                      <IoIosCall className="size-5 text-foreground" />
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        startCall(callPeer, 'video', conversationId)
                      }
                      disabled={callStatus !== 'idle'}
                      className={iosMenuItem()}
                    >
                      Video Call
                      <IoIosVideocam className="size-5 text-foreground" />
                    </MenuItem>
                  </div>
                </div>
              </MenuPopup>
            </Menu>
          )}
          <Menu>
            <MenuTrigger
              aria-label="More"
              render={<button className="cursor-pointer" />}
            >
              <IoEllipsisHorizontalCircle className="text-primary size-6" />
            </MenuTrigger>
            <MenuPopup align="end" sideOffset={6} className={menu.popup()}>
              <div className={menu.card()}>
                <div className={menu.group()}>
                  <MenuItem onClick={onOpenTheme} className={iosMenuItem()}>
                    Change Theme
                    <IoIosColorPalette className="size-5 text-foreground" />
                  </MenuItem>
                  <MenuItem onClick={onToggleVanish} className={iosMenuItem()}>
                    Vanish Mode
                    <span className="flex items-center gap-2">
                      {vanish && (
                        <span className="text-sm text-muted-foreground">
                          On
                        </span>
                      )}
                      <IoIosTimer
                        className={cn(
                          'size-5',
                          vanish ? 'text-primary' : 'text-foreground',
                        )}
                      />
                    </span>
                  </MenuItem>
                  <MenuItem onClick={onOpenDetails} className={iosMenuItem()}>
                    Chat Info
                    <IoIosInformationCircle className="size-5 text-foreground" />
                  </MenuItem>
                </div>
                <div className={menu.separator()} />

                <div className={menu.group()}>
                  {deleted && isAdmin && (
                    <MenuItem onClick={onRestore} className={iosMenuItem()}>
                      Restore Chat
                      <IoArrowUndo className="size-5 text-foreground" />
                    </MenuItem>
                  )}

                  <MenuItem
                    onClick={onDeleteForMe}
                    className={iosMenuItem({ destructive: true })}
                  >
                    Delete for Me
                    <IoIosTrash className="size-5" />
                  </MenuItem>

                  {isAdmin && !deleted && (
                    <MenuItem
                      onClick={onDeleteForEveryone}
                      className={iosMenuItem({ destructive: true })}
                    >
                      Delete for Everyone
                      <IoIosTrash className="size-5" />
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
