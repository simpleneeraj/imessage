import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// iOS default contact avatar: gray gradient circle with white initials.
export function Avatar({
  name,
  size,
  className,
}: {
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-b from-[#a9b0bb] to-[#8b93a0] font-medium text-white",
        className
      )}
    >
      <span className="leading-none">{initials(name)}</span>
    </div>
  );
}
