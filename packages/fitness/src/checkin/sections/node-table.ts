import { PACE_CONFIG } from "../../calculate/types";
import { nodeActual } from "../analyze";
import { CheckpointKind, TrackContext, TrackSection } from "../types";

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

/** 降幅单元格：公斤 / 相对初始体重的百分比（正=减重，负=长胖） */
function dropCell(kg: number, startWeightKg: number): string {
  const pct = startWeightKg > 0 ? (kg / startWeightKg) * 100 : 0;
  return `${kg.toFixed(2)} / ${pct.toFixed(2)}%`;
}

interface NodeSectionOptions {
  kind: CheckpointKind;
  perDays: number;
  key: string;
  unitLabel: string;
}

/** 周/月节点表：含「初始」基线行；实际值由每日数据就近派生，环比用 7 日均 */
export function buildNodeSection(ctx: TrackContext, opts: NodeSectionOptions): TrackSection | null {
  const nodes = ctx.checkpoints.filter((c) => c.kind === opts.kind);
  if (nodes.length === 0) return null;

  const pacePct = PACE_CONFIG[ctx.plan.input.pace].rate * 100;
  const perLoss = ctx.dailyLossKg * opts.perDays;
  const start = ctx.startWeightKg;

  const rows: string[][] = [];

  // 初始基线行
  const init = nodeActual(ctx.daily, ctx.startDate);
  let prevMA: number = init.ma ?? start;
  rows.push([
    "初始",
    ctx.startDate,
    start.toFixed(2),
    "—",
    init.raw === null ? "—" : init.raw.toFixed(2),
    init.ma === null ? "—" : init.ma.toFixed(2),
    "—",
    init.raw === null ? "—" : signed(init.raw - start),
    init.raw === null ? "—" : (start - init.raw).toFixed(2),
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
        dropCell(planDrop, start),
        "—",
        "—",
        "—",
        "—",
        "—",
      ]);
      continue;
    }

    const delta = prevMA - a.ma; // 正=减重
    prevMA = a.ma;

    rows.push([
      String(n.index),
      n.date,
      n.planWeightKg.toFixed(2),
      dropCell(planDrop, start),
      a.raw.toFixed(2),
      a.ma.toFixed(2),
      dropCell(delta, start),
      signed(a.raw - n.planWeightKg),
      (start - a.raw).toFixed(2),
    ]);
  }

  const unit = opts.perDays === 7 ? "周" : "月";
  return {
    key: opts.key,
    title: `${opts.unitLabel}：计划 vs 实际（期望 ${pacePct.toFixed(2)}%/月 ≈ ${perLoss.toFixed(2)}kg/${unit}）`,
    head: ["序号", "日期", "计划(kg)", "计划降幅(kg/%)", "实际(kg)", "7日均(kg)", "实际降幅(环比,kg/%)", "偏差(kg)", "累计减重(kg)"],
    colAligns: ["left", "left", "right", "right", "right", "right", "right", "right", "right"],
    rows,
  };
}
