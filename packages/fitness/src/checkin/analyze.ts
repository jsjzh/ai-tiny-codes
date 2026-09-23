import dayjs from "dayjs";
import { roundTo, isValidDateString } from "@ai-tiny-codes/utils";
import { buildPlan } from "../calculate/plan";
import { weightsByDate } from "../dataset/weights";
import { PlanFile } from "../plan/types";
import { DailyPoint, NodeActual, TrackContext, TrackStatus } from "./types";

export const MA_WINDOW = 7; // 移动平均窗口（天）
export const MA_MIN = 3; // 窗口内少于该条数则用原始值
export const RECENT_DAYS = 14; // 近况回归窗口（天）
export const NODE_TOLERANCE_DAYS = 3; // 节点就近取值的容差（天）

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = average(nums);
  return Math.sqrt(average(nums.map((n) => (n - m) ** 2)));
}

/** 两个日期之间天数（带小数，later 晚于 earlier） */
export function daysBetween(later: string, earlier: string): number {
  return dayjs(later).diff(dayjs(earlier), "day", true);
}

/**
 * 取每日体重：练练同步数据（datas/fitness/synced/weights.json）优先，
 * 计划里的 dailyWeights 作兜底（兼容旧计划）；只取 >= 计划开始日。
 */
export function resolveDailyWeights(plan: PlanFile): { date: string; weightKg: number }[] {
  const startDate = plan.input.startDate;
  const merged: Record<string, number> = {};

  for (const [date, value] of Object.entries(plan.dailyWeights ?? {})) {
    if (isNum(value) && isValidDateString(date)) merged[date] = value;
  }
  for (const [date, value] of Object.entries(weightsByDate())) {
    if (isNum(value) && isValidDateString(date)) merged[date] = value;
  }

  return Object.entries(merged)
    .filter(([date]) => date >= startDate)
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 计算每个点的 7 日移动平均（窗口内不足 MA_MIN 条则用原始值） */
export function computeMA(entries: { date: string; weightKg: number }[]): DailyPoint[] {
  return entries.map((e) => {
    const from = dayjs(e.date).subtract(MA_WINDOW - 1, "day");
    const win = entries.filter(
      (x) => !dayjs(x.date).isBefore(from, "day") && !dayjs(x.date).isAfter(dayjs(e.date), "day")
    );
    const ma = win.length >= MA_MIN ? average(win.map((w) => w.weightKg)) : e.weightKg;
    return { date: e.date, weightKg: e.weightKg, ma7: roundTo(ma, 2) };
  });
}

/** 到某日期时计划应到的体重（线性模型，夹到目标体重） */
export function planWeightAt(ctx: TrackContext, date: string): number {
  const w = ctx.startWeightKg - ctx.dailyLossKg * daysBetween(date, ctx.startDate);
  return roundTo(Math.max(ctx.targetWeightKg, w), 2);
}

/** 节点实际：距节点日期最近且 ≤NODE_TOLERANCE_DAYS 的每日数据 */
export function nodeActual(daily: DailyPoint[], date: string): NodeActual {
  if (daily.length === 0) return { raw: null, rawDate: null, ma: null };
  let best: DailyPoint | null = null;
  let bestDist = Infinity;
  for (const p of daily) {
    const dist = Math.abs(daysBetween(p.date, date));
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  if (!best || bestDist > NODE_TOLERANCE_DAYS) return { raw: null, rawDate: null, ma: null };
  return { raw: best.weightKg, rawDate: best.date, ma: best.ma7 };
}

/** 取最近 N 天的点（含端点） */
export function recentPoints(daily: DailyPoint[], latestDate: string, days: number): DailyPoint[] {
  const from = dayjs(latestDate).subtract(days - 1, "day");
  return daily.filter((p) => !dayjs(p.date).isBefore(from, "day") && !dayjs(p.date).isAfter(dayjs(latestDate), "day"));
}

/** 线性回归得到减重速率（kg/周，正数=在掉秤），y 用 MA7 抗噪 */
export function regressionLossPerWeek(points: DailyPoint[]): number {
  if (points.length < 2) return 0;
  const xs = points.map((p) => dayjs(p.date).diff(dayjs(points[0].date), "day", true));
  const ys = points.map((p) => p.ma7);
  const xm = average(xs);
  const ym = average(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < points.length; i++) {
    num += (xs[i] - xm) * (ys[i] - ym);
    den += (xs[i] - xm) ** 2;
  }
  if (den === 0) return 0;
  return -(num / den) * 7;
}

export function buildContext(planName: string, plan: PlanFile): TrackContext {
  const model = buildPlan(plan.input);
  const daily = computeMA(resolveDailyWeights(plan));
  const latest = daily.length > 0 ? daily[daily.length - 1] : null;

  const startDate = plan.input.startDate;
  const targetDate = plan.report.estimatedGoalDate;
  const planSpanDays = Math.max(1, Math.floor(daysBetween(targetDate, startDate)) + 1);
  const loggedInPlan = daily.filter((p) => p.date >= startDate && p.date <= targetDate).length;
  const extraDays = daily.filter((p) => p.date > targetDate).length;

  let status: TrackStatus = "no-data";
  if (latest) {
    if (latest.ma7 <= plan.input.targetWeightKg) status = "reached";
    else if (latest.date > targetDate) status = "overdue";
    else status = "ongoing";
  }
  const overdueDays =
    latest && latest.date > targetDate ? Math.floor(daysBetween(latest.date, targetDate)) : 0;

  return {
    planName,
    plan,
    checkpoints: plan.checkpoints,
    daily,
    startWeightKg: plan.input.weightKg,
    targetWeightKg: plan.input.targetWeightKg,
    startDate,
    targetDate,
    dailyLossKg: model.dailyLossKg,
    latest,
    status,
    overdueDays,
    loggedDays: daily.length,
    loggedInPlan,
    planSpanDays,
    extraDays,
  };
}
