import { PlanCheckpoint, PlanFile } from "../plan/types";

export type CheckpointKind = "week" | "month";

/** 已填写的节点（actualWeightKg 非空） */
export interface FilledPoint {
  kind: CheckpointKind;
  index: number;
  date: string; // 计划节点日期
  planWeightKg: number;
  actualWeightKg: number;
  measuredDate: string; // 实际称重日期
  note?: string;
}

export interface TrackContext {
  planName: string;
  plan: PlanFile;
  checkpoints: PlanCheckpoint[];
  filled: FilledPoint[]; // 按 measuredDate 升序
  weekly: FilledPoint[];
  monthly: FilledPoint[];
  startWeightKg: number;
  targetWeightKg: number;
  startDate: string;
  targetDate: string;
  dailyLossKg: number; // 计划日均减重
}

export interface TrackSection {
  key: string;
  title: string;
  head?: string[];
  colAligns?: string[];
  rows?: string[][];
  lines?: string[];
  level?: "info" | "warn" | "error";
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface TrackReport {
  planName: string;
  sections: TrackSection[];
}
