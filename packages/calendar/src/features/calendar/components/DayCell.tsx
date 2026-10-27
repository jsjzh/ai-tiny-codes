import dayjs from "dayjs";

import { cn } from "@/lib/utils";

import { WEEKDAY_LABELS } from "../lib/date";
import type { CalendarDay } from "../types";

type DayCellProps = {
  day: CalendarDay;
};

export function DayCell({ day }: DayCellProps) {
  const dateLabel = `${dayjs(day.date).format("YYYY年M月D日")}，${WEEKDAY_LABELS[day.weekday]}${day.isToday ? "，今天" : ""}`;

  return (
    <div
      role="gridcell"
      aria-label={dateLabel}
      aria-current={day.isToday ? "date" : undefined}
      data-date={day.date}
      className={cn(
        "relative min-h-0 bg-sheet p-2 transition-colors sm:p-3",
        day.isToday ? "bg-blueprint" : "hover:bg-blueprint-soft/40",
      )}
    >
      <span
        className={cn(
          "absolute right-2 top-2 font-mono text-sm leading-none tabular-nums sm:right-3 sm:top-3 sm:text-base",
          day.isToday
            ? "font-semibold text-white"
            : day.inCurrentMonth
              ? "font-medium text-ink"
              : "font-normal text-muted-foreground",
        )}
      >
        {day.dayOfMonth}
      </span>

      {day.isToday ? (
        <span className="absolute bottom-2 left-2 text-[10px] font-medium tracking-wide text-white/75 sm:bottom-3 sm:left-3">
          今天
        </span>
      ) : null}
    </div>
  );
}
