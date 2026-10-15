import { YearDays } from "./types";

/** 某年某月的天数（month 为 1~12） */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function ymd(year: number, month: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(month)}-${p(day)}`;
}

/**
 * 计算全年与每月的通勤日数。
 * 通勤日 = 落在 commuteWeekdays 里的天，且不在 holidays 中。
 */
export function buildYearDays(
  year: number,
  commuteWeekdays: number[],
  holidays: string[] = []
): YearDays {
  const weekdaySet = new Set(commuteWeekdays);
  const holidaySet = new Set(holidays);
  const monthlyCommuteDays: number[] = [];
  let totalDays = 0;
  let commuteDays = 0;

  for (let month = 1; month <= 12; month++) {
    const days = daysInMonth(year, month);
    totalDays += days;
    let monthCommute = 0;

    for (let day = 1; day <= days; day++) {
      const weekday = new Date(year, month - 1, day).getDay();
      if (!weekdaySet.has(weekday)) continue;
      if (holidaySet.has(ymd(year, month, day))) continue;
      monthCommute += 1;
    }

    commuteDays += monthCommute;
    monthlyCommuteDays.push(monthCommute);
  }

  return { totalDays, commuteDays, monthlyCommuteDays };
}