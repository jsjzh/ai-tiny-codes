import type { MouseEvent, PointerEvent } from "react";

import type { CalendarWeek } from "../types";
import { DayCell } from "./DayCell";

type MonthGridProps = {
  weeks: CalendarWeek[];
  year: number;
  month: number;
  selectedDates: ReadonlySet<string>;
  onDayPointerDown: (date: string, event: PointerEvent<HTMLElement>) => void;
  onDayPointerEnter: (date: string, event: PointerEvent<HTMLElement>) => void;
  onDayClick: (date: string, event: MouseEvent<HTMLElement>) => void;
  onDayDoubleClick: (date: string) => void;
};

export function MonthGrid({
  weeks,
  year,
  month,
  selectedDates,
  onDayPointerDown,
  onDayPointerEnter,
  onDayClick,
  onDayDoubleClick,
}: MonthGridProps) {
  return (
    <div
      role="grid"
      aria-label={`${year}年${month + 1}月`}
      aria-multiselectable="true"
      aria-rowcount={weeks.length}
      aria-colcount={7}
      className="flex min-h-0 flex-1 select-none flex-col gap-px bg-rule"
    >
      {weeks.map((week) => (
        <div
          key={week[0].date}
          role="row"
          className="grid min-h-0 flex-1 grid-cols-7 gap-px bg-rule"
        >
          {week.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              isSelected={selectedDates.has(day.date)}
              onPointerDown={onDayPointerDown}
              onPointerEnter={onDayPointerEnter}
              onClick={onDayClick}
              onDoubleClick={onDayDoubleClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
