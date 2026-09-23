import dayjs from "dayjs";
import { isValidDateString } from "@ai-tiny-codes/utils";
import { PlanFile } from "../plan/types";
import { ValidationResult } from "./types";

const WEIGHT_MIN = 30;
const WEIGHT_MAX = 300;

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

  const filledByKind: Record<"week" | "month", { date: string; idx: number }[]> = {
    week: [],
    month: [],
  };

  (plan.checkpoints ?? []).forEach((c, i) => {
    const at = `checkpoints[${i}]（${c.kind} #${c.index} ${c.date}）`;

    if (!isValidDateString(String(c.date))) errors.push(`${at} 的 date 不是合法日期`);
    if (typeof c.planWeightKg !== "number" || !Number.isFinite(c.planWeightKg))
      errors.push(`${at} 的 planWeightKg 不是数字`);

    if (c.actualWeightKg === null || c.actualWeightKg === undefined) {
      // 待填，正常
    } else if (typeof c.actualWeightKg !== "number" || !Number.isFinite(c.actualWeightKg)) {
      errors.push(`${at} 的 actualWeightKg 不是数字（待填请用 null）`);
    } else if (c.actualWeightKg < WEIGHT_MIN || c.actualWeightKg > WEIGHT_MAX) {
      errors.push(`${at} 的 actualWeightKg=${c.actualWeightKg} 超出合理范围 ${WEIGHT_MIN}~${WEIGHT_MAX}kg`);
    }

    const measured = c.measuredDate ?? (c.actualWeightKg != null ? c.date : null);
    if (measured !== null) {
      if (!isValidDateString(String(measured))) {
        errors.push(`${at} 的 measuredDate 不是合法日期`);
      } else {
        if (startDate && dayjs(measured).isBefore(dayjs(startDate)))
          warnings.push(`${at} 的 measuredDate=${measured} 早于计划开始日期 ${startDate}`);
        if (targetDate && dayjs(measured).isAfter(dayjs(targetDate)))
          warnings.push(`${at} 的 measuredDate=${measured} 晚于计划目标日期 ${targetDate}`);
        filledByKind[c.kind].push({ date: measured, idx: i });
      }
    }
  });

  for (const kind of ["week", "month"] as const) {
    const list = filledByKind[kind].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < list.length; i++) {
      if (list[i].date === list[i - 1].date)
        warnings.push(`${kind} 序列存在重复称重日期 ${list[i].date}`);
      else if (list[i].date < list[i - 1].date)
        warnings.push(`${kind} 序列的 measuredDate 非单调递增`);
    }
  }

  return { errors, warnings };
}
