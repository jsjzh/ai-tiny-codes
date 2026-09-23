import { average, planWeightAt, rateSeries } from "../analyze";
import { TrackContext, TrackSection } from "../types";

const FAST_RATIO = 1.5;
const SLOW_RATIO = 0.5;

export function adviceSection(ctx: TrackContext): TrackSection | null {
  if (ctx.filled.length < 2 || ctx.dailyLossKg <= 0) return null;

  const rates = rateSeries(ctx.filled).map((r) => r.rate);
  const recent = average(rates.slice(-3));
  const planRate = ctx.dailyLossKg * 7;
  const ratio = recent / planRate;

  const lines: string[] = [];
  let level: "info" | "warn" = "info";

  if (ratio > FAST_RATIO) {
    level = "warn";
    lines.push(`近况速率是计划的 ${ratio.toFixed(2)} 倍，掉秤偏快，注意肌肉流失与代谢下降`);
    lines.push("建议：碳水档位回退一档，或适当提高热量摄入");
  } else if (ratio < SLOW_RATIO) {
    level = "warn";
    lines.push(`近况速率仅为计划的 ${ratio.toFixed(2)} 倍，降速偏慢/接近停滞`);
    lines.push("建议：碳水档位前进一档，或增加有氧/日常活动量");
  } else {
    lines.push(`近况速率约为计划的 ${ratio.toFixed(2)} 倍，节奏正常，保持当前方案`);
  }

  // 偏差持续为正（实际高于计划）提醒
  const recentFilled = ctx.filled.slice(-2);
  const deviations = recentFilled.map((p) => p.actualWeightKg - planWeightAt(ctx, p.measuredDate));
  if (deviations.every((d) => d > 0.3)) {
    lines.push("⚠ 连续两次实际体重高于计划，建议复核饮食记录与执行情况");
  }

  return { key: "advice", title: "调整建议", lines, level };
}
