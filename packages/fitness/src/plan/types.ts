import { CalculateInput, CalculateReport } from "../calculate/types";

export type CheckpointKind = "week" | "month";

/** 计划里的一个周/月节点（实际体重由同步的每日体重自动派生） */
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
  /**
   * 每日体重兜底数据（老计划可能存在）。
   * 新计划不再生成；体重数据统一由 `pnpm fitness:sync` 同步到 datas/fitness/synced/weights.json。
   */
  dailyWeights?: Record<string, number | null>;
}