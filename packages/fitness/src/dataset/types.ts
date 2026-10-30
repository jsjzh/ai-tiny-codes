/** 练练 `body/logs` 返回的单条体重记录（原样保存） */
export interface SyncedWeightLog {
  id: string;
  metric: string;
  bodyType: string;
  dayStr: string; // yyyyMMdd
  dayTs: number;
  value: number;
  unit: string;
  time: number;
}

/** datas/fitness/synced/weights.json 的结构 */
export interface SyncedWeightFile {
  kind: "weight";
  source: "keepstrong";
  syncedAt: string;
  /** 已同步的数据日期跨度（yyyyMMdd） */
  range: { from: string | null; to: string | null };
  logs: SyncedWeightLog[];
}

/** yyyyMMdd -> YYYY-MM-DD */
export function toDashed(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** YYYY-MM-DD -> yyyyMMdd */
export function toCompact(date: string): string {
  return date.replace(/-/g, "");
}

/** 练练训练组（接口原始字段保留，便于后续动作级分析） */
export interface SyncedTrainingGroup {
  [key: string]: unknown;
  weight?: string | number;
  reps?: string | number;
  isDone?: boolean;
  flag?: string;
  dropSets?: Array<{ weight?: string | number; reps?: string | number }>;
}

/** 练练训练动作 */
export interface SyncedTrainingAction {
  [key: string]: unknown;
  actionId?: string;
  name?: string;
  groups?: SyncedTrainingGroup[];
  capacity?: number;
  durationSeconds?: number;
  combActions?: unknown[];
}

/** 练练 `training/records` 返回的单条训练记录 */
export interface SyncedTrainingRecord {
  [key: string]: unknown;
  id: string;
  recordType: string;
  source: string;
  status: string;
  trainingType: string;
  dayStr: string; // yyyyMMdd
  name: string;
  durationSeconds: number;
  capacity: number;
  calorie: number;
  statsCount: number;
  statsDistance: number;
  planId?: string;
  runningPlanId?: string;
  templateId?: string;
  actions: SyncedTrainingAction[];
}

/** datas/fitness/synced/trainings.json 的结构 */
export interface SyncedTrainingFile {
  kind: "training";
  source: "keepstrong";
  syncedAt: string;
  range: { from: string | null; to: string | null };
  records: SyncedTrainingRecord[];
}
