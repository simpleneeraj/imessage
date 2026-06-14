import { separatorParts } from "@/lib/time";

export function DateSeparator({ at }: { at: string }) {
  const { day, time } = separatorParts(at);
  return (
    <div className="flex justify-center py-3">
      {/* backing pill keeps the date legible over wallpapers in both modes */}
      <span className="rounded-full bg-imsg-gray/70 px-3 py-1 text-[11px] text-imsg-text-gray backdrop-blur-xs">
        <span className="font-semibold">{day}</span> {time}
      </span>
    </div>
  );
}
