import { CalculateInput, CalculateReport } from "../calculate/types";

export type CheckpointKind = "week" | "month";

/** 计划里的一个周/月节点（实际体重由 dailyWeights 自动派生） */
export interface PlanCheckpoint {
  kind: CheckpointKind;
  index: number;
  date: string; // 计划节点日期 YYYY-MM-DD
  planWeightKg: number; // 计划应到体重
  note?: string;
}

export interface PlanFile {
  version: 1;
  createdAt: string;
  _note: string;
  input: CalculateInput;
  report: CalculateReport;
  checkpoints: PlanCheckpoint[];
  /** 每日体重，"YYYY-MM-DD" -> 体重(kg)，null 表示待填 */
  dailyWeights: Record<string, number | null>;
}
