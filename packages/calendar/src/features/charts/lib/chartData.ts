import dayjs from "dayjs";

import type { CalendarData } from "@/features/calendar/data/types";

import type {
  ChartTemplate,
  NumericMetricCode,
} from "../data/types";

export type ChartRange = {
  startDate: string;
  endDate: string;
};

export type NumericPoint = {
  date: string;
  value: number | null;
};

export type NumericSeries = {
  metric: NumericMetricCode;
  points: NumericPoint[];
};

export type NumericChartData = {
  dates: string[];
  series: NumericSeries[];
  min: number;
  max: number;
  unit: string;
  valueCount: number;
};

export type TextChartRow = {
  date: string;
  value: string;
};

export type TextDistributionItem = {
  value: string;
  count: number;
};

export type TextChartData = {
  rows: TextChartRow[];
  distribution: TextDistributionItem[];
  total: number;
};

type NumericEntry = {
  date: string;
  value: number;
};

const MAX_CHART_DAYS = 5000;

function datesBetween(range: ChartRange): string[] {
  if (!range.startDate || !range.endDate || range.startDate > range.endDate) {
    return [];
  }

  const dates: string[] = [];
  const end = dayjs(range.endDate);
  let current = dayjs(range.startDate);
  let guard = 0;

  while (!current.isAfter(end, "day") && guard < MAX_CHART_DAYS) {
    dates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
    guard += 1;
  }

  return dates;
}

function numericEntries(
  calendar: CalendarData,
  eventCode: string,
): NumericEntry[] {
  const entries: NumericEntry[] = [];

  for (const [date, day] of Object.entries(calendar.events)) {
    const value = day[eventCode];

    if (typeof value === "number" && Number.isFinite(value)) {
      entries.push({ date, value });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function averageAt(
  entries: NumericEntry[],
  date: string,
  days: number,
): number | null {
  const start = dayjs(date)
    .subtract(Math.max(1, days) - 1, "day")
    .format("YYYY-MM-DD");
  let sum = 0;
  let count = 0;

  for (const entry of entries) {
    if (entry.date >= start && entry.date <= date) {
      sum += entry.value;
      count += 1;
    }
  }

  return count > 0 ? sum / count : null;
}

function buildChangeRate(entries: NumericEntry[]): Map<string, number> {
  const rates = new Map<string, number>();
  let previous: number | null = null;

  for (const entry of entries) {
    if (previous !== null && previous !== 0) {
      rates.set(entry.date, ((entry.value - previous) / previous) * 100);
    }

    previous = entry.value;
  }

  return rates;
}

export function buildNumericChartData(
  template: ChartTemplate,
  calendar: CalendarData,
  range: ChartRange,
): NumericChartData {
  const dates = datesBetween(range);
  const event = calendar.templates.find(
    (item) => item.code === template.eventCode,
  );
  const entries = event ? numericEntries(calendar, event.code) : [];
  const valueByDate = new Map(
    entries.map((entry) => [entry.date, entry.value]),
  );
  const changeRateByDate = buildChangeRate(entries);
  const series = template.metrics.map((metric) => ({
    metric,
    points: dates.map((date) => ({
      date,
      value:
        metric === "daily"
          ? (valueByDate.get(date) ?? null)
          : metric === "avg7"
            ? averageAt(entries, date, 7)
            : metric === "avg30"
              ? averageAt(entries, date, 30)
              : (changeRateByDate.get(date) ?? null),
    })),
  }));
  const values = series.flatMap((item) =>
    item.points
      .map((point) => point.value)
      .filter((value): value is number => value !== null),
  );
  const unit = template.metrics.includes("changeRate")
    ? "%"
    : (event?.unit ?? "");
  let min = values.length > 0 ? Math.min(...values) : 0;
  let max = values.length > 0 ? Math.max(...values) : 1;

  if (unit === "%") {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    min -= padding;
    max += padding;
  } else {
    const padding = (max - min) * 0.08;
    min -= padding;
    max += padding;
  }

  return {
    dates,
    series,
    min,
    max,
    unit,
    valueCount: values.length,
  };
}

export function buildTextChartData(
  template: ChartTemplate,
  calendar: CalendarData,
  range: ChartRange,
): TextChartData {
  const event = calendar.templates.find(
    (item) => item.code === template.eventCode,
  );

  if (!event) {
    return { rows: [], distribution: [], total: 0 };
  }

  const rows: TextChartRow[] = [];

  for (const [date, day] of Object.entries(calendar.events)) {
    if (date < range.startDate || date > range.endDate) {
      continue;
    }

    const value = day[event.code];

    if (typeof value === "string" && value.trim()) {
      rows.push({ date, value: value.trim() });
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));

  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.value, (counts.get(row.value) ?? 0) + 1);
  }

  const distribution = Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return { rows, distribution, total: rows.length };
}