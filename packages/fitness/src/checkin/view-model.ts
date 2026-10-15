import { PACE_CONFIG } from "../calculate/types";
import { PlanFile } from "../plan/types";
import {
  average,
  buildContext,
  daysBetween,
  nodeActual,
  planWeightAt,
  recentPoints,
  regressionLossPerWeek,
  stddev,
  RECENT_DAYS,
} from "./analyze";
import { TrackContext } from "./types";
import { adviceSection } from "./sections/advice";
import { validatePlanFile } from "./validate";

export interface CheckinNodeRow {
  index: number;
  date: string;
  planWeightKg: number;
  planDrop: number;
  raw: number | null;
  ma: number | null;
  delta: number | null; // 实际降幅(环比, MA HD)
  deviation: number | null; // raw - plan
  cumLoss: number | null; // 起始 - raw
}

export interface CheckinVM {
  planName: string;
  status: string;
  overdueDays: number;
  startDate: string;
  targetDate: string;
  startKg: number;
  targetKg: number;
  heightCm: number;
  latest: { date: string; raw: number; ma7: number } | null;
  planAt: number | null;
  deviation: number | null;
  completion: number;
  remaining: number | null;
  eta: { weeks: number; date: string; diffDays: number } | null;
  rate: {
    recent: number;
    r30: number;
    r90: number;
    overall: number;
    plan: number;
    monthlyPct: number;
    planMonthlyPct: number;
  };
  rateKind: { week: { rate: number; count: number }; month: { rate: number; count: number } };
  bmi: { current: number; target: number; zone: string } | null;
  trend: { direction: string; recentRate: number; dayVol: number; maVol: number };
  advice: { level: "info" | "warn"; lines: string[] };
  validation: { errors: string[]; warnings: string[] };
  nodes: { week: CheckinNodeRow[]; month: CheckinNodeRow[] };
  milestones: { pct: number; date: string }[];
  series: { date: string; plan: number; actual: number; diff: number }[];
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function zone(b: number): string {
  if (b < 18.5) return "偏瘦";
  if (b > 24.9) return b > 28 ? "肥胖" : "超重";
  return "正常";
}

function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

function nodeRows(ctx: TrackContext, kind: "week" | "month"): CheckinNodeRow[] {
  const nodes = ctx.checkpoints.filter((c) => c.kind === kind);
  const rows: CheckinNodeRow[] = [];
  let prevPlan = ctx.startWeightKg;
  let prevMA: number | null = ctx.startWeightKg;
  for (const n of nodes) {
    const planDrop = prevPlan - n.planWeightKg;
    prevPlan = n.planWeightKg;
    const a = nodeActual(ctx.daily, n.date);
    if (a.raw === null || a.ma === null) {
      rows.push({ index: n.index, date: n.date, planWeightKg: n.planWeightKg, planDrop, raw: null, ma: null, delta: null, deviation: null, cumLoss: null });
      continue;
    }
    const delta = prevMA === null ? null : r2(prevMA - a.ma);
    prevMA = a.ma;
    rows.push({
      index: n.index,
      date: n.date,
      planWeightKg: n.planWeightKg,
      planDrop: r2(planDrop),
      raw: a.raw,
      ma: a.ma,
      delta,
      deviation: r2(a.raw - n.planWeightKg),
      cumLoss: r2(ctx.startWeightKg - a.raw),
    });
  }
  return rows;
}

function nodeRate(ctx: TrackContext, kind: "week" | "month", perDays: number): { rate: number; count: number } {
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
  return { rate: r2(average(rates)), count: rates.length };
}

/** 由计划上下文生成可序列化的打卡复盘视图模型（供网页渲染） */
export function buildCheckinViewModel(planName: string, plan: PlanFile): CheckinVM {
  const ctx = buildContext(planName, plan);
  const pacePct = PACE_CONFIG[plan.input.pace].rate * 100;
  const planRate = ctx.dailyLossKg * 7;
  const latest = ctx.latest;

  const recent = latest ? regressionLossPerWeek(recentPoints(ctx.daily, latest.date, RECENT_DAYS)) : 0;
  const r30 = latest ? regressionLossPerWeek(recentPoints(ctx.daily, latest.date, 30)) : 0;
  const r90 = latest ? regressionLossPerWeek(recentPoints(ctx.daily, latest.date, 90)) : 0;
  const overall = regressionLossPerWeek(ctx.daily);

  const planAt = latest ? planWeightAt(ctx, latest.date) : null;
  const deviation = latest && planAt !== null ? r2(latest.weightKg - planAt) : null;
  const totalGoal = ctx.startWeightKg - ctx.targetWeightKg;
  const cumLoss = latest ? r2(ctx.startWeightKg - latest.ma7) : 0;
  const completion = totalGoal > 0 ? r2((cumLoss / totalGoal) * 100) : 0;
  const remaining = latest ? r2(latest.ma7 - ctx.targetWeightKg) : null;

  let eta: CheckinVM["eta"] = null;
  if (latest && remaining !== null && recent > 0.01) {
    const weeks = remaining / recent;
    const d = new Date(latest.date);
    d.setDate(d.getDate() + Math.round(weeks * 7));
    const etaDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    eta = { weeks: r2(weeks), date: etaDate, diffDays: Math.round(daysBetween(etaDate, ctx.targetDate)) };
  }

  // 趋势/波动
  const recentPts = latest ? recentPoints(ctx.daily, latest.date, RECENT_DAYS) : [];
  const dayDiffs: number[] = [];
  for (let i = 1; i < ctx.daily.length; i++) dayDiffs.push(ctx.daily[i].weightKg - ctx.daily[i - 1].weightKg);
  const maDiffs: number[] = [];
  for (let i = 1; i < ctx.daily.length; i++) maDiffs.push(ctx.daily[i].ma7 - ctx.daily[i - 1].ma7);
  const direction = recent > 0.1 ? "下降中" : recent < -0.1 ? "上升中" : "平台期";

  // 建议（复用 section）
  const adviceSec = adviceSection(ctx);
  const advice = { level: (adviceSec?.level === "warn" ? "warn" : "info") as "info" | "warn", lines: adviceSec?.lines ?? ["数据不足，暂无法给出建议"] };

  // 里程碑：计划总减重的 25/50/75/100% 首次达成日
  const milestones: CheckinVM["milestones"] = [];
  for (const pct of [25, 50, 75, 100]) {
    const line = ctx.startWeightKg - (totalGoal * pct) / 100;
    const hit = ctx.daily.find((p) => p.ma7 <= line);
    milestones.push({ pct, date: hit ? hit.date : "" });
  }

  // 计划 vs 实际序列（从计划开始日）
  const series = ctx.daily
    .filter((p) => p.date >= ctx.startDate)
    .map((p) => ({ date: p.date, plan: planWeightAt(ctx, p.date), actual: p.ma7, diff: r2(p.ma7 - planWeightAt(ctx, p.date)) }));

  return {
    planName,
    status: ctx.status,
    overdueDays: ctx.overdueDays,
    startDate: ctx.startDate,
    targetDate: ctx.targetDate,
    startKg: ctx.startWeightKg,
    targetKg: ctx.targetWeightKg,
    heightCm: plan.input.heightCm,
    latest: latest ? { date: latest.date, raw: latest.weightKg, ma7: latest.ma7 } : null,
    planAt,
    deviation,
    completion,
    remaining,
    eta,
    rate: {
      recent: r2(recent),
      r30: r2(r30),
      r90: r2(r90),
      overall: r2(overall),
      plan: r2(planRate),
      monthlyPct: r2(ctx.startWeightKg > 0 ? ((recent * (30 / 7)) / ctx.startWeightKg) * 100 : 0),
      planMonthlyPct: r2(pacePct),
    },
    rateKind: { week: nodeRate(ctx, "week", 7), month: nodeRate(ctx, "month", 30) },
    bmi: latest ? { current: bmi(latest.ma7, plan.input.heightCm), target: bmi(ctx.targetWeightKg, plan.input.heightCm), zone: zone(bmi(latest.ma7, plan.input.heightCm)) } : null,
    trend: {
      direction,
      recentRate: r2(recent),
      dayVol: r2(stddev(dayDiffs.slice(-RECENT_DAYS))),
      maVol: r2(stddev(maDiffs.slice(-RECENT_DAYS))),
    },
    advice,
    validation: validatePlanFile(plan),
    nodes: { week: nodeRows(ctx, "week"), month: nodeRows(ctx, "month") },
    milestones,
    series,
  };
}