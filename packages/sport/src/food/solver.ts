import { Food, FoodAmount, FoodReport, FoodRequest, Macro, MealEntry, MealLabel, MEAL_TEMPLATES } from "./types";

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

// 低能蔬菜（每 100g 碳水低于该值）当作“配菜”：按每餐配额参与统计，不与主食抢碳水份额，
// 否则会被拉去均分碳水目标解出几斤离谱克数（如彩椒 1500g）
export const VEGGIE_CARB_PER100G = 10;
export const VEGGIE_GRAMS_PER_MEAL = 100;

const isVeggie = (f: Food) => f.role === "carb" && f.per100g.carb < VEGGIE_CARB_PER100G;

type Dim = "carb" | "protein" | "fat";

interface Scaled {
  macros: Macro;
  kcal: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

function scaled(food: Food, grams: number): Scaled {
  const k = grams / 100;
  const p = food.per100g;
  return {
    macros: { carb: p.carb * k, protein: p.protein * k, fat: p.fat * k },
    kcal: p.kcal * k,
    fiber: (p.fiber ?? 0) * k,
    sugar: (p.sugar ?? 0) * k,
    sodium: (p.sodium ?? 0) * k,
  };
}

function addScaled(target: Scaled, s: Scaled): void {
  target.macros.carb += s.macros.carb;
  target.macros.protein += s.macros.protein;
  target.macros.fat += s.macros.fat;
  target.kcal += s.kcal;
  target.fiber += s.fiber;
  target.sugar += s.sugar;
  target.sodium += s.sodium;
}

function dimOf(m: Macro): Macro {
  return { carb: m.carb, protein: m.protein, fat: m.fat };
}

export function solve(request: FoodRequest, foods: Food[]): FoodReport {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const warnings: string[] = [];

  // ---- 固定项 ----
  const fixedAll = request.fixed
    .map((it) => {
      const food = byId.get(it.foodId);
      if (!food) {
        warnings.push(`固定食材 ${it.foodId} 不存在，已忽略`);
        return null;
      }
      return { food, grams: it.grams, meal: it.meal };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const fixedTotal: Scaled = {
    macros: { carb: 0, protein: 0, fat: 0 },
    kcal: 0, fiber: 0, sugar: 0, sodium: 0,
  };
  fixedAll.forEach((f) => addScaled(fixedTotal, scaled(f.food, f.grams)));

  const target: Macro = { carb: request.macros.carb, protein: request.macros.protein, fat: request.macros.fat };
  const remaining: Macro = {
    carb: r2(target.carb - fixedTotal.macros.carb),
    protein: r2(target.protein - fixedTotal.macros.protein),
    fat: r2(target.fat - fixedTotal.macros.fat),
  };
  (["carb", "protein", "fat"] as Dim[]).forEach((d) => {
    if (remaining[d] < -0.05)
      warnings.push(`「${d === "carb" ? "碳水" : d === "protein" ? "蛋白质" : "脂肪"}」已被固定食材超额 ${Math.abs(r1(remaining[d]))}g`);
  });

  // ---- 自由食材解析 ----
  const freeFoods = [...new Set(request.freeFoods)]
    .map((id) => byId.get(id))
    .filter((f): f is Food => !!f);

  const freeByRole = (role: Food["role"]) => freeFoods.filter((f) => f.role === role);
  const gramsFree = new Map<string, number>();

  const templates = MEAL_TEMPLATES[request.mealCount];
  const fixedMealLabels = new Set<MealLabel>(
    fixedAll.map((f) => f.meal).filter((m): m is MealLabel => !!m)
  );
  const freeMeals = templates.filter((t) => !fixedMealLabels.has(t.label));
  const weightSum = freeMeals.reduce((s, t) => s + t.weight, 0);

  const contributed: Macro = { carb: 0, protein: 0, fat: 0 };

  // 配菜蔬菜：按每餐配额（默认 100g×自由餐数）计入并统计，多个蔬菜平分该总量
  const carbFoods = freeByRole("carb");
  const veggieFoods = carbFoods.filter(isVeggie);
  const stapleFoods = carbFoods.filter((f) => !isVeggie(f));
  if (veggieFoods.length > 0 && freeMeals.length > 0) {
    const total = VEGGIE_GRAMS_PER_MEAL * freeMeals.length;
    const per = total / veggieFoods.length;
    veggieFoods.forEach((f) => gramsFree.set(f.id, r1(per)));
    veggieFoods.forEach((f) => {
      const s = scaled(f, gramsFree.get(f.id)!);
      contributed.carb += s.macros.carb;
      contributed.protein += s.macros.protein;
      contributed.fat += s.macros.fat;
    });
  }

  const dimLabel = (d: Dim) => (d === "carb" ? "碳水" : d === "protein" ? "蛋白质" : "脂肪");
  const order: { role: Food["role"]; dim: Dim }[] = [
    { role: "carb", dim: "carb" },
    { role: "protein", dim: "protein" },
    { role: "fat", dim: "fat" },
  ];

  const roleFoods = (role: Food["role"]) => (role === "carb" ? stapleFoods : freeByRole(role));

  for (const { role, dim } of order) {
    const needed = remaining[dim] - contributed[dim];
    if (needed <= 0.01) continue;
    const group = roleFoods(role);
    if (group.length === 0) {
      if (role === "carb" && carbFoods.length > 0) {
        warnings.push(
          `碳水还需约 ${r1(needed)}g，但缺少主食类（米/薯/燕麦）；低能蔬菜按配额吃不够碳水，建议补充主食或调高配菜量`
        );
      } else {
        warnings.push(`缺少${dimLabel(dim)}类自由食材，无法补齐 ${dimLabel(dim)} ${r1(needed)}g`);
      }
      continue;
    }
    const share = needed / group.length;
    group.forEach((f) => {
      const density = f.per100g[dim];
      if (density <= 0) return;
      const g = (share / density) * 100;
      gramsFree.set(f.id, (gramsFree.get(f.id) ?? 0) + g);
    });
    group.forEach((f) => {
      const cur = gramsFree.get(f.id)!;
      const s = scaled(f, cur);
      contributed.carb += s.macros.carb;
      contributed.protein += s.macros.protein;
      contributed.fat += s.macros.fat;
    });
  }

  const freeMealGrams = new Map<string, { name: string; grams: number }[]>();
  if (freeMeals.length === 0 && gramsFree.size > 0) {
    warnings.push("所有餐次均已被固定，未使用自由食材");
  } else if (weightSum > 0) {
    gramsFree.forEach((g, id) => {
      const food = byId.get(id)!;
      const parts = freeMeals.map((t, i) => ({
        idx: i,
        label: t.label,
        raw: g * (t.weight / weightSum),
      }));
      parts.forEach((p) => (p.raw = r1(p.raw)));
      const sum = parts.reduce((s, p) => s + p.raw, 0);
      const diff = r1(g - sum);
      if (diff !== 0) {
        const targetPart = parts.reduce((a, b) => (b.raw > a.raw ? b : a));
        targetPart.raw = r1(targetPart.raw + diff);
      }
      parts.forEach((p) => {
        if (p.raw <= 0.01) return;
        const list = freeMealGrams.get(p.label) ?? [];
        list.push({ name: food.name, grams: p.raw });
        freeMealGrams.set(p.label, list);
      });
    });
  }

  // ---- 全天汇总 ----
  const achievedScaled: Scaled = {
    macros: { carb: 0, protein: 0, fat: 0 },
    kcal: 0, fiber: 0, sugar: 0, sodium: 0,
  };
  fixedAll.forEach((f) => addScaled(achievedScaled, scaled(f.food, f.grams)));
  gramsFree.forEach((g, id) => addScaled(achievedScaled, scaled(byId.get(id)!, g)));

  const dailyList: FoodAmount[] = [];
  fixedAll.forEach((f) => {
    const existing = dailyList.find((d) => d.name === f.food.name);
    if (existing) existing.grams = r1(existing.grams + f.grams);
    else dailyList.push({ name: f.food.name, grams: r1(f.grams), role: f.food.role });
  });
  gramsFree.forEach((g, id) => {
    const food = byId.get(id)!;
    const existing = dailyList.find((d) => d.name === food.name);
    if (existing) existing.grams = r1(existing.grams + g);
    else dailyList.push({ name: food.name, grams: r1(g), role: food.role });
  });

  const meals: MealEntry[] = templates.map((t) => {
    const items: MealEntry["items"] = [];
    const agg: Scaled = {
      macros: { carb: 0, protein: 0, fat: 0 },
      kcal: 0, fiber: 0, sugar: 0, sodium: 0,
    };
    fixedAll
      .filter((f) => f.meal === t.label)
      .forEach((f) => {
        items.push({ name: f.food.name, grams: f.grams, fromFixed: true });
        addScaled(agg, scaled(f.food, f.grams));
      });
    const freeItems = freeMealGrams.get(t.label) ?? [];
    freeItems.forEach((it) => {
      const food = [...byId.values()].find((f) => f.name === it.name)!;
      items.push({ name: it.name, grams: it.grams, fromFixed: false });
      addScaled(agg, scaled(food, it.grams));
    });
    return {
      label: t.label,
      items,
      macros: { carb: r1(agg.macros.carb), protein: r1(agg.macros.protein), fat: r1(agg.macros.fat) },
      kcal: Math.round(agg.kcal),
    };
  });

  const fixedDisplay = fixedAll.map((f) => ({
    name: f.food.name,
    grams: r1(f.grams),
    meal: f.meal,
  }));

  const weekly = dailyList.map((d) => {
    const food = [...byId.values()].find((f) => f.name === d.name)!;
    return {
      name: d.name,
      dailyGrams: d.grams,
      weeklyGrams: r1(d.grams * 7),
      note: food?.note,
    };
  });

  const deviation: Macro = {
    carb: r1(achievedScaled.macros.carb - target.carb),
    protein: r1(achievedScaled.macros.protein - target.protein),
    fat: r1(achievedScaled.macros.fat - target.fat),
  };
  const dimName = (d: Dim) => (d === "carb" ? "碳水" : d === "protein" ? "蛋白质" : "脂肪");
  (["carb", "protein", "fat"] as Dim[]).forEach((d) => {
    if (Math.abs(deviation[d]) > 5) {
      const over = deviation[d] > 0;
      let hint = "";
      if (d === "fat")
        hint = over
          ? "（多来自带脂蛋白如鸡腿/鸡蛋，或油脂类；可用低脂蛋白源替代）"
          : "（可补充坚果/烹饪油等脂肪类食材）";
      if (d === "protein") hint = over ? "（可减少蛋白总量或换低蛋白份额）" : "（可增加蛋白类食材）";
      if (d === "carb") hint = over ? "（可减少主食/高碳配菜量）" : "（可增加主食类食材）";
      warnings.push(`实际${dimName(d)}比目标${over ? "高" : "低"} ${Math.abs(deviation[d])}g${hint}`);
    }
  });

  return {
    macros: dimOf(target),
    fixed: fixedDisplay,
    daily: dailyList,
    meals,
    achieved: {
      carb: r1(achievedScaled.macros.carb),
      protein: r1(achievedScaled.macros.protein),
      fat: r1(achievedScaled.macros.fat),
    },
    deviation,
    kcal: Math.round(achievedScaled.kcal),
    stats: {
      fiber: r1(achievedScaled.fiber),
      sugar: r1(achievedScaled.sugar),
      sodium: r1(achievedScaled.sodium),
    },
    warnings,
    weekly,
  };
}
