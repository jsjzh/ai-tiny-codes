import dayjs from "dayjs";
import { planWeightAt, recentPoints, regressionLossPerWeek, RECENT_DAYS } from "../analyze";
import { TrackContext, TrackSection } from "../types";

export function progressSection(ctx: TrackContext): TrackSection | null {
  if (!ctx.latest) return null;

  const latest = ctx.latest;
  const planAt = planWeightAt(ctx, latest.date);
  const lead = planAt - latest.ma7; // 正=比计划轻（领先）
  const remaining = latest.ma7 - ctx.targetWeightKg;

  const lines: string[] = [`计划应到：${planAt.toFixed(2)} kg ｜ 实际(7 日均)：${latest.ma7.toFixed(2)} kg`];

  if (ctx.status === "reached") {
    const diff = Math.round(dayjs(latest.date).diff(dayjs(ctx.targetDate), "day", true));
    const when = diff <= 0 ? `提前 ${-diff} 天` : `延后 ${diff} 天`;
    lines.push(`🎉 已达成目标（相对计划 ${when}）`);
    return { key: "progress", title: "进度与预测", lines, level: "info" };
  }

  const leadDays = ctx.dailyLossKg > 0 ? lead / ctx.dailyLossKg : 0;
  lines.push(
    `进度：${lead >= 0 ? "领先" : "落后"} ${Math.abs(lead).toFixed(2)} kg（约 ${Math.abs(leadDays).toFixed(1)} 天）`
  );
  lines.push(`距目标：还差 ${remaining.toFixed(2)} kg`);

  const rate = regressionLossPerWeek(recentPoints(ctx.daily, latest.date, RECENT_DAYS));
  if (rate > 0.01) {
    const etaWeeks = remaining / rate;
    const etaDate = dayjs(latest.date).add(etaWeeks * 7, "day");
    const diff = Math.round(etaDate.diff(dayjs(ctx.targetDate), "day", true));
    const when = diff <= 0 ? `提前 ${-diff} 天` : `延后 ${diff} 天`;
    if (ctx.status === "overdue") {
      lines.push(`⚠ 已超过计划目标日 ${ctx.overdueDays} 天（目标日 ${ctx.targetDate}）`);
    }
    lines.push(`按近况速率预计还需 ${etaWeeks.toFixed(1)} 周，预计达成 ${etaDate.format("YYYY-MM-DD")}（比计划${when}）`);
  } else {
    lines.push("按近况速率无法预估达成时间（速率 ≤ 0）");
  }

  return { key: "progress", title: "进度与预测", lines };
}
