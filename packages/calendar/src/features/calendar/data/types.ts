export type TemplateKind = "number" | "text";

export type CalendarTemplate = {
  code: string;
  title: string;
  kind: TemplateKind;
  unit: string;
  color: string;
  desc: string;
  sortOrder: number;
};

export type CalendarEventValue = number | string;

export type CalendarData = {
  version: 1;
  templates: CalendarTemplate[];
  events: Record<string, Record<string, CalendarEventValue>>;
  chartTemplates: unknown[];
};

export const DEFAULT_TEMPLATE_COLOR = "#1d3a8a";

export function createDefaultCalendarData(): CalendarData {
  return {
    version: 1,
    templates: [],
    events: {},
    chartTemplates: [],
  };
}

export function cloneCalendarData(data: CalendarData): CalendarData {
  return structuredClone(data);
}

function normalizeTemplate(value: unknown, index: number): CalendarTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const code = typeof raw.code === "string" ? raw.code.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";

  if (!code || !title) {
    return null;
  }

  const kind = raw.kind === "text" ? "text" : "number";

  return {
    code,
    title,
    kind,
    unit: kind === "number" && typeof raw.unit === "string" ? raw.unit : "",
    color:
      typeof raw.color === "string" && raw.color.trim()
        ? raw.color
        : DEFAULT_TEMPLATE_COLOR,
    desc: typeof raw.desc === "string" ? raw.desc : "",
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : index,
  };
}

export function normalizeCalendarData(value: unknown): CalendarData {
  if (!value || typeof value !== "object") {
    return createDefaultCalendarData();
  }

  const raw = value as Record<string, unknown>;
  const templates: CalendarTemplate[] = [];
  const seenCodes = new Set<string>();

  if (Array.isArray(raw.templates)) {
    raw.templates.forEach((item, index) => {
      const template = normalizeTemplate(item, index);

      if (template && !seenCodes.has(template.code)) {
        seenCodes.add(template.code);
        templates.push(template);
      }
    });
  }

  templates
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((template, index) => {
      template.sortOrder = index;
    });

  const templateByCode = new Map(templates.map((item) => [item.code, item]));
  const events: CalendarData["events"] = {};

  if (raw.events && typeof raw.events === "object" && !Array.isArray(raw.events)) {
    for (const [date, day] of Object.entries(raw.events)) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !day ||
        typeof day !== "object" ||
        Array.isArray(day)
      ) {
        continue;
      }

      const cleanDay: Record<string, CalendarEventValue> = {};

      for (const [code, eventValue] of Object.entries(day)) {
        const template = templateByCode.get(code);

        if (!template) {
          continue;
        }

        if (
          template.kind === "number" &&
          typeof eventValue === "number" &&
          Number.isFinite(eventValue)
        ) {
          cleanDay[code] = eventValue;
        }

        if (template.kind === "text" && typeof eventValue === "string") {
          cleanDay[code] = eventValue;
        }
      }

      if (Object.keys(cleanDay).length > 0) {
        events[date] = cleanDay;
      }
    }
  }

  return {
    version: 1,
    templates,
    events,
    chartTemplates: Array.isArray(raw.chartTemplates) ? raw.chartTemplates : [],
  };
}

export function generateTemplateCode(
  templates: Array<Pick<CalendarTemplate, "code">>,
): string {
  const existing = new Set(templates.map((template) => template.code));
  let code = "";

  do {
    code = `tpl_${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.has(code));

  return code;
}

export function nextTemplateSortOrder(
  templates: Array<Pick<CalendarTemplate, "sortOrder">>,
): number {
  return templates.reduce((max, template) => Math.max(max, template.sortOrder), -1) + 1;
}

export function sortTemplates(templates: CalendarTemplate[]): CalendarTemplate[] {
  return [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function countTemplateUsage(data: CalendarData, code: string): number {
  return Object.values(data.events).reduce((count, day) => {
    return count + (Object.prototype.hasOwnProperty.call(day, code) ? 1 : 0);
  }, 0);
}

export function removeTemplateFromData(data: CalendarData, code: string): CalendarData {
  const events: CalendarData["events"] = {};

  for (const [date, day] of Object.entries(data.events)) {
    const rest = { ...day };
    delete rest[code];

    if (Object.keys(rest).length > 0) {
      events[date] = rest;
    }
  }

  return {
    ...data,
    templates: data.templates
      .filter((template) => template.code !== code)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((template, index) => ({ ...template, sortOrder: index })),
    events,
  };
}

export function validateTemplateDraft(data: CalendarData): Map<string, string[]> {
  const errors = new Map<string, string[]>();
  const seenCodes = new Set<string>();

  for (const template of data.templates) {
    const messages = errors.get(template.code) ?? [];
    const code = template.code.trim();

    if (!template.title.trim()) {
      messages.push("标题不能为空");
    }

    if (!code) {
      messages.push("code 不能为空");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      messages.push("code 只能包含字母、数字、下划线和短横线");
    } else if (seenCodes.has(code)) {
      messages.push("code 不能重复");
    }

    if (code) {
      seenCodes.add(code);
    }

    if (messages.length > 0) {
      errors.set(template.code, messages);
    }
  }

  return errors;
}
