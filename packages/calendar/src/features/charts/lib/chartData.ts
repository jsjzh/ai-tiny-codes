import dayjs from "dayjs";

import {
  getNumericFields,
  resolveNumericFieldValues,
  type CalendarData,
  type NumericField,
} from "@/features/calendar/data/types";

import {
  getChartSeries,
  NUMERIC_SERIES_OPERATION_LABELS,
  type ChartTemplate,
  type NumericSeriesOperation,
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
  key: string;
  label: string;
  fieldCode: string;
  operation: NumericSeriesOperation;
  window?: number;
  color: string;
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

function fieldEntries(
  calendar: CalendarData,
  eventCode: string,
  fieldCode: string,
): NumericEntry[] {
  const event = calendar.templates.find(
    (item) => item.code === eventCode,
  );

  if (!event) {
    return [];
  }

  const entries: NumericEntry[] = [];

  for (const [date, day] of Object.entries(calendar.events)) {
    const resolved = resolveNumericFieldValues(event, day[eventCode]);
    const value = resolved[fieldCode];

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

function buildCumulativeSum(entries: NumericEntry[]): Map<string, number> {
  const sums = new Map<string, number>();
  let sum = 0;

  for (const entry of entries) {
    sum += entry.value;
    sums.set(entry.date, sum);
  }

  return sums;
}

function valueOnDate(
  entries: NumericEntry[],
  date: string,
): number | null {
  let latest: number | null = null;

  for (const entry of entries) {
    if (entry.date > date) {
      break;
    }

    latest = entry.value;
  }

  return latest;
}

function cumulativeOnDate(
  entries: NumericEntry[],
  date: string,
  cumulativeByDate: Map<string, number>,
): number | null {
  let latest: number | null = null;

  for (const entry of entries) {
    if (entry.date > date) {
      break;
    }

    latest = cumulativeByDate.get(entry.date) ?? latest;
  }

  return latest;
}

function pointsForOperation(
  entries: NumericEntry[],
  dates: string[],
  operation: NumericSeriesOperation,
  window: number,
  range: ChartRange,
): NumericPoint[] {
  const valueByDate = new Map(entries.map((entry) => [entry.date, entry.value]));
  const rateByDate = buildChangeRate(entries);
  const rangeEntries = entries.filter(
    (entry) =>
      entry.date >= range.startDate && entry.date <= range.endDate,
  );
  const cumulativeByDate = buildCumulativeSum(rangeEntries);
  const baseEntry = rangeEntries[0];

  return dates.map((date) => {
    if (operation === "raw") {
      return { date, value: valueByDate.get(date) ?? null };
    }

    if (operation === "rolling") {
      return { date, value: averageAt(entries, date, window) };
    }

    if (operation === "percentChange") {
      return { date, value: rateByDate.get(date) ?? null };
    }

    if (operation === "cumulative") {
      return {
        date,
        value: cumulativeOnDate(rangeEntries, date, cumulativeByDate),
      };
    }

    if (!baseEntry) {
      return { date, value: null };
    }

    const value = valueOnDate(rangeEntries, date);
    return {
      date,
      value: value === null ? null : value - baseEntry.value,
    };
  });
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

  if (!event || event.kind === "text") {
    return {
      dates,
      series: [],
      min: 0,
      max: 1,
      unit: "",
      valueCount: 0,
    };
  }

  const fields = getNumericFields(event);
  const fieldByCode = new Map(fields.map((field) => [field.code, field]));
  const fallbackField =
    fields.find((field) => field.kind === "input") ?? fields[0];
  const series: NumericSeries[] = [];

  for (const [index, spec] of getChartSeries(template).entries()) {
    const field =
      fieldByCode.get(spec.fieldCode || "") ?? fallbackField;

    if (!field) {
      continue;
    }

    const entries = fieldEntries(calendar, event.code, field.code);
    const operation = spec.operation;
    const window =
      operation === "rolling" ? Math.max(2, spec.window ?? 7) : 1;
    const points = pointsForOperation(
      entries,
      dates,
      operation,
      window,
      range,
    );

    const operationLabel =
      operation === "rolling"
        ? `${NUMERIC_SERIES_OPERATION_LABELS[operation]} (${window})`
        : NUMERIC_SERIES_OPERATION_LABELS[operation];

    series.push({
      key: `${field.code}:${operation}:${window}:${index}`,
      label: `${field.label} · ${operationLabel}`,
      fieldCode: field.code,
      operation,
      window: operation === "rolling" ? window : undefined,
      color: field.color,
      points,
    });
  }

  const values = series.flatMap((item) =>
    item.points
      .map((point) => point.value)
      .filter((value): value is number => value !== null),
  );
  const selectedFields = series
    .map((item) => fieldByCode.get(item.fieldCode))
    .filter((field): field is NumericField => Boolean(field));
  const units = Array.from(new Set(selectedFields.map((field) => field.unit)));
  const allPercent = series.length > 0 && series.every(
    (item) => item.operation === "percentChange",
  );
  const unit = allPercent ? "%" : (units[0] ?? event.unit);
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