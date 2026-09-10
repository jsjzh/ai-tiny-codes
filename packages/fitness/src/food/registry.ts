import { BUILTIN_FOODS } from "./builtin-foods";
import { Food } from "./types";
import { loadJson, saveJson } from "../utils/store";

const STORE_NAME = "custom-foods";

export function getAllFoods(): Food[] {
  const custom = loadJson<Food[]>(STORE_NAME) ?? [];
  return [...BUILTIN_FOODS, ...custom];
}

export function saveCustomFood(food: Omit<Food, "id"> & { id?: string }): Food {
  const list = loadJson<Food[]>(STORE_NAME) ?? [];
  const id = food.id ?? `custom-${Date.now().toString(36)}`;
  const next: Food = { ...food, id };
  const idx = list.findIndex((f) => f.id === id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  saveJson(STORE_NAME, list);
  return next;
}
