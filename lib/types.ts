export type Profile = {
  id: string;
  username: string;
  display_name: string;
};

export type Conversation = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  /** Hydrated client-side from conversation_participants + profiles. */
  participants: Profile[];
};

export type MessageStatus = "sending" | "queued" | "sent";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_id: string;
  created_at: string;
  /** Local-only delivery state; absent for rows that came from the server. */
  status?: MessageStatus;
};

export type OutboxItem = {
  client_id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  queued_at: string;
};
