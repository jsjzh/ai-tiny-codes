import { CalculateInput, CalculateReport } from "../calculate/types";

export type CheckpointKind = "week" | "month";

/** 计划里的一个周/月节点，actualWeightKg 为待填值 */
export interface PlanCheckpoint {
  kind: CheckpointKind;
  index: number;
  date: string; // 计划节点日期 YYYY-MM-DD
  planWeightKg: number; // 计划应到体重
  actualWeightKg: number | null; // 待填：实际体重
  measuredDate: string | null; // 实际称重日期（缺省视为 date）
  note?: string;
}

export interface PlanFile {
  version: 1;
  createdAt: string;
  _note: string;
  input: CalculateInput;
  report: CalculateReport;
  checkpoints: PlanCheckpoint[];
}
