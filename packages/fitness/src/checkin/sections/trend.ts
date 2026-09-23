import { recentPoints, regressionLossPerWeek, stddev, RECENT_DAYS } from "../analyze";
import { trendValue } from "../style";
import { TrackContext, TrackSection } from "../types";

const PLATEAU_THRESHOLD = 0.1; // kg/周
const BARS = "▁▂▃▄▅▆▇█";
const SPARK_MAX = 45;

function sparkline(values: number[]): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return BARS[0].repeat(values.length);
  return values
    .map((v) => BARS[Math.round(((v - min) / (max - min)) * (BARS.length - 1))])
    .join("");
}

export function trendSection(ctx: TrackContext): TrackSection | null {
  if (ctx.daily.length < 2 || !ctx.latest) return null;

  const recent = recentPoints(ctx.daily, ctx.latest.date, RECENT_DAYS);
  const recentRate = regressionLossPerWeek(recent);
  const direction =
    recentRate > PLATEAU_THRESHOLD ? "下降中" : recentRate < -PLATEAU_THRESHOLD ? "上升中" : "平台期";

  const dayDiffs: number[] = [];
  for (let i = 1; i < ctx.daily.length; i++) dayDiffs.push(ctx.daily[i].weightKg - ctx.daily[i - 1].weightKg);
  const maDiffs: number[] = [];
  for (let i = 1; i < ctx.daily.length; i++) maDiffs.push(ctx.daily[i].ma7 - ctx.daily[i - 1].ma7);

  const lines = [
    `趋势（近 ${RECENT_DAYS} 天回归）：${trendValue(direction)}（${recentRate.toFixed(2)} kg/周）`,
    `波动性：日间 σ=${stddev(dayDiffs.slice(-RECENT_DAYS)).toFixed(2)} kg，7日均 σ=${stddev(maDiffs.slice(-RECENT_DAYS)).toFixed(2)} kg`,
  ];
  if (direction === "平台期") lines.push("⚠ 近况速率接近 0，可能进入平台期");

  const sparkSlice = ctx.daily.slice(-SPARK_MAX);
  if (sparkSlice.length >= 2) {
    lines.push(`7 日均走势：${sparkline(sparkSlice.map((p) => p.ma7))}`);
    lines.push(`（${sparkSlice[0].date} → ${sparkSlice[sparkSlice.length - 1].date}）`);
  }

  return { key: "trend", title: "趋势与平台期", lines };
}
