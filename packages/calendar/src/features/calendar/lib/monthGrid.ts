import dayjs from "dayjs";

import type { CalendarDay, CalendarWeek } from "../types";

export function buildMonthMatrix(year: number, month: number): CalendarWeek[] {
  const firstDay = dayjs(new Date(year, month, 1));
  const lastDay = firstDay.endOf("month");
  const leadingDays = firstDay.day() === 0 ? 7 : firstDay.day();
  const trailingDays = lastDay.day() === 6 ? 7 : 6 - lastDay.day();
  const gridStart = firstDay.subtract(leadingDays, "day");
  const naturalGridEnd = lastDay.add(trailingDays, "day");
  const naturalGridDays = naturalGridEnd.diff(gridStart, "day") + 1;
  const gridEnd = naturalGridEnd.add(Math.max(0, 42 - naturalGridDays), "day");
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
