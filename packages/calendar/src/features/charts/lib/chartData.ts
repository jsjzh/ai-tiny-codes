import dayjs from "dayjs";

import {
  getNumericFields,
  resolveNumericFieldValues,
  type CalendarData,
  type CalendarTemplate,
  type NumericField,
} from "@/features/calendar/data/types";

import {
  getAnalysisFieldCodes,
  getChartAnalysis,
  getChartSeries,
  CHART_ANALYSIS_LABELS,
  NUMERIC_SERIES_OPERATION_LABELS,
  type ChartAnalysis,
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
  xMode?: "date" | "text";
  analysis?: ChartAnalysis;
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

function analysisFields(
  template: ChartTemplate,
  event: CalendarTemplate,
): NumericField[] {
  const fields = getNumericFields(event);
  const fieldByCode = new Map(fields.map((field) => [field.code, field]));
  const codes = getAnalysisFieldCodes(template);
  const selected = codes
    .map((code) => fieldByCode.get(code))
    .filter((field): field is NumericField => Boolean(field));

  if (selected.length > 0) {
    return selected;
  }

  const fallback = fields.find((field) => field.kind === "input") ?? fields[0];
  return fallback ? [fallback] : [];
}

function monthBuckets(range: ChartRange): Array<{
  label: string;
  start: string;
  end: string;
}> {
  const buckets = [];
  const rangeStart = dayjs(range.startDate);
  const rangeEnd = dayjs(range.endDate);
  let current = rangeStart.startOf("month");
  const end = rangeEnd.startOf("month");

  while (!current.isAfter(end, "month")) {
    const monthStart = current.startOf("month");
    const monthEnd = current.endOf("month");
    buckets.push({
      label: current.format("YYYY-MM"),
      start: (monthStart.isBefore(rangeStart, "day")
        ? rangeStart
        : monthStart
      ).format("YYYY-MM-DD"),
      end: (monthEnd.isAfter(rangeEnd, "day") ? rangeEnd : monthEnd).format(
        "YYYY-MM-DD",
      ),
    });
    current = current.add(1, "month");
  }

  return buckets;
}

function weekBuckets(range: ChartRange): Array<{
  label: string;
  start: string;
  end: string;
}> {
  const buckets = [];
  let current = dayjs(range.startDate).startOf("week");
  const rangeStart = dayjs(range.startDate);
  const end = dayjs(range.endDate);

  while (!current.isAfter(end, "day")) {
    const start = current.isBefore(rangeStart, "day")
      ? rangeStart
      : current;
    const weekEnd = current.endOf("week");
    buckets.push({
      label: start.format("YYYY-MM-DD"),
      start: start.format("YYYY-MM-DD"),
      end: (weekEnd.isAfter(end, "day") ? end : weekEnd).format("YYYY-MM-DD"),
    });
    current = current.add(1, "week");
  }

  return buckets;
}

function bucketDelta(
  entries: NumericEntry[],
  start: string,
  end: string,
): number | null {
  const values = entries
    .filter((entry) => entry.date >= start && entry.date <= end)
    .map((entry) => entry.value);

  if (values.length === 0) {
    return null;
  }

  return values[values.length - 1] - values[0];
}

function buildAnalysisChartData(
  analysis: Exclude<ChartAnalysis, "series">,
  template: ChartTemplate,
  calendar: CalendarData,
  event: CalendarTemplate,
  range: ChartRange,
  dates: string[],
): NumericChartData {
  const fields = analysisFields(template, event);
  const fieldEntriesList = fields.map((field) => ({
    field,
    entries: fieldEntries(calendar, event.code, field.code),
  }));

  if (analysis === "recordQuality") {
    const buckets = monthBuckets(range);
    const records = Object.entries(calendar.events).filter(
      ([date, day]) =>
        date >= range.startDate &&
        date <= range.endDate &&
        Object.prototype.hasOwnProperty.call(day, event.code),
    );
    const points = buckets.map((bucket) => ({
      date: bucket.label,
      value: records.filter(
        ([date]) => date >= bucket.start && date <= bucket.end,
      ).length,
    }));

    return {
      dates: buckets.map((bucket) => bucket.label),
      series: [
        {
          key: "recordQuality",
          label: "记录天数",
          fieldCode: "",
          operation: "raw",
          color: event.color,
          points,
        },
      ],
      min: 0,
      max: Math.max(1, ...points.map((point) => point.value ?? 0)),
      unit: "天",
      valueCount: points.filter((point) => (point.value ?? 0) > 0).length,
      xMode: "text",
      analysis,
    };
  }

  if (analysis === "distribution") {
    const entry = fieldEntriesList[0];
    const values = (entry?.entries ?? []).filter(
      (item) => item.date >= range.startDate && item.date <= range.endDate,
    );
    const numeric = values.map((item) => item.value);
    const min = numeric.length > 0 ? Math.min(...numeric) : 0;
    const max = numeric.length > 0 ? Math.max(...numeric) : 1;
    const binCount = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(numeric.length))));
    const span = max - min || 1;
    const step = span / binCount;
    const counts = new Array(binCount).fill(0);

    for (const value of numeric) {
      const index = Math.min(
        binCount - 1,
        Math.floor((value - min) / step),
      );
      counts[index] += 1;
    }

    const labels = counts.map((_, index) => {
      const from = min + step * index;
      const to = from + step;
      return `${Number(from.toFixed(1))}~${Number(to.toFixed(1))}`;
    });
    const points = labels.map((label, index) => ({
      date: label,
      value: counts[index],
    }));

    return {
      dates: labels,
      series: [
        {
          key: "distribution",
          label: entry?.field.label ?? "分布",
          fieldCode: entry?.field.code ?? "",
          operation: "raw",
          color: entry?.field.color ?? event.color,
          points,
        },
      ],
      min: 0,
      max: Math.max(1, ...counts),
      unit: "条",
      valueCount: numeric.length,
      xMode: "text",
      analysis,
    };
  }

  if (analysis === "weekdayAverage") {
    const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const series = fieldEntriesList.map(({ field, entries }) => {
      const buckets = [[], [], [], [], [], [], []] as number[][];

      for (const entry of entries) {
        if (entry.date < range.startDate || entry.date > range.endDate) {
          continue;
        }

        buckets[dayjs(entry.date).day()].push(entry.value);
      }

      return {
        key: `weekday:${field.code}`,
        label: `${field.label} · ${CHART_ANALYSIS_LABELS[analysis]}`,
        fieldCode: field.code,
        operation: "raw" as const,
        color: field.color,
        points: labels.map((label, index) => ({
          date: label,
          value:
            buckets[index].length > 0
              ? buckets[index].reduce((sum, value) => sum + value, 0) /
                buckets[index].length
              : null,
        })),
      };
    });

    return summarizeChartData(labels, series, fields[0]?.unit ?? "", "text", analysis);
  }

  if (analysis === "monthlyDelta" || analysis === "weeklyDelta") {
    const buckets = analysis === "monthlyDelta"
      ? monthBuckets(range)
      : weekBuckets(range);
    const series = fieldEntriesList.map(({ field, entries }) => ({
      key: `${analysis}:${field.code}`,
      label: `${field.label} · ${CHART_ANALYSIS_LABELS[analysis]}`,
      fieldCode: field.code,
      operation: "raw" as const,
      color: field.color,
      points: buckets.map((bucket) => ({
        date: bucket.label,
        value: bucketDelta(entries, bucket.start, bucket.end),
      })),
    }));

    return summarizeChartData(
      buckets.map((bucket) => bucket.label),
      series,
      fields[0]?.unit ?? "",
      analysis === "monthlyDelta" ? "text" : "date",
      analysis,
    );
  }

  const series = fieldEntriesList.map(({ field, entries }) => ({
    key: `cumulative:${field.code}`,
    label: `${field.label} · ${CHART_ANALYSIS_LABELS.cumulative}`,
    fieldCode: field.code,
    operation: "deltaFromStart" as const,
    color: field.color,
    points: pointsForOperation(
      entries,
      dates,
      "deltaFromStart",
      1,
      range,
    ),
  }));

  return summarizeChartData(
    dates,
    series,
    fields[0]?.unit ?? "",
    "date",
    analysis,
  );
}

function summarizeChartData(
  dates: string[],
  series: NumericSeries[],
  unit: string,
  xMode: "date" | "text",
  analysis: ChartAnalysis,
): NumericChartData {
  const values = series.flatMap((item) =>
    item.points
      .map((point) => point.value)
      .filter((value): value is number => value !== null),
  );
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const padding = min === max
    ? Math.max(Math.abs(min) * 0.1, 1)
    : (max - min) * 0.08;

  return {
    dates,
    series,
    min: min - padding,
    max: max + padding,
    unit,
    valueCount: values.length,
    xMode,
    analysis,
  };
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
      xMode: "date",
      analysis: "series",
    };
  }

  const analysis = getChartAnalysis(template);

  if (analysis !== "series") {
    return buildAnalysisChartData(
      analysis,
      template,
      calendar,
      event,
      range,
      dates,
    );
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
    xMode: "date",
    analysis: "series",
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
export type RecordCalendarDay = {
  date: string;
  dayOfMonth: number;
  inRange: boolean;
  hasRecord: boolean;
};

export type RecordCalendarMonth = {
  key: string;
  label: string;
  offset: number;
  days: RecordCalendarDay[];
};

export type RecordCalendarData = {
  months: RecordCalendarMonth[];
  totalDays: number;
  recordedDays: number;
};

export function buildRecordCalendarData(
  calendar: CalendarData,
  eventCode: string,
  range: ChartRange,
): RecordCalendarData {
  const months: RecordCalendarMonth[] = [];
  const start = dayjs(range.startDate).startOf("month");
  const end = dayjs(range.endDate).startOf("month");
  let current = start;
  let totalDays = 0;
  let recordedDays = 0;

  while (!current.isAfter(end, "month")) {
    const monthEnd = current.endOf("month");
    const days: RecordCalendarDay[] = [];
    let day = current;

    while (!day.isAfter(monthEnd, "day")) {
      const date = day.format("YYYY-MM-DD");
      const inRange = date >= range.startDate && date <= range.endDate;
      const hasRecord =
        inRange &&
        Boolean(calendar.events[date]?.[eventCode]);

      if (inRange) {
        totalDays += 1;
      }

      if (hasRecord) {
        recordedDays += 1;
      }

      days.push({
        date,
        dayOfMonth: day.date(),
        inRange,
        hasRecord,
      });
      day = day.add(1, "day");
    }

    months.push({
      key: current.format("YYYY-MM"),
      label: current.format("YYYY年M月"),
      offset: current.day(),
      days,
    });
    current = current.add(1, "month");
  }

  return { months, totalDays, recordedDays };
}
