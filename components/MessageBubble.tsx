"use client";

import { cn } from "@/lib/utils";
import type { MessageRow } from "@/lib/group";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

export function MessageBubble({
  row,
  sender,
}: {
  row: MessageRow;
  sender: Profile | undefined;
}) {
  const { message, mine, isFirstInGroup, isLastInGroup, showSenderLabel, showAvatar } =
    row;
  const pending = message.status === "sending" || message.status === "queued";

  return (
    <div className={cn(isFirstInGroup ? "mt-2" : "mt-[2px]")}>
      {showSenderLabel && (
        <div className="mb-0.5 pl-12 text-[11px] text-imsg-text-gray">
          {sender?.display_name ?? "Unknown"}
        </div>
      )}

      <div className={cn("flex items-end", mine ? "justify-end" : "justify-start")}>
        {!mine &&
          (showAvatar ? (
            <Avatar name={sender?.display_name ?? "?"} size={28} className="mr-2" />
          ) : (
            <div className="mr-2 w-7 shrink-0" aria-hidden />
          ))}

        <div
          className={cn(
            "max-w-[75%] rounded-[18px] px-3.5 py-[7px] text-[17px] leading-[22px] whitespace-pre-wrap [overflow-wrap:anywhere]",
            mine ? "bg-imsg-blue text-white" : "bg-imsg-gray text-black",
            isLastInGroup && "tail",
            isLastInGroup && (mine ? "tail-out" : "tail-in"),
            pending && "opacity-60"
          )}
        >
          <span className="relative z-[2]">{message.body}</span>
        </div>
      </div>

      {mine && message.status === "queued" && isLastInGroup && (
        <div className="mt-0.5 text-right text-[11px] text-imsg-text-gray">
          Waiting for connection…
        </div>
      )}
    </div>
  );
}
