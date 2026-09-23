import { PACE_CONFIG } from "../../calculate/types";
import { nodeActual } from "../analyze";
import { TrackContext, TrackSection } from "../types";

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

/** 周节点：计划 vs 实际，实际由每日数据就近派生，环比用 7 日均 */
export function weeklyNodesSection(ctx: TrackContext): TrackSection | null {
  const nodes = ctx.checkpoints.filter((c) => c.kind === "week");
  if (nodes.length === 0) return null;

  const pacePct = PACE_CONFIG[ctx.plan.input.pace].rate * 100;
  const weekLoss = ctx.dailyLossKg * 7;

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

    const delta = prevMA === null ? null : prevMA - a.ma; // 正=减重
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
    key: "weeklyNodes",
    title: `周节点：计划 vs 实际（期望 ${pacePct.toFixed(2)}%/月 ≈ ${weekLoss.toFixed(2)}kg/周）`,
    head: ["序号", "日期", "计划(kg)", "计划降幅(kg)", "实际(kg)", "7日均(kg)", "实际降幅(环比)", "偏差(kg)", "累计减重(kg)"],
    colAligns: ["right", "left", "right", "right", "right", "right", "right", "right", "right"],
    rows,
  };
}
