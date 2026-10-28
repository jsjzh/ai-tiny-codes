import type {
  CalendarEventValue,
  CalendarTemplate,
} from "@/features/calendar/data/types";

export type EventImportRow = {
  date: string;
  value: CalendarEventValue;
};

export type EventImportParseResult = {
  rows: EventImportRow[];
  rawCount: number;
  invalidCount: number;
  duplicateCount: number;
  invalidSamples: string[];
  sourceUnit: string;
  format: "json" | "csv";
};

const DATE_KEYS = ["date", "day", "dayStr", "dateStr", "日期"];
const VALUE_KEYS = ["value", "val", "amount", "weight", "值", "数值", "体重"];
const COLLECTION_KEYS = ["logs", "data", "records", "items", "events"];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function makeDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    const raw = String(value);

    if (raw.length === 8) {
      return makeDate(
        Number(raw.slice(0, 4)),
        Number(raw.slice(4, 6)),
        Number(raw.slice(6, 8)),
      );
    }

    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (compact) {
    return makeDate(
      Number(compact[1]),
      Number(compact[2]),
      Number(compact[3]),
    );
  }

  const separated = trimmed.match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
  );

  if (separated) {
    return makeDate(
      Number(separated[1]),
      Number(separated[2]),
      Number(separated[3]),
    );
  }

  return null;
}

function normalizeValue(
  template: Pick<CalendarTemplate, "kind" | "code" | "title">,
  value: unknown,
): CalendarEventValue | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;

    if (Object.prototype.hasOwnProperty.call(raw, template.code)) {
      return normalizeValue(template, raw[template.code]);
    }

    if (Object.prototype.hasOwnProperty.call(raw, template.title)) {
      return normalizeValue(template, raw[template.title]);
    }
  }

  if (template.kind === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(numeric) ? numeric : null;
    }

    return null;
  }

  if (typeof value === "string") {
    const text = value.trim();
    return text ? text : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function pickRawValue(
  item: Record<string, unknown>,
  template: Pick<CalendarTemplate, "code" | "title">,
): unknown {
  if (Object.prototype.hasOwnProperty.call(item, template.code)) {
    return item[template.code];
  }

  if (Object.prototype.hasOwnProperty.call(item, template.title)) {
    return item[template.title];
  }

  for (const key of VALUE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      return item[key];
    }
  }

  return undefined;
}

function pickRawDate(item: Record<string, unknown>): unknown {
  for (const key of DATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      return item[key];
    }
  }

  return undefined;
}

function collectionFrom(raw: unknown): unknown[] | Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;

  for (const key of COLLECTION_KEYS) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return record;
}

function rowsFromJson(
  raw: unknown,
  template: Pick<CalendarTemplate, "kind" | "code" | "title">,
): {
  rows: EventImportRow[];
  rawCount: number;
  invalidCount: number;
  duplicateCount: number;
  invalidSamples: string[];
} {
  const collection = collectionFrom(raw);
  const rows: EventImportRow[] = [];
  const byDate = new Map<string, EventImportRow>();
  const invalidSamples: string[] = [];
  let rawCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  function addRow(dateValue: unknown, value: unknown, label: string) {
    rawCount += 1;
    const date = normalizeDate(dateValue);
    const normalized = normalizeValue(template, value);

    if (!date || normalized === null) {
      invalidCount += 1;

      if (invalidSamples.length < 3) {
        invalidSamples.push(label);
      }

      return;
    }

    if (byDate.has(date)) {
      duplicateCount += 1;
    }

    byDate.set(date, { date, value: normalized });
  }

  if (Array.isArray(collection)) {
    collection.forEach((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        rawCount += 1;
        invalidCount += 1;

        if (invalidSamples.length < 3) {
          invalidSamples.push(`第 ${index + 1} 条不是对象`);
        }

        return;
      }

      const record = item as Record<string, unknown>;
      addRow(
        pickRawDate(record),
        pickRawValue(record, template),
        `第 ${index + 1} 条`,
      );
    });
  } else if (collection) {
    Object.entries(collection).forEach(([key, value]) => {
      const normalizedDate = normalizeDate(key);
      const normalizedValue = normalizeValue(template, value);

      if (normalizedDate && normalizedValue !== null) {
        addRow(key, value, key);
        return;
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        addRow(
          pickRawDate(record) ?? key,
          pickRawValue(record, template),
          key,
        );
        return;
      }

      addRow(key, value, key);
    });
  }

  rows.push(...byDate.values());

  return {
    rows: rows.sort((a, b) => a.date.localeCompare(b.date)),
    rawCount,
    invalidCount,
    duplicateCount,
    invalidSamples,
  };
}

function detectDelimiter(line: string): string {
  const candidates = [",", "\t", ";"];
  let best = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = line.split(candidate).length - 1;

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === delimiter && !quoted) {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell);
  return cells;
}

function findColumn(
  header: string[],
  patterns: string[],
): number {
  return header.findIndex((cell) =>
    patterns.some((pattern) => cell.toLowerCase().includes(pattern)),
  );
}

function rowsFromCsv(
  text: string,
  template: Pick<CalendarTemplate, "kind" | "code" | "title">,
): {
  rows: EventImportRow[];
  rawCount: number;
  invalidCount: number;
  duplicateCount: number;
  invalidSamples: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const rows: EventImportRow[] = [];
  const byDate = new Map<string, EventImportRow>();
  const invalidSamples: string[] = [];
  let rawCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  if (lines.length === 0) {
    return {
      rows,
      rawCount,
      invalidCount,
      duplicateCount,
      invalidSamples,
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const first = parseDelimitedLine(lines[0], delimiter);
  const looksLikeHeader = first.some((cell) =>
    /date|day|日期|value|值|数值|体重/i.test(cell),
  );
  const header = looksLikeHeader ? first : [];
  const dateIndex = looksLikeHeader
    ? Math.max(
        0,
        findColumn(header, ["date", "day", "日期"]),
      )
    : 0;
  const valueIndex = looksLikeHeader
    ? findColumn(header, ["value", "val", "amount", "weight", "值", "数值", "体重"])
    : 1;
  const start = looksLikeHeader ? 1 : 0;

  for (let index = start; index < lines.length; index += 1) {
    rawCount += 1;
    const cells = parseDelimitedLine(lines[index], delimiter);
    const dateValue = cells[dateIndex];
    const value = cells[valueIndex >= 0 ? valueIndex : 1];
    const date = normalizeDate(dateValue);
    const normalized = normalizeValue(template, value);

    if (!date || normalized === null) {
      invalidCount += 1;

      if (invalidSamples.length < 3) {
        invalidSamples.push(`第 ${index + 1} 行`);
      }

      continue;
    }

    if (byDate.has(date)) {
      duplicateCount += 1;
    }

    byDate.set(date, { date, value: normalized });
  }

  rows.push(...byDate.values());

  return {
    rows: rows.sort((a, b) => a.date.localeCompare(b.date)),
    rawCount,
    invalidCount,
    duplicateCount,
    invalidSamples,
  };
}

function findSourceUnit(raw: unknown): string {
  if (Array.isArray(raw)) {
    const withUnit = raw.find(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).unit === "string",
    );

    return withUnit
      ? String((withUnit as Record<string, unknown>).unit)
      : "";
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;

    if (typeof record.unit === "string") {
      return record.unit;
    }

    for (const key of COLLECTION_KEYS) {
      const value = record[key];

      if (Array.isArray(value)) {
        return findSourceUnit(value);
      }
    }
  }

  return "";
}

export function parseEventImport(
  text: string,
  template: Pick<CalendarTemplate, "kind" | "code" | "title">,
  fileName = "",
): EventImportParseResult {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("文件为空");
  }

  let parsed: unknown;
  let format: "json" | "csv" = "csv";

  try {
    parsed = JSON.parse(trimmed);
    format = "json";
  } catch {
    if (fileName.toLowerCase().endsWith(".json")) {
      throw new Error("JSON 格式错误");
    }
  }

  if (format === "json") {
    const result = rowsFromJson(parsed, template);

    return {
      ...result,
      sourceUnit: findSourceUnit(parsed),
      format,
    };
  }

  const result = rowsFromCsv(trimmed, template);

  return {
    ...result,
    sourceUnit: "",
    format,
  };
}