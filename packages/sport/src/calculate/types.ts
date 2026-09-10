export type Gender = "male" | "female";

export type DietPlan = "532" | "442";

export type TrainingIntensity = 5 | 8 | 10;

export type Pace = "fast" | "medium" | "slow";

export interface CalculateInput {
  gender: Gender;
  weightKg: number;
  targetWeightKg: number;
  heightCm: number;
  birthYear: number;
  trainingMinutes: number;
  trainingIntensity: TrainingIntensity;
  dietPlan: DietPlan;
  pace: Pace;
  startDate: string;
}

export const PACE_CONFIG: Record<
  Pace,
  { label: string; rate: number; carbDecrementG: number }
> = {
  fast: { label: "快 5%，碳水每次降低 30g", rate: 0.05, carbDecrementG: 30 },
  medium: { label: "中 4%，碳水每次降低 22.5g", rate: 0.04, carbDecrementG: 22.5 },
  slow: { label: "慢 3%，碳水每次降低 15g", rate: 0.03, carbDecrementG: 15 },
};

export const DIET_PLAN_CONFIG: Record<
  DietPlan,
  { label: string; carbPct: number; proteinPct: number; fatPct: number }
> = {
  "532": { label: "532（碳水50% / 蛋白质30% / 脂肪20%）", carbPct: 0.5, proteinPct: 0.3, fatPct: 0.2 },
  "442": { label: "442（碳水40% / 蛋白质40% / 脂肪20%）", carbPct: 0.4, proteinPct: 0.4, fatPct: 0.2 },
};

export const INTENSITY_CONFIG: Record<TrainingIntensity, string> = {
  5: "5 - 新手或女生",
  8: "8 - 健身爱好者",
  10: "10 - 训练强度大",
};

export interface MacroCombo {
  carb: number;
  protein: number;
  fat: number;
}

export interface TargetRecord {
  index: number;
  date: string;
  weightKg: number;
}

export interface CalculateReport {
  input: CalculateInput;
  baseMetabolism: string;
  exerciseBurn: string;
  initialCalories: string;
  macroStages: MacroCombo[];
  monthlyTargets: TargetRecord[];
  weeklyTargets: TargetRecord[];
  estimatedGoalDate: string;
}
