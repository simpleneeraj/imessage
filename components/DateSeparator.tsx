import { separatorParts } from "@/lib/time";

export function DateSeparator({ at }: { at: string }) {
  const { day, time } = separatorParts(at);
  return (
    <div className="flex justify-center py-3">
      <span className="text-[11px] text-imsg-text-gray">
        <span className="font-semibold">{day}</span> {time}
      </span>
    </div>
  );
}
