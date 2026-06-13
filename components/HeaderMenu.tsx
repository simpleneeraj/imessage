"use client";

import { useState } from "react";
import {
  IoEllipsisHorizontalCircleOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoPersonOutline,
  IoSunnyOutline,
} from "react-icons/io5";
import {
  Menu,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { useAuth } from "./AuthProvider";
import { ProfileEditor } from "./ProfileEditor";
import { REACTION_SETS, type ReactionSetId } from "./Tapback";
import { setReactionSet, useReactionSet } from "@/lib/reactionSet";
import { useAppTheme } from "@/lib/useAppTheme";
import { PALETTES, type PaletteId } from "@/lib/themes";

export function HeaderMenu() {
  const { logout, profile } = useAuth();
  const { palette, isDark, setPalette, toggleMode } = useAppTheme();
  const reactionSet = useReactionSet();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Menu>
      <MenuTrigger
        aria-label="Settings"
        className="flex size-11 cursor-pointer items-center justify-center text-imsg-blue active:opacity-60"
      >
        <IoEllipsisHorizontalCircleOutline className="size-6" />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-52">
        <MenuItem disabled className="opacity-100">
          <span className="text-[13px] text-imsg-text-gray">
            Signed in as @{profile.username}
          </span>
        </MenuItem>
        <MenuSeparator />
        <MenuItem className="cursor-pointer" onClick={() => setEditOpen(true)}>
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
          {isDark ? "Light Mode" : "Dark Mode"}
        </MenuItem>
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
        <MenuRadioGroup
          value={reactionSet}
          onValueChange={(v) => setReactionSet(v as ReactionSetId)}
        >
          <MenuGroupLabel>Reactions</MenuGroupLabel>
          {(Object.keys(REACTION_SETS) as ReactionSetId[]).map((id) => (
            <MenuRadioItem key={id} value={id}>
              {REACTION_SETS[id].label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem className="cursor-pointer" onClick={() => void logout()}>
          <IoLogOutOutline className="size-4" />
          Sign Out
        </MenuItem>
        <MenuItem disabled className="opacity-100">
          <span className="text-[11px] leading-4 text-imsg-text-gray">
            Encrypted messages restore when you sign back in.
          </span>
        </MenuItem>
      </MenuPopup>
      </Menu>
      <ProfileEditor open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
