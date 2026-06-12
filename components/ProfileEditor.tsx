"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { Avatar } from "./Avatar";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const MOODS = ["😀 Happy", "😎 Chilling", "🚀 Focused", "😴 Sleepy", "🎉 Celebrating", "🤔 Thinking"];

export function ProfileEditor({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [mood, setMood] = useState(profile.mood ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const name = displayName.trim();
    if (!name || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name, mood: mood.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (!error) {
      updateProfile({ display_name: name, mood: mood.trim() || null });
      onOpenChange(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position="bottom">
      <DrawerPopup showBar className="max-h-[88dvh] overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Edit Profile</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-6 pb-8">
          <div className="flex flex-col items-center gap-2">
            <Avatar name={displayName || profile.display_name} size={80} />
            <span className="text-[14px] text-muted-foreground">
              @{profile.username}
            </span>
          </div>

          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
            />
          </Field>

          <Field>
            <FieldLabel>Mood</FieldLabel>
            <Input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              maxLength={40}
              placeholder="What's your vibe?"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className="cursor-pointer rounded-full border border-border px-3 py-1 text-[13px] hover:bg-imsg-gray/40"
              >
                {m}
              </button>
            ))}
          </div>

          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="h-11 cursor-pointer rounded-full bg-imsg-blue text-[16px] font-semibold text-white hover:bg-imsg-blue/90"
          >
            Save
          </Button>
        </div>
      </DrawerPopup>
    </Drawer>
  );
}
