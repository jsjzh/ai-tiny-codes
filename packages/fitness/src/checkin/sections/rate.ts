import { PACE_CONFIG } from "../../calculate/types";
import { average, daysBetween, nodeActual, recentPoints, regressionLossPerWeek, RECENT_DAYS } from "../analyze";
import { CheckpointKind, TrackContext, TrackSection } from "../types";

function nodeRate(ctx: TrackContext, kind: CheckpointKind, perDays: number): { rate: number; count: number } {
  const nodes = ctx.checkpoints.filter((c) => c.kind === kind);
  const rates: number[] = [];
  let prevMA: number | null = null;
  let prevDate: string | null = null;
  for (const n of nodes) {
    const a = nodeActual(ctx.daily, n.date);
    if (a.ma === null) continue;
    if (prevMA !== null && prevDate !== null) {
      const days = daysBetween(n.date, prevDate);
      if (days > 0) rates.push(((prevMA - a.ma) / days) * perDays);
    }
    prevMA = a.ma;
    prevDate = n.date;
  }
  return { rate: average(rates), count: rates.length };
}

export function rateSection(ctx: TrackContext): TrackSection | null {
  if (ctx.daily.length < 2 || !ctx.latest) return null;

  const planRate = ctx.dailyLossKg * 7;
  const pacePct = PACE_CONFIG[ctx.plan.input.pace].rate * 100;

  const recent = regressionLossPerWeek(recentPoints(ctx.daily, ctx.latest.date, RECENT_DAYS));
  const overall = regressionLossPerWeek(ctx.daily);
  const actualMonthlyPct = ctx.startWeightKg > 0 ? ((recent * (30 / 7)) / ctx.startWeightKg) * 100 : 0;

  const w = nodeRate(ctx, "week", 7);
  const m = nodeRate(ctx, "month", 30);

  const lines = [
    `近况速率（近 ${RECENT_DAYS} 天回归）：${recent.toFixed(2)} kg/周（${(recent / 7).toFixed(3)} kg/天）`,
    `全程速率（回归）：${overall.toFixed(2)} kg/周`,
    `计划速率：${planRate.toFixed(2)} kg/周（对应月降幅 ${pacePct.toFixed(2)}%）`,
    `周节点平均：${w.count >= 1 ? `${w.rate.toFixed(2)} kg/周（${w.count} 段）` : "数据不足（需 ≥2 个已填周节点）"}`,
    `月节点平均：${m.count >= 1 ? `${m.rate.toFixed(2)} kg/月（${m.count} 段）` : "数据不足（需 ≥2 个已填月节点）"}`,
    `近况折算月降幅：${actualMonthlyPct.toFixed(2)}%（计划 ${pacePct.toFixed(2)}%）`,
  ];

  return { key: "rate", title: "减脂速率", lines };
}
