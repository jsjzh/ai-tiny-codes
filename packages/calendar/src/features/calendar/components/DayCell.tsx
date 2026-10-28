import dayjs from "dayjs";
import type { MouseEvent, PointerEvent } from "react";

import { cn } from "@/lib/utils";

import { formatEventValue, type CalendarEventDisplay } from "../data/events";
import type { DayCellLayout } from "../lib/eventLayout";
import { WEEKDAY_LABELS } from "../lib/date";
import type { CalendarDay } from "../types";

type DayCellProps = {
  day: CalendarDay;
  eventItems: CalendarEventDisplay[];
  layout: DayCellLayout;
  isSelected: boolean;
  onPointerDown: (date: string, event: PointerEvent<HTMLElement>) => void;
  onPointerEnter: (date: string, event: PointerEvent<HTMLElement>) => void;
  onClick: (date: string, event: MouseEvent<HTMLElement>) => void;
  onDoubleClick: (date: string) => void;
};

function EventLine({ event }: { event: CalendarEventDisplay }) {
  const value = formatEventValue(event, event.value);

  return (
    <span className="flex h-4 min-w-0 items-center gap-1 overflow-hidden text-[10px] leading-none sm:h-5 sm:text-[11px]">
      <span
        className="size-1.5 shrink-0 border border-black/10"
        style={{ backgroundColor: event.color }}
      />
      <span className="hidden shrink-0 font-medium sm:inline">{event.title}</span>
      <span className="min-w-0 truncate font-mono text-[10px] tabular-nums text-ink/80 sm:hidden">
        {String(event.value)}
      </span>
      <span
        className={cn(
          "hidden font-mono text-[11px] tabular-nums text-ink/80 sm:inline",
          event.kind === "number" ? "shrink-0" : "min-w-0 truncate",
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function DayCell({
  day,
  eventItems,
  layout,
  isSelected,
  onPointerDown,
  onPointerEnter,
  onClick,
  onDoubleClick,
}: DayCellProps) {
  const visibleEvents = eventItems.slice(0, layout.maxVisible);
  const hiddenCount = eventItems.length - visibleEvents.length;
  const leftEvents =
    layout.columns === 2 ? visibleEvents.slice(0, layout.rows) : visibleEvents;
  const rightEvents =
    layout.columns === 2 ? visibleEvents.slice(layout.rows, layout.rows * 2) : [];

  const dateLabel = `${dayjs(day.date).format("YYYY年M月D日")}，${WEEKDAY_LABELS[day.weekday]}${day.isToday ? "，今天" : ""}${eventItems.length > 0 ? `，${eventItems.length} 个事项` : ""}`;

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
        "relative flex min-h-0 w-full cursor-pointer select-none flex-col overflow-hidden p-1 text-left transition-colors sm:p-2",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blueprint",
        isSelected && "outline-1 outline-offset-[-1px] outline-signal",
        isSelected
          ? "bg-signal-soft hover:bg-signal-soft-strong"
          : day.isToday
            ? "bg-blueprint-soft"
            : "bg-sheet hover:bg-blueprint-soft/40",
      )}
    >
      <span className="mb-1 flex h-5 shrink-0 items-center justify-between sm:mb-2 sm:h-6">
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums sm:text-[11px]",
            day.isToday ? "text-blueprint" : "text-muted-foreground",
          )}
        >
          {hiddenCount > 0 ? `+${hiddenCount}` : ""}
        </span>

        {day.isToday ? (
          <span className="flex size-5 items-center justify-center bg-blueprint font-mono text-xs font-semibold text-white tabular-nums sm:size-6 sm:text-sm">
            {day.dayOfMonth}
          </span>
        ) : (
          <span
            className={cn(
              "font-mono text-sm leading-none tabular-nums sm:text-base",
              day.inCurrentMonth
                ? "font-medium text-ink"
                : "font-normal text-muted-foreground",
            )}
          >
            {day.dayOfMonth}
          </span>
        )}
      </span>

      <span className="flex min-h-0 flex-1 gap-x-2">
        <span className="flex min-w-0 flex-1 flex-col">
          {leftEvents.map((event) => (
            <EventLine key={event.code} event={event} />
          ))}
        </span>
        {layout.columns === 2 ? (
          <span className="flex min-w-0 flex-1 flex-col">
            {rightEvents.map((event) => (
              <EventLine key={event.code} event={event} />
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
