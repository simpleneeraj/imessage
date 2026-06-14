import type { MessagePayload } from "./crypto";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  public_key: string | null;
  mood?: string | null;
  /** Per-chat nickname (from the participant row, hydrated client-side). */
  nickname?: string | null;
};

export type VibeId = "classic" | "couple" | "friends" | "professional";

export type Conversation = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string;
  last_message_text: string | null;
  last_message_at: string | null;
  vanish_mode: boolean;
  wallpaper: string | null;
  vibe: VibeId;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Hydrated client-side from conversation_participants + profiles. */
  participants: Profile[];
  /** My own participant row metadata. */
  myLastReadAt?: string | null;
  myHiddenAt?: string | null;
};

export type MessageStatus = "sending" | "queued" | "sent";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  /** Ciphertext envelope (or legacy plaintext). */
  body: string;
  client_id: string;
  created_at: string;
  ephemeral: boolean;
  view_once: boolean;
  attachment_path: string | null;
  viewed_at: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  reply_to: string | null;
  /** Decrypted text; null = decryption failed; undefined = not yet decrypted. */
  text?: string | null;
  /** Decrypted payload for non-text messages. */
  payload?: MessagePayload;
  /** Local-only delivery state; absent for rows that came from the server. */
  status?: MessageStatus;
};

export type OutboxItem = {
  client_id: string;
  conversation_id: string;
  sender_id: string;
  /** Already-encrypted envelope (encryption happens at enqueue time). */
  body: string;
  ephemeral: boolean;
  view_once: boolean;
  attachment_path: string | null;
  reply_to: string | null;
  /** Plaintext kept locally so the optimistic bubble can render offline. */
  text: string;
  queued_at: string;
};

// A reaction token is either a named iMessage tapback or an emoji string
// (from the couple / friends / professional sets).
export type ReactionKind = string;

export type Reaction = {
  message_id: string;
  conversation_id: string;
  user_id: string;
  reaction: ReactionKind;
  updated_at: string;
};

export type ParticipantMeta = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
};

export type ConversationEventType =
  | "member_added"
  | "member_removed"
  | "member_left"
  | "group_created"
  | "conversation_deleted"
  | "conversation_restored"
  | "vibe_changed"
  | "nickname_changed";

export type ConversationEvent = {
  id: string;
  conversation_id: string;
  actor_id: string | null;
  target_id: string | null;
  type: ConversationEventType;
  created_at: string;
};
