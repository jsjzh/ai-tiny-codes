import dayjs from "dayjs";
import { isValidDateString } from "@ai-tiny-codes/utils";
import { PlanFile } from "../plan/types";
import { ValidationResult } from "./types";

const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;
const JUMP_THRESHOLD = 2; // 单日跳变阈值（kg）

export function validatePlanFile(plan: PlanFile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!plan || typeof plan !== "object") {
    return { errors: ["计划文件内容为空或不是对象"], warnings: [] };
  }
  if (plan.version !== 1) errors.push(`version 应为 1，实际为 ${String(plan.version)}`);
  if (!plan.input || typeof plan.input !== "object") errors.push("缺少 input 字段");
  if (!Array.isArray(plan.checkpoints) || plan.checkpoints.length === 0)
    errors.push("checkpoints 缺失或为空");

  const startDate = plan.input?.startDate;
  const targetDate = plan.report?.estimatedGoalDate;

  (plan.checkpoints ?? []).forEach((c, i) => {
    const at = `checkpoints[${i}]（${c.kind} #${c.index} ${c.date}）`;
    if (!isValidDateString(String(c.date))) errors.push(`${at} 的 date 不是合法日期`);
    if (typeof c.planWeightKg !== "number" || !Number.isFinite(c.planWeightKg))
      errors.push(`${at} 的 planWeightKg 不是数字`);
  });

  // dailyWeights 校验
  const dw = plan.dailyWeights;
  if (dw !== undefined && (typeof dw !== "object" || dw === null || Array.isArray(dw))) {
    errors.push("dailyWeights 应为对象：{ \"YYYY-MM-DD\": 体重 或 null }");
  }

  const entries: { date: string; weightKg: number }[] = [];
  if (dw && typeof dw === "object" && !Array.isArray(dw)) {
    for (const [date, value] of Object.entries(dw)) {
      if (!isValidDateString(date)) {
        errors.push(`dailyWeights 的日期非法：${date}`);
        continue;
      }
      if (value === null || value === undefined) continue; // 待填
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`dailyWeights["${date}"] 不是数字（待填请用 null）：${String(value)}`);
        continue;
      }
      if (value < WEIGHT_MIN || value > WEIGHT_MAX) {
        errors.push(`dailyWeights["${date}"]=${value} 超出合理范围 ${WEIGHT_MIN}~${WEIGHT_MAX}kg`);
        continue;
      }
      if (startDate && dayjs(date).isBefore(dayjs(startDate))) {
        warnings.push(`dailyWeights["${date}"] 早于计划开始日期 ${startDate}`);
      }
      // 晚于目标日视为超期，不告警
      entries.push({ date, weightKg: value });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < entries.length; i++) {
    const jump = Math.abs(entries[i].weightKg - entries[i - 1].weightKg);
    if (jump > JUMP_THRESHOLD) {
      warnings.push(
        `dailyWeights ${entries[i - 1].date} → ${entries[i].date} 单日跳变 ${jump.toFixed(1)}kg，确认是否录入有误`
      );
    }
  }

  return { errors, warnings };
}
