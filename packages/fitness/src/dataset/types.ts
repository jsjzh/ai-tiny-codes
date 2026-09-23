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