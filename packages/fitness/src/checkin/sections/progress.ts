import dayjs from "dayjs";
import { average, planWeightAt, rateSeries } from "../analyze";
import { TrackContext, TrackSection } from "../types";

export function progressSection(ctx: TrackContext): TrackSection | null {
  if (ctx.filled.length === 0) return null;

  const latest = ctx.filled[ctx.filled.length - 1];
  const actual = latest.actualWeightKg;
  const planAt = planWeightAt(ctx, latest.measuredDate);
  const lead = planAt - actual; // 正数=比计划轻（领先）
  const leadDays = ctx.dailyLossKg > 0 ? lead / ctx.dailyLossKg : 0;

  const lines = [
    `计划应到：${planAt.toFixed(2)} kg ｜ 实际：${actual.toFixed(2)} kg`,
    `进度：${lead >= 0 ? "领先" : "落后"} ${Math.abs(lead).toFixed(2)} kg（约 ${Math.abs(leadDays).toFixed(1)} 天）`,
  ];

  const remaining = actual - ctx.targetWeightKg;
  lines.push(`距目标：还差 ${remaining.toFixed(2)} kg`);

  if (ctx.filled.length >= 2) {
    const rates = rateSeries(ctx.filled).map((r) => r.rate);
    const recent = average(rates.slice(-3));
    if (recent > 0.01) {
      const etaWeeks = remaining / recent;
      const etaDate = dayjs(latest.measuredDate).add(etaWeeks * 7, "day");
      const diff = etaDate.diff(dayjs(ctx.targetDate), "day");
      lines.push(`按近况速率（${recent.toFixed(2)} kg/周）预计还需：${etaWeeks.toFixed(1)} 周`);
      lines.push(`预计达成：${etaDate.format("YYYY-MM-DD")}（计划 ${ctx.targetDate}，${diff > 0 ? "延后" : "提前"} ${Math.abs(diff)} 天）`);
    } else {
      lines.push("按近况速率无法预估达成时间（速率 ≤ 0）");
    }
  }

  return { key: "progress", title: "进度与预测", lines };
}
