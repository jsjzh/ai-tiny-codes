import fs from "node:fs";
import path from "node:path";

import type {
  CalendarData,
  CalendarTemplate,
  NumericField,
} from "../src/features/calendar/data/types";

type RawGroup = {
  weight?: string | number;
  reps?: string | number;
  dropSets?: Array<{ weight?: string | number; reps?: string | number }>;
};

type RawAction = {
  groups?: RawGroup[];
  capacity?: number;
  combActions?: Array<{ groups?: RawGroup[] }>;
};

type RawRecord = {
  id: string;
  dayStr: string;
  name: string;
  durationSeconds: number;
  calorie: number;
  capacity: number;
  statsDistance: number;
  actions?: RawAction[];
};

type RawTrainingFile = {
  range?: { from: string | null; to: string | null };
  records: RawRecord[];
};

type RawWeightLog = {
  dayStr: string;
  value: number;
};

type RawWeightFile = {
  logs: RawWeightLog[];
};

type DailyTraining = {
  dayStr: string;
  sessions: number;
  minutes: number;
  calories: number;
  volume: number;
  sets: number;
  reps: number;
  distance: number;
  names: string[];
};

const TRAINING_CODE = "tpl_training";
const TRAINING_CONTENT_CODE = "tpl_training_content";
const WEIGHT_CODE = "tpl_j2eudg";

const TRAINING_FIELDS: NumericField[] = [
  {
    code: "sessions",
    label: "训练次数",
    unit: "次",
    color: "#0f766e",
    kind: "input",
    showInCalendar: false,
  },
  {
    code: "minutes",
    label: "时长",
    unit: "min",
    color: "#0f766e",
    kind: "input",
    showInCalendar: true,
  },
  {
    code: "calories",
    label: "消耗",
    unit: "kcal",
    color: "#b45309",
    kind: "input",
    showInCalendar: false,
  },
  {
    code: "volume",
    label: "容量",
    unit: "kg",
    color: "#7c3aed",
    kind: "input",
    showInCalendar: false,
  },
  {
    code: "sets",
    label: "总组数",
    unit: "组",
    color: "#0891b2",
    kind: "input",
    showInCalendar: false,
  },
  {
    code: "reps",
    label: "总次数",
    unit: "次",
    color: "#c2410c",
    kind: "input",
    showInCalendar: false,
  },
  {
    code: "distance",
    label: "距离",
    unit: "km",
    color: "#2563eb",
    kind: "input",
    showInCalendar: false,
  },
];

function findProjectRoot(start = process.cwd()): string {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

function dashed(dayStr: string): string {
  return `${dayStr.slice(0, 4)}-${dayStr.slice(4, 6)}-${dayStr.slice(6, 8)}`;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function actionGroups(action: RawAction): RawGroup[] {
  return [
    ...(action.groups ?? []),
    ...((action.combActions ?? []).flatMap((child) => child.groups ?? [])),
  ];
}

function recordStats(record: RawRecord): {
  sets: number;
  reps: number;
  volume: number;
} {
  let sets = 0;
  let reps = 0;
  let calculatedVolume = 0;

  for (const action of record.actions ?? []) {
    for (const group of actionGroups(action)) {
      sets += 1;
      const groupReps = numberValue(group.reps);
      reps += groupReps;
      const weight = numberValue(group.weight);
      if (weight > 0) calculatedVolume += weight * groupReps;

      for (const dropSet of group.dropSets ?? []) {
        sets += 1;
        const dropReps = numberValue(dropSet.reps);
        reps += dropReps;
        const dropWeight = numberValue(dropSet.weight);
        if (dropWeight > 0) calculatedVolume += dropWeight * dropReps;
      }
    }
  }

  return {
    sets,
    reps,
    volume: record.capacity > 0 ? record.capacity : calculatedVolume,
  };
}

export function summarizeTrainingRecords(
  records: RawRecord[]
): DailyTraining[] {
  const byDay = new Map<string, DailyTraining>();

  for (const record of records) {
    if (!/^\d{8}$/.test(record.dayStr)) continue;

    const current =
      byDay.get(record.dayStr) ??
      {
        dayStr: record.dayStr,
        sessions: 0,
        minutes: 0,
        calories: 0,
        volume: 0,
        sets: 0,
        reps: 0,
        distance: 0,
        names: [],
      };
    const stats = recordStats(record);

    current.sessions += 1;
    current.minutes += numberValue(record.durationSeconds) / 60;
    current.calories += numberValue(record.calorie);
    current.volume += stats.volume;
    current.sets += stats.sets;
    current.reps += stats.reps;
    current.distance += numberValue(record.statsDistance);
    if (record.name && !current.names.includes(record.name)) {
      current.names.push(record.name);
    }

    byDay.set(record.dayStr, current);
  }

  return Array.from(byDay.values())
    .map((day) => ({
      ...day,
      minutes: Number(day.minutes.toFixed(1)),
      calories: Math.round(day.calories),
      volume: Math.round(day.volume),
      distance: Number(day.distance.toFixed(2)),
    }))
    .sort((a, b) => a.dayStr.localeCompare(b.dayStr));
}

function nextSortOrder(templates: CalendarTemplate[]): number {
  return Math.max(-1, ...templates.map((template) => template.sortOrder)) + 1;
}

function ensureTrainingTemplates(data: CalendarData): number {
  let created = 0;
  let training = data.templates.find(
    (template) => template.code === TRAINING_CODE
  );

  if (!training) {
    data.templates.push({
      code: TRAINING_CODE,
      title: "训练",
      kind: "number",
      unit: "min",
      color: "#0f766e",
      desc: "练练健身同步",
      sortOrder: nextSortOrder(data.templates),
      fields: TRAINING_FIELDS.map((field) => ({ ...field })),
    });
    training = data.templates[data.templates.length - 1];
    created += 1;
  } else if (training.kind === "number") {
    const fields = [...(training.fields ?? [])];
    for (const field of TRAINING_FIELDS) {
      if (!fields.some((item) => item.code === field.code)) {
        fields.push({ ...field });
      }
    }
    training.fields = fields;
  }

  if (
    !data.templates.some(
      (template) => template.code === TRAINING_CONTENT_CODE
    )
  ) {
    data.templates.push({
      code: TRAINING_CONTENT_CODE,
      title: "训练内容",
      kind: "text",
      unit: "",
      color: "#b45309",
      desc: "练练健身同步",
      sortOrder: nextSortOrder(data.templates),
    });
    created += 1;
  }

  return created;
}

function trainingValues(day: DailyTraining): Record<string, number> {
  return {
    sessions: day.sessions,
    minutes: day.minutes,
    calories: day.calories,
    volume: day.volume,
    sets: day.sets,
    reps: day.reps,
    distance: day.distance,
  };
}

function trainingContent(day: DailyTraining): string {
  return day.names.join(" / ");
}

export type PublishReport = {
  dryRun: boolean;
  templatesCreated: number;
  training: {
    records: number;
    days: number;
    added: number;
    updated: number;
    removed: number;
    first: string | null;
    last: string | null;
  };
  weight: {
    logs: number;
    added: number;
    updated: number;
    unchanged: number;
  };
};

export function publishKeepStrongData(
  data: CalendarData,
  trainingFile: RawTrainingFile,
  weightFile: RawWeightFile | null,
  options: { dryRun?: boolean } = {}
): PublishReport {
  const templatesCreated = ensureTrainingTemplates(data);
  const days = summarizeTrainingRecords(trainingFile.records);
  const byDay = new Map(days.map((day) => [day.dayStr, day] as const));
  let added = 0;
  let updated = 0;
  let removed = 0;

  const range = trainingFile.range;
  if (range?.from && range?.to) {
    for (const [date, events] of Object.entries(data.events)) {
      const dayStr = date.replace(/-/g, "");
      if (dayStr < range.from || dayStr > range.to || byDay.has(dayStr)) {
        continue;
      }

      let removedForDay = false;
      if (TRAINING_CODE in events) {
        delete events[TRAINING_CODE];
        removedForDay = true;
      }
      if (TRAINING_CONTENT_CODE in events) {
        delete events[TRAINING_CONTENT_CODE];
        removedForDay = true;
      }
      if (removedForDay) removed += 1;
      if (Object.keys(events).length === 0) delete data.events[date];
    }
  }

  for (const day of days) {
    const date = dashed(day.dayStr);
    const existing = data.events[date] ?? {};
    const nextTraining = trainingValues(day);
    const nextContent = trainingContent(day);
    const oldTraining = existing[TRAINING_CODE];
    const oldContent = existing[TRAINING_CONTENT_CODE];

    if (oldTraining === undefined) added += 1;
    else if (
      JSON.stringify(oldTraining) !== JSON.stringify(nextTraining) ||
      oldContent !== nextContent
    ) {
      updated += 1;
    }

    existing[TRAINING_CODE] = nextTraining;
    existing[TRAINING_CONTENT_CODE] = nextContent;
    data.events[date] = existing;
  }

  let weightAdded = 0;
  let weightUpdated = 0;
  let weightUnchanged = 0;
  for (const log of weightFile?.logs ?? []) {
    if (!/^\d{8}$/.test(log.dayStr) || !Number.isFinite(log.value)) continue;
    const date = dashed(log.dayStr);
    const existing = data.events[date] ?? {};
    const old = existing[WEIGHT_CODE];

    if (old === undefined) weightAdded += 1;
    else if (old !== log.value) weightUpdated += 1;
    else weightUnchanged += 1;

    existing[WEIGHT_CODE] = log.value;
    data.events[date] = existing;
  }

  if (!options.dryRun) {
    const root = findProjectRoot();
    const calendarPath = path.join(root, "datas", "calendar", "calendar.json");
    const tempPath = `${calendarPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`);
    fs.renameSync(tempPath, calendarPath);
  }

  return {
    dryRun: Boolean(options.dryRun),
    templatesCreated,
    training: {
      records: trainingFile.records.length,
      days: days.length,
      added,
      updated,
      removed,
      first: days[0]?.dayStr ?? null,
      last: days[days.length - 1]?.dayStr ?? null,
    },
    weight: {
      logs: weightFile?.logs.length ?? 0,
      added: weightAdded,
      updated: weightUpdated,
      unchanged: weightUnchanged,
    },
  };
}

function main(): void {
  const root = findProjectRoot();
  const syncedDir = path.join(root, "datas", "fitness", "synced");
  const trainingPath = path.join(syncedDir, "trainings.json");
  const weightPath = path.join(syncedDir, "weights.json");
  const calendarPath = path.join(root, "datas", "calendar", "calendar.json");

  if (!fs.existsSync(trainingPath)) {
    throw new Error(
      "缺少 datas/fitness/synced/trainings.json，请先运行 pnpm fitness:sync --only all --all"
    );
  }

  const trainingFile = JSON.parse(
    fs.readFileSync(trainingPath, "utf8")
  ) as RawTrainingFile;
  const weightFile = fs.existsSync(weightPath)
    ? (JSON.parse(fs.readFileSync(weightPath, "utf8")) as RawWeightFile)
    : null;
  const data = JSON.parse(fs.readFileSync(calendarPath, "utf8")) as CalendarData;
  const dryRun = process.argv.includes("--dry-run");
  const report = publishKeepStrongData(data, trainingFile, weightFile, {
    dryRun,
  });

  console.log("");
  console.log("==================== 发布练练数据到日历 ====================");
  console.log(
    `训练：${report.training.records} 条 / ${report.training.days} 天，` +
      `新增 ${report.training.added}，更新 ${report.training.updated}，删除 ${report.training.removed}`
  );
  console.log(
    `体重：${report.weight.logs} 条，新增 ${report.weight.added}，` +
      `更新 ${report.weight.updated}，无变化 ${report.weight.unchanged}`
  );
  console.log(`模板新建：${report.templatesCreated}`);
  console.log(`模式：${report.dryRun ? "dry-run（未写入）" : "已写入"}`);
  console.log("============================================================");
}

if (process.argv[1]?.endsWith("syncKeepStrong.ts")) {
  try {
    main();
  } catch (err) {
    console.error("");
    console.error("✗ 发布失败：", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
