import type { ConversationEvent, Profile } from "@/lib/types";

function name(p: Profile | undefined, id: string | null, me: string): string {
  if (id === me) return "You";
  return p?.display_name ?? "Someone";
}

export function systemEventText(
  event: ConversationEvent,
  profilesById: Map<string, Profile>,
  me: string
): string {
  const actor = name(profilesById.get(event.actor_id ?? ""), event.actor_id, me);
  const target = name(
    profilesById.get(event.target_id ?? ""),
    event.target_id,
    me
  );
  switch (event.type) {
    case "member_added":
      return `${actor} added ${target}`;
    case "member_removed":
      return `${actor} removed ${target}`;
    case "member_left":
      return `${target} left the chat`;
    case "group_created":
      return `${actor} created the group`;
    case "conversation_deleted":
      return `${actor} deleted this chat`;
    case "conversation_restored":
      return `${actor} restored this chat`;
    case "vibe_changed":
      return `${actor} changed the chat vibe`;
    case "nickname_changed":
      return `${actor} set a nickname for ${target}`;
  }
}

export function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-imsg-gray/70 px-3 py-1 text-center text-[12px] text-imsg-text-gray">
        {text}
      </span>
    </div>
  );
}
