"use client";

import { useRef, useState } from "react";

// iMessage input bar: "+" button, pill-shaped field with "iMessage"
// placeholder, mic icon that swaps to the blue ↑ send button when typing.
export function Composer({ onSend }: { onSend: (body: string) => void }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function submit() {
    const body = value.trim();
    if (!body) return;
    setValue("");
    requestAnimationFrame(autoGrow);
    onSend(body);
    textareaRef.current?.focus();
  }

  return (
    <div className="shrink-0 bg-white px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
      <div className="mx-auto flex w-full max-w-2xl items-end gap-2.5">
        <button
          type="button"
          aria-label="Add attachment"
          className="mb-[3px] flex size-[34px] shrink-0 items-center justify-center rounded-full bg-imsg-gray text-[#7c7c80] active:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <div className="relative flex min-h-[36px] flex-1 items-center rounded-[18px] border border-[#c7c7cc99] bg-white">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="iMessage"
            enterKeyHint="send"
            className="max-h-[120px] flex-1 resize-none bg-transparent py-[6px] pl-3.5 pr-9 text-[17px] leading-[22px] outline-none placeholder:text-imsg-text-gray"
          />

          {hasText ? (
            <button
              type="button"
              aria-label="Send"
              onClick={submit}
              className="absolute bottom-[3px] right-[3px] flex size-[29px] items-center justify-center rounded-full bg-imsg-blue text-white active:opacity-70"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V6M6 12l6-6 6 6" />
              </svg>
            </button>
          ) : (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-[6px] right-2.5 text-imsg-text-gray"
            >
              <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
