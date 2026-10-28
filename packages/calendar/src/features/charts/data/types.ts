export type NumericMetricCode = "daily" | "avg7" | "avg30" | "changeRate";
export type ChartTemplateKind = "numeric" | "text";
export type ChartType = "line" | "bar" | "area" | "table" | "distribution";

export type ChartTemplate = {
  code: string;
  title: string;
  eventCode: string;
  kind: ChartTemplateKind;
  chartType: ChartType;
  metrics: NumericMetricCode[];
  desc: string;
  sortOrder: number;
};

export type BlockRange =
  | { type: "case" }
  | { type: "all" }
  | { type: "lastDays"; days: number };

export type BlockRuleType =
  | "fixed"
  | "latest"
  | "max"
  | "min"
  | "loss"
  | "change"
  | "bmi"
  | "distanceToTarget";

export type BlockRule = {
  type: BlockRuleType;
  value?: string;
  unit?: string;
  range?: BlockRange;
  heightCm?: number;
  target?: number;
};

export type CalendarBlock = {
  id: string;
  title: string;
  info: string;
  eventCode: string | null;
  rule: BlockRule;
};

export type ChartWidget = {
  kind: "chart";
  chartTemplateCode: string;
  height: 1 | 2 | 3 | 4;
};

export type BlockWidget = {
  kind: "block";
  block: CalendarBlock;
  height: 1 | 2;
};

export type CaseWidget = ChartWidget | BlockWidget;

export type ChartCaseRow = {
  slots: Array<CaseWidget | null>;
};

export type ChartCase = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  eventCodes: string[];
  rows: ChartCaseRow[];
  createdAt: string;
  updatedAt: string;
};

export type ChartsData = {
  version: 1;
  templates: ChartTemplate[];
  cases: ChartCase[];
};

export const NUMERIC_METRICS: NumericMetricCode[] = [
  "daily",
  "avg7",
  "avg30",
  "changeRate",
];

export const NUMERIC_CHART_TYPES: ChartType[] = ["line", "bar", "area"];
export const TEXT_CHART_TYPES: ChartType[] = ["table", "distribution"];

export function createDefaultChartsData(): ChartsData {
  return { version: 1, templates: [], cases: [] };
}

export function cloneChartsData(data: ChartsData): ChartsData {
  return structuredClone(data);
}

function normalizeMetrics(
  value: unknown,
  kind: ChartTemplateKind,
): NumericMetricCode[] {
  if (kind === "text" || !Array.isArray(value)) {
    return [];
  }

  const metrics = Array.from(
    new Set(
      value.filter(
        (item): item is NumericMetricCode =>
          typeof item === "string" &&
          NUMERIC_METRICS.includes(item as NumericMetricCode),
      ),
    ),
  );

  if (metrics.includes("changeRate")) {
    return ["changeRate"];
  }

  return metrics.length > 0 ? metrics : ["daily"];
}

function normalizeChartTemplate(
  value: unknown,
  index: number,
): ChartTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const code = typeof raw.code === "string" ? raw.code.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const eventCode =
    typeof raw.eventCode === "string" ? raw.eventCode.trim() : "";

  if (!code || !title || !eventCode) {
    return null;
  }

  const kind: ChartTemplateKind =
    raw.kind === "text" ? "text" : "numeric";
  const chartTypeCandidates =
    kind === "text" ? TEXT_CHART_TYPES : NUMERIC_CHART_TYPES;
  const chartType = chartTypeCandidates.includes(raw.chartType as ChartType)
    ? (raw.chartType as ChartType)
    : chartTypeCandidates[0];

  return {
    code,
    title,
    eventCode,
    kind,
    chartType,
    metrics: normalizeMetrics(raw.metrics, kind),
    desc: typeof raw.desc === "string" ? raw.desc : "",
    sortOrder:
      typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : index,
  };
}

function normalizeRange(value: unknown): BlockRange {
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;

    if (raw.type === "all") {
      return { type: "all" };
    }

    if (raw.type === "lastDays") {
      const days =
        typeof raw.days === "number" && Number.isFinite(raw.days)
          ? Math.max(1, Math.round(raw.days))
          : 30;
      return { type: "lastDays", days };
    }
  }

  return { type: "case" };
}

const BLOCK_RULE_TYPES: BlockRuleType[] = [
  "fixed",
  "latest",
  "max",
  "min",
  "loss",
  "change",
  "bmi",
  "distanceToTarget",
];

function normalizeRule(value: unknown): BlockRule | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  if (!BLOCK_RULE_TYPES.includes(raw.type as BlockRuleType)) {
    return null;
  }

  const type = raw.type as BlockRuleType;

  if (type === "fixed") {
    const fixedValue =
      typeof raw.value === "number" || typeof raw.value === "string"
        ? String(raw.value)
        : "";

    return {
      type,
      value: fixedValue,
      unit: typeof raw.unit === "string" ? raw.unit : "",
    };
  }

  return {
    type,
    range: normalizeRange(raw.range),
    heightCm:
      typeof raw.heightCm === "number" && Number.isFinite(raw.heightCm)
        ? raw.heightCm
        : undefined,
    target:
      typeof raw.target === "number" && Number.isFinite(raw.target)
        ? raw.target
        : undefined,
  };
}

function normalizeBlock(value: unknown): CalendarBlock | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const rule = normalizeRule(raw.rule);

  if (!id || !title || !rule) {
    return null;
  }

  const eventCode =
    typeof raw.eventCode === "string" && raw.eventCode.trim()
      ? raw.eventCode
      : null;

  if (rule.type !== "fixed" && !eventCode) {
    return null;
  }

  return {
    id,
    title,
    info: typeof raw.info === "string" ? raw.info : "",
    eventCode,
    rule,
  };
}

function normalizeWidget(value: unknown): CaseWidget | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  if (raw.kind === "chart") {
    const chartTemplateCode =
      typeof raw.chartTemplateCode === "string"
        ? raw.chartTemplateCode
        : "";

    if (!chartTemplateCode) {
      return null;
    }

    const height =
      typeof raw.height === "number"
        ? Math.min(4, Math.max(1, Math.round(raw.height)))
        : 2;

    return {
      kind: "chart",
      chartTemplateCode,
      height: height as 1 | 2 | 3 | 4,
    };
  }

  if (raw.kind === "block") {
    const block = normalizeBlock(raw.block);

    if (!block) {
      return null;
    }

    const height =
      typeof raw.height === "number"
        ? Math.min(2, Math.max(1, Math.round(raw.height)))
        : 1;

    return {
      kind: "block",
      block,
      height: height as 1 | 2,
    };
  }

  return null;
}

function normalizeRows(value: unknown): ChartCaseRow[] {
  if (!Array.isArray(value)) {
    return [{ slots: [null] }];
  }

  return value.map((row) => {
    const raw =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const slots = Array.isArray(raw.slots)
      ? raw.slots.slice(0, 4).map(normalizeWidget)
      : [];

    while (slots.length < 1) {
      slots.push(null);
    }

    return { slots };
  });
}

function normalizeCase(value: unknown): ChartCase | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const startDate =
    typeof raw.startDate === "string" ? raw.startDate : "";
  const endDate = typeof raw.endDate === "string" ? raw.endDate : "";

  if (
    !id ||
    !name ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return null;
  }

  return {
    id,
    name,
    startDate,
    endDate,
    eventCodes: Array.isArray(raw.eventCodes)
      ? Array.from(
          new Set(
            raw.eventCodes.filter(
              (code): code is string => typeof code === "string",
            ),
          ),
        )
      : [],
    rows: normalizeRows(raw.rows),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

export function normalizeChartsData(value: unknown): ChartsData {
  if (!value || typeof value !== "object") {
    return createDefaultChartsData();
  }

  const raw = value as Record<string, unknown>;
  const templates: ChartTemplate[] = [];
  const templateCodes = new Set<string>();

  if (Array.isArray(raw.templates)) {
    raw.templates.forEach((item, index) => {
      const template = normalizeChartTemplate(item, index);

      if (template && !templateCodes.has(template.code)) {
        templateCodes.add(template.code);
        templates.push(template);
      }
    });
  }

  templates
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach((template, index) => {
      template.sortOrder = index;
    });

  const cases: ChartCase[] = [];
  const caseIds = new Set<string>();

  if (Array.isArray(raw.cases)) {
    raw.cases.forEach((item) => {
      const chartCase = normalizeCase(item);

      if (chartCase && !caseIds.has(chartCase.id)) {
        caseIds.add(chartCase.id);
        cases.push(chartCase);
      }
    });
  }

  return { version: 1, templates, cases };
}

export function generateChartTemplateCode(
  templates: Array<Pick<ChartTemplate, "code">>,
): string {
  const existing = new Set(templates.map((template) => template.code));
  let code = "";

  do {
    code = `chart_${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.has(code));

  return code;
}

export function generateCaseId(
  cases: Array<Pick<ChartCase, "id">>,
): string {
  const existing = new Set(cases.map((chartCase) => chartCase.id));
  let id = "";

  do {
    id = `case_${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.has(id));

  return id;
}

export function generateBlockId(): string {
  return `block_${Math.random().toString(36).slice(2, 8)}`;
}

export function sortChartTemplates(
  templates: ChartTemplate[],
): ChartTemplate[] {
  return [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function countChartTemplateUsage(
  data: ChartsData,
  code: string,
): number {
  return data.cases.filter((chartCase) =>
    chartCase.rows.some((row) =>
      row.slots.some(
        (slot) =>
          slot?.kind === "chart" && slot.chartTemplateCode === code,
      ),
    ),
  ).length;
}

export function removeChartTemplateFromData(
  data: ChartsData,
  code: string,
): ChartsData {
  return {
    ...data,
    templates: data.templates.filter(
      (template) => template.code !== code,
    ),
    cases: data.cases.map((chartCase) => ({
      ...chartCase,
      rows: chartCase.rows.map((row) => ({
        slots: row.slots.map((slot) =>
          slot?.kind === "chart" && slot.chartTemplateCode === code
            ? null
            : slot,
        ),
      })),
    })),
  };
}

export function validateChartTemplateDraft(
  data: ChartsData,
): Map<string, string[]> {
  const errors = new Map<string, string[]>();

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
    }

    if (!template.eventCode) {
      messages.push("必须绑定一个事项");
    }

    if (template.kind === "numeric") {
      if (template.metrics.length === 0) {
        messages.push("至少选择一个指标");
      }

      if (
        template.metrics.includes("changeRate") &&
        template.metrics.length > 1
      ) {
        messages.push("变化率不能和其他指标混在同一张图");
      }
    }

    if (messages.length > 0) {
      errors.set(template.code, messages);
    }
  }

  return errors;
}