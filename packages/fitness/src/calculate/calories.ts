import { CalculateInput } from "./types";

export function calcBaseMetabolism(input: CalculateInput): number {
  const { gender, weightKg, heightCm } = input;
  const age = ageAtStartDate(input.birthYear, input.startDate);
  if (gender === "male") {
    return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  }
  return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
}

function ageAtStartDate(birthYear: number, startDate: string): number {
  const startYear = Number(startDate.slice(0, 4));
  return startYear - birthYear;
}

export function calcExerciseBurn(input: CalculateInput): number {
  return input.trainingIntensity * input.trainingMinutes;
}

export function calcInitialCalories(bmr: number, exerciseBurn: number): number {
  return bmr + exerciseBurn;
}
