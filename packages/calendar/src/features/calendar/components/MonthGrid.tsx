import type { CalendarWeek } from "../types";
import { DayCell } from "./DayCell";

type MonthGridProps = {
  weeks: CalendarWeek[];
  year: number;
  month: number;
};

export function MonthGrid({ weeks, year, month }: MonthGridProps) {
  return (
    <div
      role="grid"
      aria-label={`${year}年${month + 1}月`}
      aria-readonly="true"
      aria-rowcount={weeks.length}
      aria-colcount={7}
      className="flex min-h-0 flex-1 flex-col gap-px bg-rule"
    >
      {weeks.map((week) => (
        <div
          key={week[0].date}
          role="row"
          className="grid min-h-0 flex-1 grid-cols-7 gap-px bg-rule"
        >
          {week.map((day) => (
            <DayCell key={day.date} day={day} />
          ))}
        </div>
      ))}
    </div>
  );
}
