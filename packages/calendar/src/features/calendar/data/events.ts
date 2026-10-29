import {
  getInputFieldValues,
  getNumericFields,
  resolveNumericFieldValues,
  sortTemplates,
  toStoredNumericValue,
  type CalendarData,
  type CalendarEventValue,
  type CalendarTemplate,
  type NumericField,
  type TemplateKind,
} from "./types";

export type CalendarEventDisplay = {
  code: string;
  title: string;
  kind: TemplateKind;
  unit: string;
  color: string;
  sortOrder: number;
  fields: NumericField[];
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
    const values = getInputFieldValues(template, value);
    return Object.keys(values).length > 0;
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
  if (value && typeof value === "object") {
    return Object.values(value).join(" / ");
  }

  return String(value);
}

export function formatEventValue(
  template: Pick<CalendarTemplate, "kind" | "title" | "unit" | "color" | "fields">,
  value: CalendarEventValue,
): string {
  if (template.kind === "text") {
    return String(value);
  }

  const fields = getNumericFields(template).filter(
    (field) => field.showInCalendar,
  );
  const values = resolveNumericFieldValues(template, value);
  const fallbackFields =
    fields.length > 0
      ? fields
      : getNumericFields(template).slice(0, 1);
  const groups: Array<{ unit: string; values: string[] }> = [];

  for (const field of fallbackFields) {
    const numeric = values[field.code];
    const text =
      typeof numeric === "number" && Number.isFinite(numeric)
        ? String(Number(numeric.toFixed(2)))
        : "--";
    const last = groups[groups.length - 1];

    if (last && last.unit === field.unit) {
      last.values.push(text);
    } else {
      groups.push({ unit: field.unit, values: [text] });
    }
  }

  const multipleFields = fallbackFields.length > 1;

  return groups
    .map((group) =>
      multipleFields
        ? `${group.values.join("/")}${group.unit}`
        : `${group.values.join("/")}${group.unit ? ` ${group.unit}` : ""}`,
    )
    .join(multipleFields ? "·" : " · ");
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
      fields: getNumericFields(template),
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

    let stored = update.value;

    if (template.kind === "number") {
      const values = getInputFieldValues(template, update.value);
      const numericValue = toStoredNumericValue(template, values);

      if (numericValue === null) {
        throw new Error(`「${template.title}」的值类型不正确`);
      }

      stored = numericValue;
    }

    events[update.date] = {
      ...(events[update.date] ?? {}),
      [update.code]: stored,
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
