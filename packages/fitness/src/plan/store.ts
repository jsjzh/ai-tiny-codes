import { createJsonStore } from "@ai-tiny-codes/utils";
import { CalculateReport } from "../calculate/types";
import { datasDir } from "../utils/project";
import { PlanCheckpoint, PlanFile } from "./types";

// 计划保存在仓库内 datas/fitness/plans/，方便随项目上传和手改
const planStore = createJsonStore("fitness/plans", { baseDir: datasDir() });

const NOTE =
  "给每个 checkpoint 填 actualWeightKg(kg) 与 measuredDate(YYYY-MM-DD，不填则视为节点日期)，保存后运行 pnpm fitness:checkin 查看分析。周、月节点各自独立填写。";

export function planName(report: CalculateReport): string {
  const { weightKg, targetWeightKg, startDate } = report.input;
  return `plan-${weightKg}-${targetWeightKg}-${startDate}`;
}

export function buildCheckpoints(report: CalculateReport): PlanCheckpoint[] {
  const points: PlanCheckpoint[] = [];
  for (const t of report.weeklyTargets) {
    points.push({
      kind: "week",
      index: t.index,
      date: t.date,
      planWeightKg: t.weightKg,
      actualWeightKg: null,
      measuredDate: null,
      note: "",
    });
  }
  for (const t of report.monthlyTargets) {
    points.push({
      kind: "month",
      index: t.index,
      date: t.date,
      planWeightKg: t.weightKg,
      actualWeightKg: null,
      measuredDate: null,
      note: "",
    });
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
