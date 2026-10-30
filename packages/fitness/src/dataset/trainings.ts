import { syncedStore } from "./store";
import {
  SyncedTrainingFile,
  SyncedTrainingRecord,
} from "./types";

const NAME = "trainings";

export function loadTrainingFile(): SyncedTrainingFile | null {
  return syncedStore.load<SyncedTrainingFile>(NAME);
}

export function saveTrainingFile(file: SyncedTrainingFile): void {
  syncedStore.save(NAME, file);
}

/**
 * 按范围对齐源端：窗口内以接口为准（新增/更新/删除），窗口外保留本地。
 * 同一 id 以本次返回为准；返回合并后的文件内容（不落盘）。
 */
export function mergeTrainingRecords(
  prev: SyncedTrainingFile | null,
  incoming: SyncedTrainingRecord[],
  range: { from: string; to: string }
): SyncedTrainingFile {
  const inRange = (dayStr: string) => dayStr >= range.from && dayStr <= range.to;

  const outside = (prev?.records ?? []).filter((record) => !inRange(record.dayStr));
  const byId = new Map<string, SyncedTrainingRecord>();
  for (const record of incoming) byId.set(record.id, record);

  const records = [...outside, ...byId.values()].sort(
    (a, b) => a.dayStr.localeCompare(b.dayStr) || a.id.localeCompare(b.id)
  );
  const days = records.map((record) => record.dayStr);
  const candidatesFrom = [
    ...(prev?.range.from ? [prev.range.from] : []),
    range.from,
    ...(days[0] ? [days[0]] : []),
  ];
  const candidatesTo = [
    ...(prev?.range.to ? [prev.range.to] : []),
    range.to,
    ...(days[days.length - 1] ? [days[days.length - 1]] : []),
  ];

  return {
    kind: "training",
    source: "keepstrong",
    syncedAt: new Date().toISOString(),
    range: {
      from: candidatesFrom.sort()[0] ?? null,
      to: candidatesTo.sort()[candidatesTo.length - 1] ?? null,
    },
    records,
  };
}

/** 统计窗口内被源端删除的训练记录（本地有、本次未返回） */
export function countRemovedTrainingRecords(
  prev: SyncedTrainingFile | null,
  incoming: SyncedTrainingRecord[],
  range: { from: string; to: string }
): number {
  const inRange = (dayStr: string) => dayStr >= range.from && dayStr <= range.to;
  const incomingIds = new Set(incoming.map((record) => record.id));
  return (prev?.records ?? []).filter(
    (record) => inRange(record.dayStr) && !incomingIds.has(record.id)
  ).length;
}
