import { createJsonStore } from "@ai-tiny-codes/utils";
import { CalculateReport } from "../calculate/types";
import { datasDir } from "../utils/project";
import { PlanCheckpoint, PlanFile } from "./types";

// 计划保存在仓库内 datas/fitness/plans/，方便随项目上传和手改
const planStore = createJsonStore("fitness/plans", { baseDir: datasDir() });

const NOTE =
  "体重数据由练练健身同步到 datas/fitness/synced/weights.json（pnpm fitness:sync）；周/月节点的实际值自动派生，无需手填。";

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

export function savePlan(report: CalculateReport): string {
  const name = planName(report);
  const file: PlanFile = {
    version: 1,
    createdAt: new Date().toISOString(),
    _note: NOTE,
    input: report.input,
    report,
    checkpoints: buildCheckpoints(report),
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
