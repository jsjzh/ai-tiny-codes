import { planWeightAt, recentPoints, regressionLossPerWeek, RECENT_DAYS } from "../analyze";
import { TrackContext, TrackSection } from "../types";

const FAST_RATIO = 1.5;
const SLOW_RATIO = 0.5;

export function adviceSection(ctx: TrackContext): TrackSection | null {
  if (ctx.daily.length < 2 || !ctx.latest || ctx.dailyLossKg <= 0) return null;

  const recent = regressionLossPerWeek(recentPoints(ctx.daily, ctx.latest.date, RECENT_DAYS));
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

  // 连续偏高于计划（按 7 日均）
  const prev = ctx.daily[ctx.daily.length - 2];
  const devLast = ctx.latest.ma7 - planWeightAt(ctx, ctx.latest.date);
  const devPrev = prev.ma7 - planWeightAt(ctx, prev.date);
  if (devLast > 0.3 && devPrev > 0.3) {
    lines.push("⚠ 连续偏高于计划，建议复核饮食记录与执行情况");
  }

  return { key: "advice", title: "调整建议", lines, level };
}
