import { PlanCheckpoint, PlanFile } from "../plan/types";

export type CheckpointKind = "week" | "month";

/** 每日体重点（含 7 日移动平均） */
export interface DailyPoint {
  date: string;
  weightKg: number;
  ma7: number;
}

/** 节点派生出的实际值（由每日数据就近取得） */
export interface NodeActual {
  raw: number | null; // 就近原始体重
  rawDate: string | null;
  ma: number | null; // 该节点 7 日均
}

export type TrackStatus = "no-data" | "ongoing" | "overdue" | "reached";

export interface TrackContext {
  planName: string;
  plan: PlanFile;
  checkpoints: PlanCheckpoint[];
  daily: DailyPoint[]; // 已填数值，按日期升序
  startWeightKg: number;
  targetWeightKg: number;
  startDate: string;
  targetDate: string;
  dailyLossKg: number; // 计划日均减重
  latest: DailyPoint | null;
  status: TrackStatus;
  overdueDays: number; // 超过目标日的天数
  loggedDays: number; // 已填天数
  loggedInPlan: number; // 计划区间内已填天数
  planSpanDays: number; // 开始日~目标日天数（含），覆盖率分母
  extraDays: number; // 目标日之后额外记录的天数
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
