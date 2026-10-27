import dayjs from "dayjs";
import type { MouseEvent, PointerEvent } from "react";

import { cn } from "@/lib/utils";

import { WEEKDAY_LABELS } from "../lib/date";
import type { CalendarDay } from "../types";

type DayCellProps = {
  day: CalendarDay;
  isSelected: boolean;
  onPointerDown: (date: string, event: PointerEvent<HTMLElement>) => void;
  onPointerEnter: (date: string, event: PointerEvent<HTMLElement>) => void;
  onClick: (date: string, event: MouseEvent<HTMLElement>) => void;
  onDoubleClick: (date: string) => void;
};

export function DayCell({
  day,
  isSelected,
  onPointerDown,
  onPointerEnter,
  onClick,
  onDoubleClick,
}: DayCellProps) {
  const dateLabel = `${dayjs(day.date).format("YYYY年M月D日")}，${WEEKDAY_LABELS[day.weekday]}${day.isToday ? "，今天" : ""}`;

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={dateLabel}
      aria-current={day.isToday ? "date" : undefined}
      aria-selected={isSelected}
      data-date={day.date}
      data-selected={isSelected ? "true" : undefined}
      onPointerDown={(event) => onPointerDown(day.date, event)}
      onPointerEnter={(event) => onPointerEnter(day.date, event)}
      onClick={(event) => onClick(day.date, event)}
      onDoubleClick={() => onDoubleClick(day.date)}
      className={cn(
        "relative min-h-0 w-full cursor-pointer select-none bg-sheet p-2 text-left transition-colors sm:p-3",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blueprint",
        isSelected && "outline-1 outline-offset-[-1px] outline-signal",
        day.isToday
          ? "bg-blueprint"
          : isSelected
            ? "bg-signal-soft hover:bg-signal-soft-strong"
            : "hover:bg-blueprint-soft/40",
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
    </button>
  );
}
