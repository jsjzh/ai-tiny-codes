import {
  sortTemplates,
  type CalendarData,
  type CalendarEventValue,
  type CalendarTemplate,
  type TemplateKind,
} from "./types";

export type CalendarEventDisplay = {
  code: string;
  title: string;
  kind: TemplateKind;
  unit: string;
  color: string;
  sortOrder: number;
  value: CalendarEventValue;
  date?: string;
};

export type EventUpdate = {
  date: string;
  code: string;
  value: CalendarEventValue;
};

export type EventKey = {
  date: string;
  code: string;
};

export function isEventValueValid(
  template: CalendarTemplate,
  value: CalendarEventValue,
): boolean {
  if (template.kind === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function parseEventInput(
  template: CalendarTemplate,
  raw: string,
): CalendarEventValue | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  if (template.kind === "number") {
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : null;
  }

  return trimmed;
}

export function formatEventInputValue(value: CalendarEventValue): string {
  return String(value);
}

export function formatEventValue(
  template: Pick<CalendarTemplate, "kind" | "unit">,
  value: CalendarEventValue,
): string {
  if (template.kind === "number") {
    return `${value}${template.unit ? ` ${template.unit}` : ""}`;
  }

  return String(value);
}

export function getEventsForDate(
  data: CalendarData,
  date: string,
): CalendarEventDisplay[] {
  const day = data.events[date];

  if (!day) {
    return [];
  }

  return sortTemplates(data.templates)
    .filter((template) => Object.prototype.hasOwnProperty.call(day, template.code))
    .map((template) => ({
      code: template.code,
      title: template.title,
      kind: template.kind,
      unit: template.unit,
      color: template.color,
      sortOrder: template.sortOrder,
      value: day[template.code],
    }));
}

export function getEventsForDates(
  data: CalendarData,
  dates: string[],
): CalendarEventDisplay[] {
  return [...new Set(dates)]
    .sort()
    .flatMap((date) =>
      getEventsForDate(data, date).map((event) => ({ ...event, date })),
    );
}

export function countEventsOnDates(data: CalendarData, dates: string[]): number {
  return dates.reduce((count, date) => {
    return count + Object.keys(data.events[date] ?? {}).length;
  }, 0);
}

export function upsertEvents(data: CalendarData, updates: EventUpdate[]): CalendarData {
  const templateByCode = new Map(
    data.templates.map((template) => [template.code, template]),
  );
  const events = { ...data.events };

  for (const update of updates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(update.date)) {
      throw new Error(`日期格式错误：${update.date}`);
    }

    const template = templateByCode.get(update.code);

    if (!template) {
      throw new Error(`模板不存在：${update.code}`);
    }

    if (!isEventValueValid(template, update.value)) {
      throw new Error(`「${template.title}」的值类型不正确`);
    }

    events[update.date] = {
      ...(events[update.date] ?? {}),
      [update.code]: update.value,
    };
  }

  return { ...data, events };
}

export function deleteEventKeys(data: CalendarData, keys: EventKey[]): CalendarData {
  const events = { ...data.events };

  for (const key of keys) {
    const day = events[key.date];

    if (!day || !Object.prototype.hasOwnProperty.call(day, key.code)) {
      continue;
    }

    const nextDay = { ...day };
    delete nextDay[key.code];

    if (Object.keys(nextDay).length > 0) {
      events[key.date] = nextDay;
    } else {
      delete events[key.date];
    }
  }

  return { ...data, events };
}

export function deleteAllEventsOnDates(
  data: CalendarData,
  dates: string[],
): CalendarData {
  const events = { ...data.events };

  for (const date of dates) {
    delete events[date];
  }

  return { ...data, events };
}
