import { PACE_CONFIG } from "../../calculate/types";
import { average, rateSeries } from "../analyze";
import { FilledPoint, TrackContext, TrackSection } from "../types";

function avgRate(points: FilledPoint[], lastN?: number): { rate: number; count: number } {
  const series = rateSeries(points).map((r) => r.rate);
  const slice = lastN ? series.slice(-lastN) : series;
  return { rate: average(slice), count: slice.length };
}

export function rateSection(ctx: TrackContext): TrackSection | null {
  if (ctx.filled.length < 2) return null;

  const combined = rateSeries(ctx.filled);
  const latestRate = combined[combined.length - 1].rate;
  const recent = average(combined.slice(-3).map((r) => r.rate));
  const overall = average(combined.map((r) => r.rate));

  const planRate = ctx.dailyLossKg * 7;
  const pacePct = PACE_CONFIG[ctx.plan.input.pace].rate * 100;
  const actualMonthlyPct =
    ctx.startWeightKg > 0 ? ((recent * (30 / 7)) / ctx.startWeightKg) * 100 : 0;

  const w = avgRate(ctx.weekly);
  const m = avgRate(ctx.monthly);

  const lines = [
    `最近一次区间速率：${latestRate.toFixed(2)} kg/周（${(latestRate / 7).toFixed(3)} kg/天）`,
    `最近 ${Math.min(3, combined.length)} 段滑动平均：${recent.toFixed(2)} kg/周`,
    `全程平均速率：${overall.toFixed(2)} kg/周`,
    `计划速率：${planRate.toFixed(2)} kg/周（对应月降幅 ${pacePct.toFixed(2)}%）`,
    `周节点平均速率：${w.rate.toFixed(2)} kg/周（${w.count} 段）`,
    `月节点平均速率：${m.rate.toFixed(2)} kg/周（${m.count} 段）`,
    `近况折算月降幅：${actualMonthlyPct.toFixed(2)}%（计划 ${pacePct.toFixed(2)}%）`,
  ];

  return { key: "rate", title: "减脂速率", lines };
}
