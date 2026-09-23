import { PACE_CONFIG } from "../../calculate/types";
import { nodeActual } from "../analyze";
import { TrackContext, TrackSection } from "../types";

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

/** 月节点：计划 vs 实际，单位按 30 天折算 */
export function monthlyNodesSection(ctx: TrackContext): TrackSection | null {
  const nodes = ctx.checkpoints.filter((c) => c.kind === "month");
  if (nodes.length === 0) return null;

  const pacePct = PACE_CONFIG[ctx.plan.input.pace].rate * 100;
  const monthLoss = ctx.dailyLossKg * 30;

  const rows: string[][] = [];
  let prevPlan = ctx.startWeightKg;
  let prevMA: number | null = ctx.startWeightKg;

  for (const n of nodes) {
    const planDrop = prevPlan - n.planWeightKg;
    prevPlan = n.planWeightKg;

    const a = nodeActual(ctx.daily, n.date);
    if (a.raw === null || a.ma === null) {
      rows.push([String(n.index), n.date, n.planWeightKg.toFixed(2), planDrop.toFixed(2), "—", "—", "—", "—", "—"]);
      continue;
    }

    const delta = prevMA === null ? null : prevMA - a.ma; // 正=减重（约一个月）
    prevMA = a.ma;
    const deviation = a.raw - n.planWeightKg;
    const cumLoss = ctx.startWeightKg - a.raw;

    rows.push([
      String(n.index),
      n.date,
      n.planWeightKg.toFixed(2),
      planDrop.toFixed(2),
      a.raw.toFixed(2),
      a.ma.toFixed(2),
      delta === null ? "—" : signed(delta),
      signed(deviation),
      cumLoss.toFixed(2),
    ]);
  }

  return {
    key: "monthlyNodes",
    title: `月节点：计划 vs 实际（期望 ${pacePct.toFixed(2)}%/月 ≈ ${monthLoss.toFixed(2)}kg/月）`,
    head: ["序号", "日期", "计划(kg)", "计划降幅(kg)", "实际(kg)", "7日均(kg)", "实际降幅(环比)", "偏差(kg)", "累计减重(kg)"],
    colAligns: ["right", "left", "right", "right", "right", "right", "right", "right", "right"],
    rows,
  };
}
