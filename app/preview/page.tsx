"use client";

// Static fixture of the reference screenshot conversation — renders the full
// thread UI with no Supabase connection. Handy for pixel-comparison against
// the real iMessage screenshot.

import { ChatHeader } from "@/components/ChatHeader";
import { MessageList } from "@/components/MessageList";
import { Composer } from "@/components/Composer";
import type { Message, Profile } from "@/lib/types";

const ME = "me";
const DUNCAN: Profile = { id: "duncan", username: "duncan_knox", display_name: "Duncan Knox", public_key: null };
const JACKELYN: Profile = { id: "jackelyn", username: "jackelyn_knox", display_name: "Jackelyn Knox", public_key: null };
const MINE: Profile = { id: ME, username: "me", display_name: "Me", public_key: null };

function at(hour: number, minute: number, second = 0): string {
  const d = new Date();
  d.setHours(hour, minute, second, 0);
  return d.toISOString();
}

let n = 0;
function msg(sender: string, body: string, time: string): Message {
  n += 1;
  return {
    id: `m${n}`,
    client_id: `m${n}`,
    conversation_id: "preview",
    sender_id: sender,
    body,
    text: body,
    created_at: time,
    ephemeral: false,
    view_once: false,
    attachment_path: null,
    viewed_at: null,
    deleted_at: null,
    edited_at: null,
    reply_to: null,
  };
}

const MESSAGES: Message[] = [
  msg(DUNCAN.id, "My school bag", at(14, 51)),
  msg(ME, "Your snacks are in the fridge", at(14, 52)),
  msg(ME, "Try the new fruit", at(14, 52, 20)),
  msg(DUNCAN.id, "I already finished my homework", at(14, 53)),
  msg(ME, "Just so you know, I’ll be back in less than 1hr.", at(14, 54)),
  msg(JACKELYN.id, "Walk spot pls", at(14, 55)),
  msg(DUNCAN.id, "John messaged me. It’s for school.\nCan one of you approve please?", at(16, 19)),
  msg(ME, "Sure, give me a minute", at(16, 20)),
];

export default function PreviewPage() {
  return (
    <div className="flex h-dvh flex-col bg-white">
      <ChatHeader
        title="2 People"
        others={[DUNCAN, JACKELYN]}
        vanish={false}
        onToggleVanish={() => {}}
        isAdmin={false}
        deleted={false}
        onDeleteForMe={() => {}}
        onDeleteForEveryone={() => {}}
        onRestore={() => {}}
      />
      <MessageList
        messages={MESSAGES}
        isGroup
        me={ME}
        participants={[MINE, DUNCAN, JACKELYN]}
        reactions={new Map()}
        participantsMeta={[]}
        typingUserIds={[]}
        onReact={() => {}}
        onReply={() => {}}
        onUnsend={() => {}}
        onEdit={() => {}}
      />
      <Composer onSend={() => {}} />
    </div>
  );
}
