import { Food } from "./types";

export const DATA_SOURCE_NOTE =
  "每 100g 常见参考近似值（可食用部分）；精确数据请按包装背标在自定义库中覆盖";

export const BUILTIN_FOODS: Food[] = [
  // ===== 主食 / 淀粉 =====
  { id: "white-rice", name: "大米（生）", role: "carb", per100g: { kcal: 345, carb: 78, protein: 7, fat: 1, fiber: 1.3 }, note: "生米，采购可按 kg 计" },
  { id: "oats", name: "燕麦片", role: "carb", per100g: { kcal: 379, carb: 66, protein: 13, fat: 7, fiber: 10 } },
  { id: "potato", name: "土豆", role: "carb", per100g: { kcal: 77, carb: 17, protein: 2, fat: 0.2, fiber: 2.2 } },
  { id: "sweet-potato", name: "红薯", role: "carb", per100g: { kcal: 86, carb: 20, protein: 1.6, fat: 0.1, fiber: 3 } },
  { id: "cabbage", name: "卷心菜", role: "carb", per100g: { kcal: 26, carb: 4.6, protein: 1.3, fat: 0.1, fiber: 1.5 }, note: "量大时其碳水也需计入" },
  { id: "carrot", name: "胡萝卜", role: "carb", per100g: { kcal: 39, carb: 8, protein: 1, fat: 0.3, fiber: 2.8 } },
  { id: "bell-pepper", name: "彩椒", role: "carb", per100g: { kcal: 27, carb: 6, protein: 1, fat: 0.3, fiber: 2.1 } },
  { id: "broccoli", name: "西蓝花", role: "carb", per100g: { kcal: 34, carb: 6.6, protein: 2.8, fat: 0.4, fiber: 2.6 } },
  { id: "shiitake", name: "香菇", role: "carb", per100g: { kcal: 34, carb: 6.8, protein: 2.2, fat: 0.5, fiber: 2.5 } },
  // ===== 蛋白类 =====
  { id: "chicken-breast", name: "鸡胸肉", role: "protein", per100g: { kcal: 120, carb: 0, protein: 22, fat: 1.5, fiber: 0 }, note: "去皮，生重" },
  { id: "chicken-leg", name: "鸡腿", role: "protein", per100g: { kcal: 181, carb: 0, protein: 16, fat: 13, fiber: 0 }, note: "带皮生重，脂肪较高" },
  { id: "beef", name: "牛肉（瘦）", role: "protein", per100g: { kcal: 140, carb: 0, protein: 20, fat: 6, fiber: 0 } },
  { id: "shrimp", name: "虾仁", role: "protein", per100g: { kcal: 99, carb: 0.5, protein: 20, fat: 1, fiber: 0 } },
  { id: "egg", name: "鸡蛋", role: "protein", per100g: { kcal: 144, carb: 0.7, protein: 13, fat: 9, fiber: 0 }, note: "约 1 个≈50g" },
  { id: "whey", name: "蛋白粉", role: "protein", per100g: { kcal: 377, carb: 8, protein: 75, fat: 5, fiber: 0 }, note: "按手中罐装背标覆盖更准" },
  // ===== 脂肪类 =====
  { id: "almond", name: "巴旦木", role: "fat", per100g: { kcal: 579, carb: 16, protein: 21, fat: 50, fiber: 12.5 } },
  { id: "corn-oil", name: "玉米油", role: "fat", per100g: { kcal: 884, carb: 0, protein: 0, fat: 100, fiber: 0 }, note: "烹饪用油" },
];

export const DATA_SOURCE_NOTE_FULL = `${DATA_SOURCE_NOTE}\n分配仅依据碳水/蛋白质/脂肪；膳食纤维等其它字段仅用于统计。`;
