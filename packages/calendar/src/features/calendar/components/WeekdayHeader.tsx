import { cn } from "@/lib/utils";

import { WEEKDAY_LABELS } from "../lib/date";

export function WeekdayHeader() {
  return (
    <div
      className="grid shrink-0 grid-cols-7 gap-px border-b border-rule bg-rule"
      role="presentation"
    >
      {WEEKDAY_LABELS.map((label, index) => (
        <div
          key={label}
          className={cn(
            "bg-paper py-2 text-center text-[11px] font-medium tracking-[0.08em] sm:text-xs",
            index === 0 || index === 6 ? "text-ink/70" : "text-muted-foreground",
          )}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
