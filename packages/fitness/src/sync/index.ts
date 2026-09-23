import { getKeepStrongBodyLogs } from "@ai-tiny-codes/keepstrong";
import { loadWeightFile, mergeWeightLogs, saveWeightFile } from "../dataset/weights";
import { SyncedWeightLog, toCompact } from "../dataset/types";

export interface SyncWeightsOptions {
  /** YYYY-MM-DD（含） */
  from: string;
  /** YYYY-MM-DD（含） */
  to: string;
  dryRun?: boolean;
}

export interface SyncWeightsReport {
  kind: "weight";
  from: string;
  to: string;
  fetched: number; // 本次拉到
  total: number; // 合并后总条数
  added: number;
  updated: number;
  unchanged: number;
  first: string | null; // yyyyMMdd
  last: string | null;
  dryRun: boolean;
}

/** 分页拉全某个区间的体重日志 */
async function fetchWeightLogs(fromCompact: string, toCompact: string): Promise<SyncedWeightLog[]> {
  const out: SyncedWeightLog[] = [];
  for (let page = 1; page <= 40; page += 1) {
    const res = await getKeepStrongBodyLogs({
      metric: "weight",
      startDate: fromCompact,
      endDate: toCompact,
      page,
      pageSize: 100,
    });
    out.push(...(res.list as SyncedWeightLog[]));
    if (!res.hasMore) break;
  }
  return out;
}

/** 拉取体重日志，按日期合并进 datas/fitness/synced/weights.json */
export async function syncWeights(options: SyncWeightsOptions): Promise<SyncWeightsReport> {
  const fromCompact = toCompact(options.from);
  const toCompactStr = toCompact(options.to);

  const incoming = await fetchWeightLogs(fromCompact, toCompactStr);
  const prev = loadWeightFile();
  const prevByDay = new Map((prev?.logs ?? []).map((l) => [l.dayStr, l] as const));

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  for (const log of incoming) {
    const old = prevByDay.get(log.dayStr);
    if (!old) added += 1;
    else if (old.value === log.value) unchanged += 1;
    else updated += 1;
  }

  const merged = mergeWeightLogs(prev, incoming, { from: fromCompact, to: toCompactStr });
  if (!options.dryRun) saveWeightFile(merged);

  return {
    kind: "weight",
    from: options.from,
    to: options.to,
    fetched: incoming.length,
    total: merged.logs.length,
    added,
    updated,
    unchanged,
    first: merged.logs[0]?.dayStr ?? null,
    last: merged.logs[merged.logs.length - 1]?.dayStr ?? null,
    dryRun: Boolean(options.dryRun),
  };
}