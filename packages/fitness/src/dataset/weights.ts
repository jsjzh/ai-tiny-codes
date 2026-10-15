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
 * 按范围对齐源端：窗口 `[from,to]` 内以接口返回为准（新增/更新/删除），窗口外保留本地。
 * 返回合并后的文件内容（不落盘）。
 */
export function mergeWeightLogs(
  prev: SyncedWeightFile | null,
  incoming: SyncedWeightLog[],
  range: { from: string; to: string }
): SyncedWeightFile {
  const inRange = (dayStr: string) => dayStr >= range.from && dayStr <= range.to;

  const outside = (prev?.logs ?? []).filter((l) => !inRange(l.dayStr));
  const byDay = new Map<string, SyncedWeightLog>();
  for (const log of incoming) byDay.set(log.dayStr, log);

  const logs = [...outside, ...byDay.values()].sort((a, b) => a.dayStr.localeCompare(b.dayStr));
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

/** 统计窗口内被源端删除的记录（本地有、本次未返回） */
export function countRemovedInRange(
  prev: SyncedWeightFile | null,
  incoming: SyncedWeightLog[],
  range: { from: string; to: string }
): number {
  const inRange = (dayStr: string) => dayStr >= range.from && dayStr <= range.to;
  const incomingDays = new Set(incoming.map((l) => l.dayStr));
  return (prev?.logs ?? []).filter((l) => inRange(l.dayStr) && !incomingDays.has(l.dayStr)).length;
}