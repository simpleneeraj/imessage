const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return WEEKDAY_FMT.format(date);
  return DATE_FMT.format(date);
}

/** "Today 2:51 PM" — the bold day part and the regular time part. */
export function separatorParts(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  return { day: dayLabel(date, new Date()), time: TIME_FMT.format(date) };
}

/** Right-aligned timestamp in the conversation list. */
export function listTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return TIME_FMT.format(date);
  if (days === 1) return "Yesterday";
  if (days < 7) return WEEKDAY_FMT.format(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(date);
}
