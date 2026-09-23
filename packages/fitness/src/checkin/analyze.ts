import dayjs from "dayjs";
import { roundTo } from "@ai-tiny-codes/utils";
import { buildPlan } from "../calculate/plan";
import { PlanFile, PlanCheckpoint } from "../plan/types";
import { FilledPoint, TrackContext } from "./types";

export function buildContext(planName: string, plan: PlanFile): TrackContext {
  const model = buildPlan(plan.input);

  const filled: FilledPoint[] = plan.checkpoints
    .filter((c: PlanCheckpoint) => c.actualWeightKg !== null && c.actualWeightKg !== undefined)
    .map((c) => ({
      kind: c.kind,
      index: c.index,
      date: c.date,
      planWeightKg: c.planWeightKg,
      actualWeightKg: c.actualWeightKg as number,
      measuredDate: c.measuredDate ?? c.date,
      note: c.note,
    }))
    .sort((a, b) => a.measuredDate.localeCompare(b.measuredDate));

  return {
    planName,
    plan,
    checkpoints: plan.checkpoints,
    filled,
    weekly: filled.filter((p) => p.kind === "week"),
    monthly: filled.filter((p) => p.kind === "month"),
    startWeightKg: plan.input.weightKg,
    targetWeightKg: plan.input.targetWeightKg,
    startDate: plan.input.startDate,
    targetDate: plan.report.estimatedGoalDate,
    dailyLossKg: model.dailyLossKg,
  };
}

/** 两个日期之间的天数（带小数） */
export function daysBetween(later: string, earlier: string): number {
  return dayjs(later).diff(dayjs(earlier), "day", true);
}

/** 到某日期时，计划应到的体重（线性模型，夹到目标体重） */
export function planWeightAt(ctx: TrackContext, date: string): number {
  const days = daysBetween(date, ctx.startDate);
  const w = ctx.startWeightKg - ctx.dailyLossKg * days;
  return roundTo(Math.max(ctx.targetWeightKg, w), 2);
}

/** 减重速率（kg/周，正数表示在掉秤） */
export function lossRatePerWeek(fromKg: number, toKg: number, days: number): number {
  if (days <= 0) return 0;
  return ((fromKg - toKg) / days) * 7;
}

/** 已填节点的减重速率序列（kg/周），长度 = filled.length - 1 */
export function rateSeries(points: FilledPoint[]): { weeks: number; rate: number }[] {
  const out: { weeks: number; rate: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const days = daysBetween(points[i].measuredDate, points[i - 1].measuredDate);
    out.push({ weeks: days / 7, rate: lossRatePerWeek(points[i - 1].actualWeightKg, points[i].actualWeightKg, days) });
  }
  return out;
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
