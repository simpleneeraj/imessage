'use client';

import { useState } from 'react';
import {
  IoEllipsisHorizontalCircleOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoNotificationsOffOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoSunnyOutline,
} from 'react-icons/io5';
import {
  Menu,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { useAuth } from './AuthProvider';
import { ProfileEditor } from './ProfileEditor';
import { useAppTheme } from '@/lib/useAppTheme';
import { usePush } from '@/hooks/usePush';
import { PALETTES, type PaletteId } from '@/lib/themes';

export function HeaderMenu() {
  const { logout, profile } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const { palette, isDark, setPalette, toggleMode } = useAppTheme();
  const push = usePush();

  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label="Settings"
          className="flex size-11 cursor-pointer items-center justify-center text-primary active:opacity-60"
        >
          <IoEllipsisHorizontalCircleOutline className="size-6" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-52">
          <MenuItem disabled className="opacity-100">
            <span className="text-[13px] text-muted-foreground">
              Signed in as @{profile.username}
            </span>
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            className="cursor-pointer"
            onClick={() => setEditOpen(true)}
          >
            <IoPersonOutline className="size-4" />
            Edit Profile
          </MenuItem>
          <MenuItem
            className="cursor-pointer"
            closeOnClick={false}
            onClick={toggleMode}
          >
            {isDark ? (
              <IoSunnyOutline className="size-4" />
            ) : (
              <IoMoonOutline className="size-4" />
            )}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </MenuItem>
          {push.supported && (
            <MenuItem
              className="cursor-pointer"
              closeOnClick={false}
              disabled={push.busy}
              onClick={() => void push.toggle()}
            >
              {push.enabled ? (
                <IoNotificationsOffOutline className="size-4" />
              ) : (
                <IoNotificationsOutline className="size-4" />
              )}
              {push.enabled ? 'Turn Off Notifications' : 'Turn On Notifications'}
            </MenuItem>
          )}
          <MenuSeparator />
          <MenuRadioGroup
            value={palette}
            onValueChange={(v) => setPalette(v as PaletteId)}
          >
            <MenuGroupLabel>Theme</MenuGroupLabel>
            {PALETTES.map((p) => (
              <MenuRadioItem key={p.id} value={p.id}>
                {p.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuItem className="cursor-pointer" onClick={() => void logout()}>
            <IoLogOutOutline className="size-4" />
            Sign Out
          </MenuItem>
          <MenuItem disabled className="opacity-100">
            <span className="text-[11px] leading-4 text-muted-foreground">
              Encrypted messages restore when you sign back in.
            </span>
          </MenuItem>
        </MenuPopup>
      </Menu>
      <ProfileEditor open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
