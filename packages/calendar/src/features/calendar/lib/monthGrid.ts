import dayjs from "dayjs";

import type { CalendarDay, CalendarWeek } from "../types";

export function buildMonthMatrix(year: number, month: number): CalendarWeek[] {
  const firstDay = dayjs(new Date(year, month, 1));
  const lastDay = firstDay.endOf("month");
  const gridStart = firstDay.subtract(firstDay.day(), "day");
  const gridEnd = lastDay.add(6 - lastDay.day(), "day");
  const today = dayjs().startOf("day");

  const weeks: CalendarWeek[] = [];
  let week: CalendarDay[] = [];
  let cursor = gridStart;

  while (!cursor.isAfter(gridEnd, "day")) {
    week.push({
      date: cursor.format("YYYY-MM-DD"),
      dayOfMonth: cursor.date(),
      weekday: cursor.day(),
      inCurrentMonth: cursor.year() === year && cursor.month() === month,
      isToday: cursor.isSame(today, "day"),
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }

    cursor = cursor.add(1, "day");
  }

  if (week.length > 0) {
    weeks.push(week);
  }

  return weeks;
}
