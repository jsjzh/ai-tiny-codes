import { planWeightAt, daysBetween } from "../analyze";
import { TrackContext, TrackSection } from "../types";

export function overviewSection(ctx: TrackContext): TrackSection | null {
  if (ctx.filled.length === 0) return null;

  const latest = ctx.filled[ctx.filled.length - 1];
  const prev = ctx.filled.length >= 2 ? ctx.filled[ctx.filled.length - 2] : null;

  const planAt = planWeightAt(ctx, latest.measuredDate);
  const deviation = latest.actualWeightKg - planAt;
  const cumLoss = ctx.startWeightKg - latest.actualWeightKg;
  const totalGoal = ctx.startWeightKg - ctx.targetWeightKg;
  const completion = totalGoal > 0 ? (cumLoss / totalGoal) * 100 : 0;

  const kindLabel = latest.kind === "week" ? `周节点 #${latest.index}` : `月节点 #${latest.index}`;
  const rows: string[][] = [
    ["归属节点", `${kindLabel}（计划日 ${latest.date}）`],
    ["称重日期", latest.measuredDate],
    ["实际体重", `${latest.actualWeightKg.toFixed(2)} kg`],
    ["计划应到", `${planAt.toFixed(2)} kg`],
    ["偏差（实际−计划）", `${deviation > 0 ? "+" : ""}${deviation.toFixed(2)} kg`],
    ["累计减重", `${cumLoss.toFixed(2)} kg`],
    ["完成率", `${completion.toFixed(1)}%`],
  ];

  if (prev) {
    const days = daysBetween(latest.measuredDate, prev.measuredDate);
    const delta = prev.actualWeightKg - latest.actualWeightKg;
    const pct = prev.actualWeightKg > 0 ? (delta / prev.actualWeightKg) * 100 : 0;
    rows.push(["距上次打卡", `${days.toFixed(0)} 天`]);
    rows.push(["体重环比", `${delta > 0 ? "-" : "+"}${Math.abs(delta).toFixed(2)} kg（${pct > 0 ? "-" : "+"}${Math.abs(pct).toFixed(2)}%）`]);
  }

  return {
    key: "overview",
    title: "最近一次打卡",
    head: ["指标", "数值"],
    colAligns: ["left", "left"],
    rows,
  };
}
