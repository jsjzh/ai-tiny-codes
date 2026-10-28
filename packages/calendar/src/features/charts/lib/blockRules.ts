import dayjs from "dayjs";

import type {
  CalendarData,
  CalendarEventValue,
  CalendarTemplate,
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
  value: CalendarEventValue;
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

function getEntries(
  calendar: CalendarData,
  eventCode: string,
): EventEntry[] {
  const entries: EventEntry[] = [];

  for (const [date, day] of Object.entries(calendar.events)) {
    if (Object.prototype.hasOwnProperty.call(day, eventCode)) {
      entries.push({ date, value: day[eventCode] });
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
  return String(Number(value.toFixed(1)));
}

function formatDate(date: string): string {
  return dayjs(date).format("MM-DD");
}

function resultInfo(
  block: CalendarBlock,
  fallback: string,
): string {
  return block.info.trim() || fallback;
}

function numericEntries(entries: EventEntry[]): Array<{
  date: string;
  value: number;
}> {
  return entries.filter((entry): entry is { date: string; value: number } =>
    typeof entry.value === "number" && Number.isFinite(entry.value),
  );
}

function emptyResult(info: string): BlockResult {
  return {
    status: "empty",
    value: "--",
    unit: "",
    info,
    exceedsCase: false,
  };
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
    return {
      status: "invalid",
      value: "--",
      unit: "",
      info: "引用的事项已删除",
      exceedsCase: false,
    };
  }

  const range = rule.range ?? { type: "case" };
  const allEntries = getEntries(calendar, block.eventCode);
  const resolved = resolveRange(range, caseRange, allEntries);

  if (!resolved) {
    return emptyResult("范围内暂无数据");
  }

  const entries = filterEntries(allEntries, resolved);
  const rangeLabel = range.type === "case" ? undefined : resolved.label;
  const exceedsCase = resolved.exceedsCase;
  const base = {
    rangeLabel,
    exceedsCase,
  };

  if (rule.type === "latest") {
    const latest = entries[entries.length - 1];

    if (!latest) {
      return { ...emptyResult("范围内暂无数据"), ...base };
    }

    return {
      status: "ok",
      value:
        typeof latest.value === "number"
          ? formatNumber(latest.value)
          : latest.value,
      unit: template.unit,
      info: resultInfo(block, `最新记录 ${formatDate(latest.date)}`),
      date: latest.date,
      ...base,
    };
  }

  if (template.kind === "text") {
    return {
      ...emptyResult("文本事项只支持最新值"),
      status: "invalid",
      ...base,
    };
  }

  const values = numericEntries(entries);

  if (values.length === 0) {
    return { ...emptyResult("范围内暂无数值"), ...base };
  }

  const first = values[0];
  const last = values[values.length - 1];

  switch (rule.type) {
    case "max": {
      const target = values.reduce((max, item) =>
        item.value > max.value ? item : max,
      );

      return {
        status: "ok",
        value: formatNumber(target.value),
        unit: template.unit,
        info: resultInfo(block, `最高 ${formatDate(target.date)}`),
        date: target.date,
        ...base,
      };
    }

    case "min": {
      const target = values.reduce((min, item) =>
        item.value < min.value ? item : min,
      );

      return {
        status: "ok",
        value: formatNumber(target.value),
        unit: template.unit,
        info: resultInfo(block, `最低 ${formatDate(target.date)}`),
        date: target.date,
        ...base,
      };
    }

    case "loss": {
      return {
        status: "ok",
        value: formatNumber(first.value - last.value),
        unit: template.unit,
        info: resultInfo(
          block,
          `较 ${formatDate(first.date)}`,
        ),
        ...base,
      };
    }

    case "change": {
      return {
        status: "ok",
        value: formatNumber(last.value - first.value),
        unit: template.unit,
        info: resultInfo(
          block,
          `${formatDate(first.date)} → ${formatDate(last.date)}`,
        ),
        ...base,
      };
    }

    case "bmi": {
      if (!rule.heightCm || rule.heightCm <= 0) {
        return {
          status: "missing-params",
          value: "--",
          unit: "",
          info: "未填写身高",
          ...base,
        };
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

    case "distanceToTarget": {
      if (rule.target === undefined || !Number.isFinite(rule.target)) {
        return {
          status: "missing-params",
          value: "--",
          unit: template.unit,
          info: "未填写目标值",
          ...base,
        };
      }

      return {
        status: "ok",
        value: formatNumber(last.value - rule.target),
        unit: template.unit,
        info: resultInfo(
          block,
          `目标 ${formatNumber(rule.target)}${template.unit}`,
        ),
        date: last.date,
        ...base,
      };
    }

    default:
      return { ...emptyResult("不支持的块规则"), status: "invalid" };
  }
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

  const entries = getEntries(calendar, block.eventCode);
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