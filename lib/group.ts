import type { Message } from "./types";

// iMessage layout rules, computed as pure data so MessageList stays simple:
// - a "group" = consecutive messages from one sender no more than a minute apart
// - the bubble tail goes on the last bubble of a group only
// - in group chats, the sender's name sits above the first received bubble of
//   a group and their avatar beside the last one
// - a date separator appears when the day changes or after an hour-long gap

const GROUP_GAP_MS = 60_000;
const SEPARATOR_GAP_MS = 3_600_000;

export type SeparatorRow = { type: "separator"; key: string; at: string };

export type MessageRow = {
  type: "message";
  key: string;
  message: Message;
  mine: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSenderLabel: boolean;
  showAvatar: boolean;
};

export type Row = SeparatorRow | MessageRow;

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function buildRows(
  messages: Message[],
  { isGroup, me }: { isGroup: boolean; me: string }
): Row[] {
  const rows: Row[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const at = new Date(msg.created_at);

    const needsSeparator =
      !prev ||
      !sameDay(new Date(prev.created_at), at) ||
      at.getTime() - new Date(prev.created_at).getTime() > SEPARATOR_GAP_MS;

    if (needsSeparator) {
      rows.push({ type: "separator", key: `sep-${msg.client_id}`, at: msg.created_at });
    }

    // Vibe expressions and call records render as standalone centered rows, so
    // they always break the bubble grouping on both sides.
    const isStandalone = (m: Message | undefined) =>
      m?.payload?.kind === "expression" || m?.payload?.kind === "call";

    const isFirstInGroup =
      needsSeparator ||
      !prev ||
      isStandalone(msg) ||
      isStandalone(prev) ||
      prev.sender_id !== msg.sender_id ||
      at.getTime() - new Date(prev.created_at).getTime() > GROUP_GAP_MS;

    const nextStartsNewGroup =
      !next ||
      isStandalone(msg) ||
      isStandalone(next) ||
      next.sender_id !== msg.sender_id ||
      new Date(next.created_at).getTime() - at.getTime() > GROUP_GAP_MS ||
      !sameDay(new Date(next.created_at), at) ||
      new Date(next.created_at).getTime() - at.getTime() > SEPARATOR_GAP_MS;

    const mine = msg.sender_id === me;

    rows.push({
      type: "message",
      key: msg.client_id,
      message: msg,
      mine,
      isFirstInGroup,
      isLastInGroup: nextStartsNewGroup,
      showSenderLabel: isGroup && !mine && isFirstInGroup,
      showAvatar: !mine && nextStartsNewGroup,
    });
  }

  return rows;
}
