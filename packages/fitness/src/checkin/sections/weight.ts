import { planWeightAt } from "../analyze";
import { cumLossValue, deviationValue, weightChangeValue } from "../style";
import { TrackContext, TrackSection } from "../types";

function statusText(ctx: TrackContext): string {
  if (!ctx.latest) return "暂无数据";
  if (ctx.status === "reached") return "🎉 已达成目标";
  if (ctx.status === "overdue") return `⚠ 已超期 ${ctx.overdueDays} 天`;
  return "进行中";
}

/** 每日概览：最新体重 / MA7 / 偏差 / 完成率 / 覆盖率 / 状态 */
export function weightSection(ctx: TrackContext): TrackSection | null {
  if (!ctx.latest) return null;

  const latest = ctx.latest;
  const prev = ctx.daily.length >= 2 ? ctx.daily[ctx.daily.length - 2] : null;
  const planAt = planWeightAt(ctx, latest.date);
  const deviation = latest.weightKg - planAt;
  const cumLoss = ctx.startWeightKg - latest.ma7;
  const totalGoal = ctx.startWeightKg - ctx.targetWeightKg;
  const completion = totalGoal > 0 ? (cumLoss / totalGoal) * 100 : 0;
  const coverage = (ctx.loggedInPlan / ctx.planSpanDays) * 100;

  const rows: string[][] = [
    ["最新体重", `${latest.weightKg.toFixed(2)} kg（${latest.date}）`],
    ["7 日均", `${latest.ma7.toFixed(2)} kg`],
    ["计划应到", `${planAt.toFixed(2)} kg`],
    ["偏差（实际−计划）", `${deviationValue(deviation)} kg`],
  ];

  if (prev) {
    const dod = latest.weightKg - prev.weightKg;
    rows.push(["日环比", `${weightChangeValue(dod)} kg`]);
  }

  rows.push(
    ["累计减重（按 7 日均）", `${cumLossValue(cumLoss)} kg`],
    ["完成率", `${completion.toFixed(1)}%`],
    ["记录覆盖", `${ctx.loggedInPlan} / ${ctx.planSpanDays} 天（${coverage.toFixed(0)}%）`],
    ["状态", statusText(ctx)]
  );

  if (ctx.extraDays > 0) {
    rows.push(["超期后额外记录", `${ctx.extraDays} 天`]);
  }

  return {
    key: "weight",
    title: "每日概览",
    head: ["指标", "数值"],
    colAligns: ["left", "left"],
    rows,
  };
}
