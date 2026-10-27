export const WEEKDAY_LABELS = [
  "周日",
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
] as const;

export const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
] as const;

export const MIN_YEAR = 1970;
export const MAX_YEAR = 2100;

export function getYearOptions(selectedYear: number) {
  const start = Math.min(MIN_YEAR, selectedYear);
  const end = Math.max(MAX_YEAR, selectedYear);
  const years: number[] = [];

  for (let year = start; year <= end; year += 1) {
    years.push(year);
  }

  return years;
}
