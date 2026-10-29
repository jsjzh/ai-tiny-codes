import dayjs from "dayjs";

import {
  getNumericFields,
  resolveNumericFieldValues,
  type CalendarData,
  type CalendarTemplate,
  type NumericField,
} from "@/features/calendar/data/types";

import type { BlockRange, CalendarBlock } from "../data/types";

export type BlockResultStatus =
  | "ok"
  | "empty"
  | "invalid"
  | "missing-params";

export type BlockResult = {
  status: BlockResultStatus;
  value: string;
  unit: string;
  info: string;
  date?: string;
  rangeLabel?: string;
  exceedsCase: boolean;
};

type EventEntry = {
  date: string;
  value: number | string;
};

type ResolvedRange = {
  start: string | null;
  end: string | null;
  label: string;
  exceedsCase: boolean;
};

function getEventTemplate(
  calendar: CalendarData,
  eventCode: string,
): CalendarTemplate | null {
  return (
    calendar.templates.find((template) => template.code === eventCode) ??
    null
  );
}

function getField(
  template: CalendarTemplate,
  fieldCode: string | undefined,
): NumericField | null {
  const fields = getNumericFields(template);

  if (fieldCode) {
    const matched = fields.find((field) => field.code === fieldCode);

    if (matched) {
      return matched;
    }
  }

  return (
    fields.find((field) => field.kind === "input") ?? fields[0] ?? null
  );
}

function getEntries(
  calendar: CalendarData,
  template: CalendarTemplate,
  fieldCode: string | undefined,
): EventEntry[] {
  const entries: EventEntry[] = [];
  const field = getField(template, fieldCode);

  for (const [date, day] of Object.entries(calendar.events)) {
    if (!Object.prototype.hasOwnProperty.call(day, template.code)) {
      continue;
    }

    if (template.kind === "text") {
      const value = day[template.code];

      if (typeof value === "string" && value.trim()) {
        entries.push({ date, value });
      }

      continue;
    }

    if (!field) {
      continue;
    }

    const values = resolveNumericFieldValues(template, day[template.code]);
    const value = values[field.code];

    if (typeof value === "number" && Number.isFinite(value)) {
      entries.push({ date, value });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function resolveRange(
  range: BlockRange,
  caseRange: { startDate: string; endDate: string },
  entries: EventEntry[],
): ResolvedRange | null {
  if (range.type === "case") {
    return {
      start: caseRange.startDate,
      end: caseRange.endDate,
      label: "案例区间",
      exceedsCase: false,
    };
  }

  if (range.type === "all") {
    if (entries.length === 0) {
      return null;
    }

    return {
      start: entries[0].date,
      end: entries[entries.length - 1].date,
      label: "全部历史",
      exceedsCase:
        entries[0].date < caseRange.startDate ||
        entries[entries.length - 1].date > caseRange.endDate,
    };
  }

  const latestBeforeEnd = [...entries]
    .reverse()
    .find((entry) => entry.date <= caseRange.endDate);

  if (!latestBeforeEnd) {
    return null;
  }

  const start = dayjs(latestBeforeEnd.date)
    .subtract(Math.max(1, range.days) - 1, "day")
    .format("YYYY-MM-DD");

  return {
    start,
    end: latestBeforeEnd.date,
    label: `近 ${range.days} 天`,
    exceedsCase: start < caseRange.startDate,
  };
}

function filterEntries(
  entries: EventEntry[],
  range: ResolvedRange,
): EventEntry[] {
  return entries.filter((entry) => {
    return (
      (!range.start || entry.date >= range.start) &&
      (!range.end || entry.date <= range.end)
    );
  });
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

function formatDate(date: string): string {
  return dayjs(date).format("MM-DD");
}

function resultInfo(block: CalendarBlock, fallback: string): string {
  return block.info.trim() || fallback;
}

function emptyResult(
  info: string,
  unit = "",
  status: BlockResultStatus = "empty",
): BlockResult {
  return {
    status,
    value: "--",
    unit,
    info,
    exceedsCase: false,
  };
}

function numericValues(
  entries: EventEntry[],
): Array<{ date: string; value: number }> {
  return entries.filter(
    (entry): entry is { date: string; value: number } =>
      typeof entry.value === "number" && Number.isFinite(entry.value),
  );
}

function consecutiveStreak(entries: EventEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }

  let streak = 1;

  for (let index = entries.length - 1; index > 0; index -= 1) {
    const current = dayjs(entries[index].date);
    const previous = dayjs(entries[index - 1].date);

    if (current.diff(previous, "day") !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function resolveBlockResult(
  block: CalendarBlock,
  calendar: CalendarData,
  caseRange: { startDate: string; endDate: string },
): BlockResult {
  const rule = block.rule;

  if (rule.type === "fixed") {
    const value = rule.value?.trim() ?? "";

    return {
      status: value ? "ok" : "empty",
      value: value || "--",
      unit: rule.unit ?? "",
      info: block.info,
      exceedsCase: false,
    };
  }

  if (!block.eventCode) {
    return emptyResult("未绑定事项");
  }

  const template = getEventTemplate(calendar, block.eventCode);

  if (!template) {
    return emptyResult("引用的事项已删除", "", "invalid");
  }

  const field = getField(template, rule.fieldCode);
  const allEntries = getEntries(calendar, template, rule.fieldCode);
  const range = rule.range ?? { type: "case" };
  const resolved = resolveRange(range, caseRange, allEntries);

  if (!resolved) {
    return emptyResult("范围内暂无数据");
  }

  const entries = filterEntries(allEntries, resolved);
  const rangeLabel = range.type === "case" ? undefined : resolved.label;
  const exceedsCase = resolved.exceedsCase;
  const base = { rangeLabel, exceedsCase };
  const unit = field?.unit ?? template.unit;

  if (template.kind === "text") {
    if (rule.type === "latest") {
      const latest = entries[entries.length - 1];

      if (!latest) {
        return { ...emptyResult("范围内暂无数据"), ...base };
      }

      return {
        status: "ok",
        value: String(latest.value),
        unit: "",
        info: resultInfo(block, `最新记录 ${formatDate(latest.date)}`),
        date: latest.date,
        ...base,
      };
    }

    if (rule.type === "count") {
      return {
        status: "ok",
        value: String(entries.length),
        unit: "",
        info: resultInfo(block, `范围内 ${entries.length} 条记录`),
        ...base,
      };
    }

    return { ...emptyResult("文本事项只支持最新值或计数"), ...base, status: "invalid" };
  }

  const values = numericValues(entries);

  if (values.length === 0) {
    return { ...emptyResult("范围内暂无数值", unit), ...base };
  }

  const first = values[0];
  const last = values[values.length - 1];

  if (rule.type === "latest") {
    return {
      status: "ok",
      value: formatNumber(last.value),
      unit,
      info: resultInfo(block, `最新记录 ${formatDate(last.date)}`),
      date: last.date,
      ...base,
    };
  }

  if (rule.type === "first") {
    return {
      status: "ok",
      value: formatNumber(first.value),
      unit,
      info: resultInfo(block, `最早记录 ${formatDate(first.date)}`),
      date: first.date,
      ...base,
    };
  }

  if (rule.type === "count") {
    return {
      status: "ok",
      value: String(values.length),
      unit: "",
      info: resultInfo(block, `范围内 ${values.length} 条记录`),
      ...base,
    };
  }

  if (rule.type === "streak") {
    return {
      status: "ok",
      value: String(consecutiveStreak(entries)),
      unit: "天",
      info: resultInfo(block, `截至 ${formatDate(last.date)}`),
      date: last.date,
      ...base,
    };
  }

  if (rule.type === "sum") {
    const sum = values.reduce((total, item) => total + item.value, 0);
    return {
      status: "ok",
      value: formatNumber(sum),
      unit,
      info: resultInfo(block, `范围内 ${values.length} 条记录`),
      ...base,
    };
  }

  if (rule.type === "average") {
    const sum = values.reduce((total, item) => total + item.value, 0);
    return {
      status: "ok",
      value: formatNumber(sum / values.length),
      unit,
      info: resultInfo(block, `范围内 ${values.length} 条记录`),
      ...base,
    };
  }

  if (rule.type === "max" || rule.type === "min") {
    const target = values.reduce((best, item) =>
      rule.type === "max"
        ? item.value > best.value
          ? item
          : best
        : item.value < best.value
          ? item
          : best,
    );

    return {
      status: "ok",
      value: formatNumber(target.value),
      unit,
      info: resultInfo(
        block,
        `${rule.type === "max" ? "最高" : "最低"} ${formatDate(target.date)}`,
      ),
      date: target.date,
      ...base,
    };
  }

  if (rule.type === "delta" || rule.type === "loss" || rule.type === "change") {
    const direction =
      rule.type === "loss"
        ? "first-last"
        : rule.type === "change"
          ? "last-first"
          : (rule.direction ?? "last-first");
    const delta =
      direction === "first-last"
        ? first.value - last.value
        : last.value - first.value;

    return {
      status: "ok",
      value: formatNumber(delta),
      unit,
      info: resultInfo(
        block,
        `${formatDate(first.date)} → ${formatDate(last.date)}`,
      ),
      ...base,
    };
  }

  if (rule.type === "bmi") {
    if (!rule.heightCm || rule.heightCm <= 0) {
      return { ...emptyResult("未填写身高"), ...base, status: "missing-params" };
    }

    const heightM = rule.heightCm / 100;
    return {
      status: "ok",
      value: formatNumber(last.value / (heightM * heightM)),
      unit: "",
      info: resultInfo(block, `身高 ${rule.heightCm}cm`),
      date: last.date,
      ...base,
    };
  }

  if (rule.type === "distanceToTarget") {
    if (rule.target === undefined || !Number.isFinite(rule.target)) {
      return {
        ...emptyResult("未填写目标值", unit),
        ...base,
        status: "missing-params",
      };
    }

    return {
      status: "ok",
      value: formatNumber(last.value - rule.target),
      unit,
      info: resultInfo(
        block,
        `目标 ${formatNumber(rule.target)}${unit}`,
      ),
      date: last.date,
      ...base,
    };
  }

  return { ...emptyResult("不支持的块规则"), ...base, status: "invalid" };
}

export function blockRangeDescription(
  block: CalendarBlock,
  caseRange: { startDate: string; endDate: string },
  calendar: CalendarData,
): string {
  if (block.rule.type === "fixed") {
    return "固定值";
  }

  if (!block.eventCode) {
    return "未绑定事项";
  }

  const template = getEventTemplate(calendar, block.eventCode);

  if (!template) {
    return "事项已失效";
  }

  const entries = getEntries(calendar, template, block.rule.fieldCode);
  const resolved = resolveRange(
    block.rule.range ?? { type: "case" },
    caseRange,
    entries,
  );

  if (!resolved) {
    return "范围内暂无数据";
  }

  return `${resolved.label} · ${resolved.start ?? "…"} ~ ${
    resolved.end ?? "…"
  }${resolved.exceedsCase ? "（含案例外回看）" : ""}`;
}
