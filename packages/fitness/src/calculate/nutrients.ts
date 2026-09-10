import { DIET_PLAN_CONFIG, PACE_CONFIG, MacroCombo, CalculateInput } from "./types";

const KCAL_PER_CARB = 4;
const KCAL_PER_PROTEIN = 4;
const KCAL_PER_FAT = 9;

const CARB_FLOOR = 100;

export function calcInitialMacros(initialCalories: number, dietPlan: string): MacroCombo {
  const plan = DIET_PLAN_CONFIG[dietPlan as keyof typeof DIET_PLAN_CONFIG];
  return {
    carb: (initialCalories * plan.carbPct) / KCAL_PER_CARB,
    protein: (initialCalories * plan.proteinPct) / KCAL_PER_PROTEIN,
    fat: (initialCalories * plan.fatPct) / KCAL_PER_FAT,
  };
}

export function buildMacroStages(input: CalculateInput, initialMacros: MacroCombo): MacroCombo[] {
  const decrement = PACE_CONFIG[input.pace].carbDecrementG;
  const { protein, fat } = initialMacros;

  const stages: MacroCombo[] = [];
  let carb = initialMacros.carb;

  stages.push({ carb: round1(carb), protein: round1(protein), fat: round1(fat) });

  while (carb - decrement >= CARB_FLOOR) {
    carb -= decrement;
    stages.push({ carb: round1(carb), protein: round1(protein), fat: round1(fat) });
  }

  const last = stages[stages.length - 1];
  if (last.carb > CARB_FLOOR) {
    stages.push({ carb: CARB_FLOOR, protein: round1(protein), fat: round1(fat) });
  }

  return stages;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
