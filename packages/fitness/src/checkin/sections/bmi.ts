import { TrackContext, TrackSection } from "../types";

const HEALTH_MIN = 18.5;
const HEALTH_MAX = 24.9;

function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function zone(b: number): string {
  if (b < HEALTH_MIN) return "偏瘦";
  if (b > HEALTH_MAX) return b > 28 ? "肥胖" : "超重";
  return "正常";
}

export function bmiSection(ctx: TrackContext): TrackSection | null {
  if (ctx.filled.length === 0) return null;

  const heightCm = ctx.plan.input.heightCm;
  const latest = ctx.filled[ctx.filled.length - 1];
  const current = bmi(latest.actualWeightKg, heightCm);
  const target = bmi(ctx.targetWeightKg, heightCm);

  const lines = [
    `当前 BMI：${current.toFixed(1)}（${zone(current)}）`,
    `目标 BMI：${target.toFixed(1)}（${zone(target)}）`,
    `健康区间：${HEALTH_MIN} ~ ${HEALTH_MAX}`,
  ];
  if (target < HEALTH_MIN) lines.push("⚠ 目标 BMI 低于健康区间下限，注意不要过度减重");

  return { key: "bmi", title: "BMI", lines };
}
