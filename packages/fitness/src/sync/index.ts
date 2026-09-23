import { getKeepStrongBodyLogs } from "@ai-tiny-codes/keepstrong";
import { loadPlan, writePlan } from "../plan/store";

export interface SyncReport {
  planName: string;
  startDate: string;
  endDate: string;
  fetched: number;
  added: number; // 计划里原本没有的日期
  filled: number; // 原本是 null、被填上的
  updated: number; // 原本有值、与原值不同
  unchanged: number; // 原本有值、且一致
  firstFilled: string | null;
  lastFilled: string | null;
  dryRun: boolean;
}

/** 紧凑 yyyyMMdd（练练 API 口径） */
function compact(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** yyyyMMdd -> YYYY-MM-DD（计划 dailyWeights 的 key 口径） */
function toDashed(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

async function fetchWeights(
  startDate: string,
  endDate: string
): Promise<{ date: string; value: number }[]> {
  const out: { date: string; value: number }[] = [];
  for (let page = 1; page <= 40; page += 1) {
    const res = await getKeepStrongBodyLogs({
      metric: "weight",
      startDate,
      endDate,
      page,
      pageSize: 100,
    });
    for (const item of res.list) out.push({ date: toDashed(item.dayStr), value: item.value });
    if (!res.hasMore) break;
  }
  return out;
}

function sortByDate(weights: Record<string, number | null>): Record<string, number | null> {
  const sorted: Record<string, number | null> = {};
  for (const key of Object.keys(weights).sort()) sorted[key] = weights[key];
  return sorted;
}

/** 从练练拉取体重日志，合并进计划的 dailyWeights（只填/更新，不删除已有日期） */
export async function syncPlanWeights(
  planName: string,
  options: { dryRun?: boolean } = {}
): Promise<SyncReport> {
  const plan = loadPlan(planName);
  if (!plan) throw new Error(`读取计划失败：${planName}`);

  // 计划里是 YYYY-MM-DD，练练 API 用 yyyyMMdd
  const apiStart = plan.input.startDate.replace(/-/g, "");
  const apiEnd = compact(new Date());
  const logs = await fetchWeights(apiStart, apiEnd);

  let added = 0;
  let filled = 0;
  let updated = 0;
  let unchanged = 0;

  for (const { date, value } of logs) {
    const current = plan.dailyWeights[date];
    if (current === undefined) {
      plan.dailyWeights[date] = value;
      added += 1;
    } else if (current === null) {
      plan.dailyWeights[date] = value;
      filled += 1;
    } else if (current !== value) {
      plan.dailyWeights[date] = value;
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  plan.dailyWeights = sortByDate(plan.dailyWeights);

  if (!options.dryRun) writePlan(planName, plan);

  const dates = logs.map((l) => l.date).sort();

  return {
    planName,
    startDate: plan.input.startDate,
    endDate: toDashed(apiEnd),
    fetched: logs.length,
    added,
    filled,
    updated,
    unchanged,
    firstFilled: dates[0] ?? null,
    lastFilled: dates[dates.length - 1] ?? null,
    dryRun: Boolean(options.dryRun),
  };
}