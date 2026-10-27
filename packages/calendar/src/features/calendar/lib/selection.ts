import dayjs from "dayjs";

export function datesBetween(start: string, end: string): string[] {
  const startDate = dayjs(start);
  const endDate = dayjs(end);
  const [from, to] = startDate.isAfter(endDate, "day")
    ? [endDate, startDate]
    : [startDate, endDate];
  const dates: string[] = [];
  let cursor = from;

  while (!cursor.isAfter(to, "day")) {
    dates.push(cursor.format("YYYY-MM-DD"));
    cursor = cursor.add(1, "day");
  }

  return dates;
}
