export type FoodRole = "carb" | "protein" | "fat";

export interface FoodNutrition {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface Food {
  id: string;
  name: string;
  role: FoodRole;
  per100g: FoodNutrition;
  note?: string;
}

export type MealLabel = "早餐" | "午餐" | "晚餐" | "加餐";

export interface FixedItem {
  foodId: string;
  grams: number;
  meal?: MealLabel;
}

export interface FoodRequest {
  macros: { carb: number; protein: number; fat: number };
  mealCount: 3 | 4;
  fixed: FixedItem[];
  freeFoods: string[];
}

export interface MealTemplate {
  label: MealLabel;
  weight: number;
}

export const MEAL_TEMPLATES: Record<3 | 4, MealTemplate[]> = {
  3: [
    { label: "早餐", weight: 0.3 },
    { label: "午餐", weight: 0.4 },
    { label: "晚餐", weight: 0.3 },
  ],
  4: [
    { label: "早餐", weight: 0.25 },
    { label: "午餐", weight: 0.35 },
    { label: "加餐", weight: 0.15 },
    { label: "晚餐", weight: 0.25 },
  ],
};

export interface Macro {
  carb: number;
  protein: number;
  fat: number;
}

export interface FoodAmount {
  name: string;
  grams: number;
  role: FoodRole;
}

export interface MealEntry {
  label: MealLabel;
  items: { name: string; grams: number; fromFixed: boolean }[];
  macros: Macro;
  kcal: number;
}

export interface WeeklyRow {
  name: string;
  dailyGrams: number;
  weeklyGrams: number;
  note?: string;
}

export interface FoodReport {
  macros: Macro;
  fixed: { name: string; grams: number; meal?: MealLabel }[];
  daily: FoodAmount[];
  meals: MealEntry[];
  achieved: Macro;
  deviation: Macro;
  kcal: number;
  stats: { fiber: number; sugar: number; sodium: number };
  warnings: string[];
  weekly: WeeklyRow[];
}
