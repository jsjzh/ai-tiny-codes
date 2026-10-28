import dayjs from "dayjs";

import { WEEKDAY_LABELS } from "./date";

export function sortUniqueDates(dates: string[]): string[] {
  return [...new Set(dates)].sort();
}

export function isContiguousDates(dates: string[]): boolean {
  if (dates.length <= 1) {
    return true;
  }

  for (let index = 1; index < dates.length; index += 1) {
    const previous = dayjs(dates[index - 1]);
    const current = dayjs(dates[index]);

    if (!current.isSame(previous.add(1, "day"), "day")) {
      return false;
    }
  }

  return true;
}

export function formatFullDate(date: string): string {
  return `${dayjs(date).format("YYYY年M月D日")}，${WEEKDAY_LABELS[dayjs(date).day()]}`;
}

export function formatDateChip(date: string): string {
  return `${dayjs(date).format("MM-DD")} ${WEEKDAY_LABELS[dayjs(date).day()]}`;
}

export function summarizeDates(dates: string[]): {
  label: string;
  dates: string[];
  isRange: boolean;
} {
  const sorted = sortUniqueDates(dates);

  if (sorted.length === 0) {
    return { label: "未选择日期", dates: sorted, isRange: false };
  }

  if (sorted.length === 1) {
    return { label: formatFullDate(sorted[0]), dates: sorted, isRange: false };
  }

  if (isContiguousDates(sorted)) {
    return {
      label: `${dayjs(sorted[0]).format("YYYY-MM-DD")} ~ ${dayjs(sorted[sorted.length - 1]).format("YYYY-MM-DD")} · ${sorted.length} 天`,
      dates: sorted,
      isRange: true,
    };
  }

  return { label: `已选 ${sorted.length} 天`, dates: sorted, isRange: false };
}
