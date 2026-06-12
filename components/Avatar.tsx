import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Deterministic colourful gradient per name (iMessage/Telegram style).
const PALETTE = [
  ["#ff9a56", "#ff6a88"],
  ["#5ec9ff", "#2b78ff"],
  ["#74e39b", "#22b07d"],
  ["#c77dff", "#7c4dff"],
  ["#ffd166", "#ef8a3c"],
  ["#ff7eb3", "#ff5e8a"],
  ["#4dd0e1", "#0097a7"],
  ["#a3a0fb", "#5e5ce6"],
];

function colorsFor(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] as [string, string];
}

export function Avatar({
  name,
  size,
  className,
}: {
  name: string;
  size: number;
  className?: string;
}) {
  const [from, to] = colorsFor(name);
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white",
        className
      )}
    >
      <span className="leading-none">{initials(name)}</span>
    </div>
  );
}
