import { CalculateInput, CalculateReport, MacroCombo } from "./types";
import { calcBaseMetabolism, calcExerciseBurn, calcInitialCalories } from "./calories";
import { buildMacroStages, calcInitialMacros } from "./nutrients";
import { buildPlan } from "./plan";

export function calculate(input: CalculateInput): CalculateReport {
  const bmr = calcBaseMetabolism(input);
  const exerciseBurn = calcExerciseBurn(input);
  const initialCalories = calcInitialCalories(bmr, exerciseBurn);

  const initialMacros = calcInitialMacros(initialCalories, input.dietPlan);
  const macroStages: MacroCombo[] = buildMacroStages(input, initialMacros);

  const plan = buildPlan(input);

  return {
    input,
    baseMetabolism: `${Math.round(bmr)} 大卡`,
    exerciseBurn: `${Math.round(exerciseBurn)} 大卡`,
    initialCalories: `${Math.round(initialCalories)} 大卡`,
    macroStages,
    monthlyTargets: plan.monthlyTargets,
    weeklyTargets: plan.weeklyTargets,
    estimatedGoalDate: plan.goalDate.format("YYYY-MM-DD"),
  };
}
