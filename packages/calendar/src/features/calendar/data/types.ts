import {
  parseFormula,
  evaluateFormulaNode,
} from "../lib/formula";

export type TemplateKind = "number" | "text";
export type NumericFieldKind = "input" | "formula";

export const IMPLICIT_FIELD_CODE = "value";

export type NumericField = {
  code: string;
  label: string;
  unit: string;
  color: string;
  kind: NumericFieldKind;
  formula?: string;
  showInCalendar: boolean;
};

export type CalendarTemplate = {
  code: string;
  title: string;
  kind: TemplateKind;
  unit: string;
  color: string;
  desc: string;
  sortOrder: number;
  fields?: NumericField[];
};

export type NumericEventValue = number | Record<string, number>;
export type CalendarEventValue = number | string | Record<string, number>;

export type CalendarData = {
  version: 1;
  templates: CalendarTemplate[];
  events: Record<string, Record<string, CalendarEventValue>>;
  chartTemplates: unknown[];
};

export const DEFAULT_TEMPLATE_COLOR = "#1d3a8a";

export function getNumericFields(
  template: Pick<CalendarTemplate, "kind" | "title" | "unit" | "color" | "fields">,
): NumericField[] {
  if (template.kind === "text") {
    return [];
  }

  if (template.fields && template.fields.length > 0) {
    return template.fields;
  }

  return [
    {
      code: IMPLICIT_FIELD_CODE,
      label: template.title,
      unit: template.unit,
      color: template.color,
      kind: "input",
      showInCalendar: true,
    },
  ];
}

export function getInputNumericFields(
  template: Pick<CalendarTemplate, "kind" | "title" | "unit" | "color" | "fields">,
): NumericField[] {
  return getNumericFields(template).filter((field) => field.kind === "input");
}

export function getInputFieldValues(
  template: Pick<CalendarTemplate, "kind" | "title" | "unit" | "color" | "fields">,
  value: CalendarEventValue | undefined,
): Record<string, number> {
  const inputFields = getInputNumericFields(template);
  const values: Record<string, number> = {};

  if (inputFields.length === 0) {
    return values;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    values[inputFields[0].code] = value;
    return values;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return values;
  }

  for (const field of inputFields) {
    const fieldValue = (value as Record<string, unknown>)[field.code];

    if (typeof fieldValue === "number" && Number.isFinite(fieldValue)) {
      values[field.code] = fieldValue;
    }
  }

  return values;
}

export function resolveNumericFieldValues(
  template: Pick<CalendarTemplate, "kind" | "title" | "unit" | "color" | "fields">,
  value: CalendarEventValue | undefined,
): Record<string, number | null> {
  const fields = getNumericFields(template);
  const inputValues = getInputFieldValues(template, value);
  const fieldByCode = new Map(fields.map((field) => [field.code, field]));
  const resolved: Record<string, number | null> = {};

  for (const field of fields) {
    if (field.kind === "input") {
      resolved[field.code] = inputValues[field.code] ?? null;
    }
  }

  const resolving = new Set<string>();

  function resolveField(code: string): number | null {
    if (Object.prototype.hasOwnProperty.call(resolved, code)) {
      return resolved[code];
    }

    const field = fieldByCode.get(code);

    if (!field || field.kind !== "formula" || resolving.has(code)) {
      return null;
    }

    const parsed = parseFormula(field.formula ?? "");

    if (!parsed.ok) {
      resolved[code] = null;
      return null;
    }

    resolving.add(code);
    const value = evaluateFormulaNode(parsed.node, resolveField);
    resolving.delete(code);
    resolved[code] = value;
    return value;
  }

  for (const field of fields) {
    if (field.kind === "formula") {
      resolveField(field.code);
    }
  }

  return resolved;
}

export function toStoredNumericValue(
  template: Pick<CalendarTemplate, "kind" | "title" | "unit" | "color" | "fields">,
  values: Record<string, number>,
): NumericEventValue | null {
  const inputFields = getInputNumericFields(template);

  if (inputFields.length === 0) {
    return null;
  }

  if (inputFields.length === 1) {
    const value = values[inputFields[0].code];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  const next: Record<string, number> = {};

  for (const field of inputFields) {
    const value = values[field.code];

    if (typeof value === "number" && Number.isFinite(value)) {
      next[field.code] = value;
    }
  }

  return Object.keys(next).length > 0 ? next : null;
}

function normalizeFields(
  raw: unknown,
  title: string,
  unit: string,
  color: string,
): NumericField[] {
  const fields: NumericField[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }

      const record = item as Record<string, unknown>;
      let code =
        typeof record.code === "string" ? record.code.trim() : "";

      if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
        code = `field_${index + 1}`;
      }

      if (seen.has(code)) {
        return;
      }

      const label =
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : code;
      const fieldUnit =
        typeof record.unit === "string" ? record.unit : "";
      const fieldColor =
        typeof record.color === "string" && record.color.trim()
          ? record.color
          : color;
      const kind: NumericFieldKind =
        record.kind === "formula" ? "formula" : "input";
      const formula =
        kind === "formula" && typeof record.formula === "string"
          ? record.formula
          : undefined;

      seen.add(code);
      fields.push({
        code,
        label,
        unit: fieldUnit,
        color: fieldColor,
        kind,
        formula,
        showInCalendar: record.showInCalendar !== false,
      });
    });
  }

  if (!fields.some((field) => field.kind === "input")) {
    const implicitCode = seen.has(IMPLICIT_FIELD_CODE)
      ? `field_${fields.length + 1}`
      : IMPLICIT_FIELD_CODE;

    fields.unshift({
      code: implicitCode,
      label: title,
      unit,
      color,
      kind: "input",
      showInCalendar: true,
    });
  }

  return fields;
}

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
  const unit =
    kind === "number" && typeof raw.unit === "string" ? raw.unit : "";
  const color =
    typeof raw.color === "string" && raw.color.trim()
      ? raw.color
      : DEFAULT_TEMPLATE_COLOR;

  return {
    code,
    title,
    kind,
    unit,
    color,
    desc: typeof raw.desc === "string" ? raw.desc : "",
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : index,
    fields:
      kind === "number"
        ? normalizeFields(raw.fields, title, unit, color)
        : [],
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

        if (template.kind === "number") {
          const inputValues = getInputFieldValues(
            template,
            eventValue as CalendarEventValue,
          );
          const stored = toStoredNumericValue(template, inputValues);

          if (stored !== null) {
            cleanDay[code] = stored;
          }
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

export function generateNumericFieldCode(
  fields: Array<Pick<NumericField, "code">>,
): string {
  const existing = new Set(fields.map((field) => field.code));
  let code = "";

  do {
    code = `field_${Math.random().toString(36).slice(2, 7)}`;
  } while (existing.has(code));

  return code;
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

    if (template.kind === "number") {
      const fields = getNumericFields(template);
      const inputFields = fields.filter((field) => field.kind === "input");
      const fieldCodes = new Set(fields.map((field) => field.code));

      if (inputFields.length === 0) {
        messages.push("至少需要一个输入字段");
      }

      const seenFieldCodes = new Set<string>();

      for (const field of fields) {
        if (!field.code) {
          messages.push("字段 code 不能为空");
        } else if (!/^[a-zA-Z0-9_-]+$/.test(field.code)) {
          messages.push(`字段 code 不合法：${field.code}`);
        } else if (seenFieldCodes.has(field.code)) {
          messages.push(`字段 code 重复：${field.code}`);
        }

        if (!field.label.trim()) {
          messages.push("字段名称不能为空");
        }

        seenFieldCodes.add(field.code);

        if (field.kind === "formula") {
          if (!field.formula?.trim()) {
            messages.push(`公式字段「${field.label || field.code}」缺少公式`);
          } else {
            const parsed = parseFormula(field.formula);

            if (!parsed.ok) {
              messages.push(
                `公式字段「${field.label || field.code}」：${parsed.error}`,
              );
            } else {
              const unknown = parsed.refs.find(
                (ref) => !fieldCodes.has(ref),
              );

              if (unknown) {
                messages.push(
                  `公式字段「${field.label || field.code}」引用未知字段：${unknown}`,
                );
              }
            }
          }
        }
      }
    }

    if (messages.length > 0) {
      errors.set(template.code, messages);
    }
  }

  return errors;
}
