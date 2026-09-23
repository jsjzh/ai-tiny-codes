import { average, rateSeries } from "../analyze";
import { FilledPoint, TrackContext, TrackSection } from "../types";

const PLATEAU_THRESHOLD = 0.1; // kg/周

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const avg = average(nums);
  return Math.sqrt(average(nums.map((n) => (n - avg) ** 2)));
}

function describe(label: string, points: FilledPoint[]): string[] {
  if (points.length < 2) return [`${label}：数据不足（至少 2 个已填节点）`];

  const rates = rateSeries(points).map((r) => r.rate);
  const recent = average(rates.slice(-3));
  const sigma = stddev(rates.slice(-5));

  let direction: string;
  if (recent > PLATEAU_THRESHOLD) direction = "下降中";
  else if (recent < -PLATEAU_THRESHOLD) direction = "上升中";
  else direction = "平台期";

  const lines = [
    `${label}：${direction}（近况均值 ${recent.toFixed(2)} kg/周，波动 σ=${sigma.toFixed(2)}）`,
  ];
  if (direction === "平台期") lines.push(`  ⚠ ${label}近况速率接近 0，可能进入平台期`);
  return lines;
}

export function trendSection(ctx: TrackContext): TrackSection | null {
  if (ctx.filled.length < 2) return null;
  const lines = [...describe("周节点", ctx.weekly), ...describe("月节点", ctx.monthly)];
  return { key: "trend", title: "趋势与平台期", lines, level: "info" };
}
