import { PACE_CONFIG } from "../../calculate/types";
import { nodeActual } from "../analyze";
import { cumLossValue, deviationValue, dropValue, planValue } from "../style";
import { CheckpointKind, TrackContext, TrackSection } from "../types";

interface NodeSectionOptions {
  kind: CheckpointKind;
  perDays: number;
  key: string;
  unitLabel: string;
}

const DASH = "—";

/** 周/月节点表：含「初始」基线行；实际值由每日数据就近派生，环比用 7 日均 */
export function buildNodeSection(ctx: TrackContext, opts: NodeSectionOptions): TrackSection | null {
  const nodes = ctx.checkpoints.filter((c) => c.kind === opts.kind);
  if (nodes.length === 0) return null;

  const pacePct = PACE_CONFIG[ctx.plan.input.pace].rate * 100;
  const perLoss = ctx.dailyLossKg * opts.perDays;
  const start = ctx.startWeightKg;

  const rows: string[][] = [];

  // 初始基线行（仅基准，不算偏差/累计）
  const init = nodeActual(ctx.daily, ctx.startDate);
  let prevMA: number = init.ma ?? start;
  rows.push([
    "初始",
    ctx.startDate,
    start.toFixed(2),
    init.raw === null ? DASH : init.raw.toFixed(2),
    init.ma === null ? DASH : init.ma.toFixed(2),
    DASH,
    DASH,
    DASH,
    DASH,
  ]);

  let prevPlan = start;
  for (const n of nodes) {
    const planDrop = prevPlan - n.planWeightKg;
    prevPlan = n.planWeightKg;

    const a = nodeActual(ctx.daily, n.date);
    if (a.raw === null || a.ma === null) {
      rows.push([
        String(n.index),
        n.date,
        n.planWeightKg.toFixed(2),
        DASH,
        DASH,
        planValue(planDrop, start),
        DASH,
        DASH,
        DASH,
      ]);
      continue;
    }

    const delta = prevMA - a.ma; // 正=减重
    prevMA = a.ma;

    rows.push([
      String(n.index),
      n.date,
      n.planWeightKg.toFixed(2),
      a.raw.toFixed(2),
      a.ma.toFixed(2),
      planValue(planDrop, start),
      dropValue(delta, start),
      deviationValue(a.raw - n.planWeightKg, start),
      cumLossValue(start - a.raw),
    ]);
  }

  const unit = opts.perDays === 7 ? "周" : "月";
  return {
    key: opts.key,
    title: `${opts.unitLabel}：计划 vs 实际（期望 ${pacePct.toFixed(2)}%/月 ≈ ${perLoss.toFixed(2)}kg/${unit}）`,
    head: ["序号", "日期", "计划(kg)", "实际(kg)", "7日均(kg)", "期望降幅(kg/%)", "实际降幅(环比,kg/%)", "偏差(kg/%)", "累计减重(kg)"],
    colAligns: ["left", "left", "right", "right", "right", "right", "right", "right", "right"],
    rows,
    notes: [
      "偏差 = 实际 − 计划：▲ 偏重（比计划减得少 → 建议少吃一点或加有氧）；▼ 偏轻（比计划减得多 → 可适当多吃）",
      "实际降幅：↓ 减重 / ↑ 增重；百分比均相对初始体重",
    ],
  };
}
