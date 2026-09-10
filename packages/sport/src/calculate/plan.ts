import dayjs from "dayjs";
import { PACE_CONFIG, TargetRecord, CalculateInput } from "./types";

const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDate(d: dayjs.Dayjs): string {
  return d.format("YYYY-MM-DD");
}

export interface PlanModel {
  goalDate: dayjs.Dayjs;
  dailyLossKg: number;
  weeklyTargets: TargetRecord[];
  monthlyTargets: TargetRecord[];
}

export function buildPlan(input: CalculateInput): PlanModel {
  const { weightKg, targetWeightKg, startDate } = input;
  const rate = PACE_CONFIG[input.pace].rate;

  const totalLoss = weightKg - targetWeightKg;
  const monthlyLoss = weightKg * rate;
  const dailyLoss = monthlyLoss / DAYS_PER_MONTH;
  const daysNeeded = Math.max(1, Math.ceil(totalLoss / dailyLoss));

  const goalDate = dayjs(startDate).add(daysNeeded, "day");
  const weekCount = Math.ceil(daysNeeded / DAYS_PER_WEEK);
  const monthCount = Math.ceil(daysNeeded / DAYS_PER_MONTH);

  const weeklyTargets = buildRecords(input, goalDate, dailyLoss, weekCount, DAYS_PER_WEEK);
  const monthlyTargets = buildRecords(input, goalDate, dailyLoss, monthCount, DAYS_PER_MONTH);

  return { goalDate, dailyLossKg: dailyLoss, weeklyTargets, monthlyTargets };
}

function buildRecords(
  input: CalculateInput,
  goalDate: dayjs.Dayjs,
  dailyLoss: number,
  count: number,
  intervalDays: number
): TargetRecord[] {
  const { startDate, weightKg, targetWeightKg } = input;
  const start = dayjs(startDate);
  const records: TargetRecord[] = [];

  for (let i = 1; i <= count; i++) {
    if (i === count) {
      records.push({ index: i, date: formatDate(goalDate), weightKg: round2(targetWeightKg) });
      break;
    }
    const date = start.add(i * intervalDays, "day");
    const loss = dailyLoss * i * intervalDays;
    const weight = Math.max(targetWeightKg, weightKg - loss);
    records.push({ index: i, date: formatDate(date), weightKg: round2(weight) });
  }

  return records;
}
