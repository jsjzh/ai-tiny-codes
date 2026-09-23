import dayjs from "dayjs";
import { createJsonStore } from "@ai-tiny-codes/utils";
import { CalculateReport } from "../calculate/types";
import { datasDir } from "../utils/project";
import { PlanCheckpoint, PlanFile } from "./types";

// 计划保存在仓库内 datas/fitness/plans/，方便随项目上传和手改
const planStore = createJsonStore("fitness/plans", { baseDir: datasDir() });

const NOTE =
  "在 dailyWeights 里按天填体重（把 null 改成数字 kg），保存后运行 pnpm fitness:checkin 查看分析。周/月节点的实际值由每日数据自动派生，无需手填。目标日之后仍可继续加日期行。";

export function planName(report: CalculateReport): string {
  const { weightKg, targetWeightKg, startDate } = report.input;
  return `plan-${weightKg}-${targetWeightKg}-${startDate}`;
}

export function buildCheckpoints(report: CalculateReport): PlanCheckpoint[] {
  const points: PlanCheckpoint[] = [];
  for (const t of report.weeklyTargets) {
    points.push({ kind: "week", index: t.index, date: t.date, planWeightKg: t.weightKg, note: "" });
  }
  for (const t of report.monthlyTargets) {
    points.push({ kind: "month", index: t.index, date: t.date, planWeightKg: t.weightKg, note: "" });
  }
  // 按日期升序；同一天周节点在前
  points.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "week" ? -1 : 1));
  return points;
}

/** 按开始日 → 目标日逐日铺 key，值待填(null) */
export function buildDailyWeights(startDate: string, goalDate: string): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  let cursor = dayjs(startDate);
  const end = dayjs(goalDate);
  // 防御：目标日早于开始日时至少铺一天
  if (end.isBefore(cursor)) {
    out[cursor.format("YYYY-MM-DD")] = null;
    return out;
  }
  while (!cursor.isAfter(end)) {
    out[cursor.format("YYYY-MM-DD")] = null;
    cursor = cursor.add(1, "day");
  }
  return out;
}

export function countFilledDaily(plan: PlanFile | null): number {
  if (!plan || !plan.dailyWeights) return 0;
  return Object.values(plan.dailyWeights).filter((v) => typeof v === "number" && Number.isFinite(v)).length;
}

export function savePlan(report: CalculateReport): string {
  const name = planName(report);
  const file: PlanFile = {
    version: 1,
    createdAt: new Date().toISOString(),
    _note: NOTE,
    input: report.input,
    report,
    checkpoints: buildCheckpoints(report),
    dailyWeights: buildDailyWeights(report.input.startDate, report.estimatedGoalDate),
  };
  planStore.save(name, file);
  return name;
}

export function listPlans(): string[] {
  return planStore.list();
}

export function loadPlan(name: string): PlanFile | null {
  return planStore.load<PlanFile>(name);
}
