import { getKeepStrongTrainingRecords } from "@ai-tiny-codes/keepstrong";
import {
  countRemovedTrainingRecords,
  loadTrainingFile,
  mergeTrainingRecords,
  saveTrainingFile,
} from "../dataset/trainings";
import { SyncedTrainingRecord, toCompact } from "../dataset/types";

export interface SyncTrainingsOptions {
  /** YYYY-MM-DD（含） */
  from: string;
  /** YYYY-MM-DD（含） */
  to: string;
  dryRun?: boolean;
}

export interface SyncTrainingsReport {
  kind: "training";
  from: string;
  to: string;
  fetched: number;
  total: number;
  days: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  first: string | null;
  last: string | null;
  dryRun: boolean;
}

/** 分页拉全某个区间的训练记录 */
async function fetchTrainingRecords(
  fromCompact: string,
  toCompactStr: string
): Promise<SyncedTrainingRecord[]> {
  const out: SyncedTrainingRecord[] = [];
  for (let page = 1; page <= 200; page += 1) {
    const res = await getKeepStrongTrainingRecords({
      startDate: fromCompact,
      endDate: toCompactStr,
      page,
      pageSize: 50,
    });
    out.push(...(res.list as unknown as SyncedTrainingRecord[]));
    if (!res.hasMore) break;
  }
  return out;
}

/** 拉取训练记录，按范围合并进 datas/fitness/synced/trainings.json */
export async function syncTrainings(
  options: SyncTrainingsOptions
): Promise<SyncTrainingsReport> {
  const fromCompact = toCompact(options.from);
  const toCompactStr = toCompact(options.to);

  const incoming = await fetchTrainingRecords(fromCompact, toCompactStr);
  const prev = loadTrainingFile();
  const prevById = new Map(
    (prev?.records ?? []).map((record) => [record.id, record] as const)
  );

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const record of incoming) {
    const old = prevById.get(record.id);
    if (!old) added += 1;
    else if (JSON.stringify(old) === JSON.stringify(record)) unchanged += 1;
    else updated += 1;
  }

  const merged = mergeTrainingRecords(prev, incoming, {
    from: fromCompact,
    to: toCompactStr,
  });
  if (!options.dryRun) saveTrainingFile(merged);
  const removed = countRemovedTrainingRecords(prev, incoming, {
    from: fromCompact,
    to: toCompactStr,
  });
  const days = new Set(merged.records.map((record) => record.dayStr));

  return {
    kind: "training",
    from: options.from,
    to: options.to,
    fetched: incoming.length,
    total: merged.records.length,
    days: days.size,
    added,
    updated,
    unchanged,
    removed,
    first: merged.records[0]?.dayStr ?? null,
    last: merged.records[merged.records.length - 1]?.dayStr ?? null,
    dryRun: Boolean(options.dryRun),
  };
}
