import { syncedStore } from "./store";
import { SyncedWeightFile, SyncedWeightLog, toDashed } from "./types";

const NAME = "weights";

export function loadWeightFile(): SyncedWeightFile | null {
  return syncedStore.load<SyncedWeightFile>(NAME);
}

export function saveWeightFile(file: SyncedWeightFile): void {
  syncedStore.save(NAME, file);
}

/** 同步到的体重，`YYYY-MM-DD` -> kg */
export function weightsByDate(): Record<string, number> {
  const file = loadWeightFile();
  const out: Record<string, number> = {};
  for (const log of file?.logs ?? []) {
    if (typeof log.value === "number" && Number.isFinite(log.value) && log.dayStr?.length === 8) {
      out[toDashed(log.dayStr)] = log.value;
    }
  }
  return out;
}

/**
 * 按 dayStr 对比合并：同一天用新值覆盖、新日期追加、不在本次范围内的旧记录保留。
 * 返回合并后的文件内容（不落盘）。
 */
export function mergeWeightLogs(
  prev: SyncedWeightFile | null,
  incoming: SyncedWeightLog[],
  range: { from: string; to: string }
): SyncedWeightFile {
  const byDay = new Map<string, SyncedWeightLog>();
  for (const log of prev?.logs ?? []) byDay.set(log.dayStr, log);
  for (const log of incoming) byDay.set(log.dayStr, log);

  const logs = [...byDay.values()].sort((a, b) => a.dayStr.localeCompare(b.dayStr));
  const days = logs.map((l) => l.dayStr);
  const candidatesFrom = [...(prev?.range.from ? [prev.range.from] : []), range.from, ...(days[0] ? [days[0]] : [])];
  const candidatesTo = [...(prev?.range.to ? [prev.range.to] : []), range.to, ...(days[days.length - 1] ? [days[days.length - 1]] : [])];

  return {
    kind: "weight",
    source: "keepstrong",
    syncedAt: new Date().toISOString(),
    range: {
      from: candidatesFrom.sort()[0] ?? null,
      to: candidatesTo.sort()[candidatesTo.length - 1] ?? null,
    },
    logs,
  };
}