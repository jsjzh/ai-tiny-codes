import { getAllFoods } from "./registry";
import { solve } from "./solver";
import { FoodReport, FoodRequest } from "./types";

export function buildFoodReport(request: FoodRequest): FoodReport {
  return solve(request, getAllFoods());
}
