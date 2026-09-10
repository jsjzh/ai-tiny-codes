import { checkbox, confirm, input, number, select } from "@inquirer/prompts";
import { Food, FoodRequest, FixedItem, MealLabel, MealTemplate, MEAL_TEMPLATES } from "../types";
import { getAllFoods, saveCustomFood } from "../registry";
import { InputPort } from "../../core/types";
import { loadJson, saveJson } from "../../utils/store";

const ROLE_NAME: Record<Food["role"], string> = {
  carb: "主食/碳水",
  protein: "蛋白",
  fat: "脂肪/油脂",
};

const MEAL_CHOICES: { name: string; value: string }[] = [
  { name: "全天配菜（不分餐）", value: "" },
  ...MEAL_TEMPLATES[3].map((t) => ({ name: t.label, value: t.label })),
];

export class FoodCli implements InputPort<FoodRequest> {
  async read(argv: string[] = process.argv.slice(2)): Promise<FoodRequest> {
    const dataSource = readDataSourceArg(argv);
    if (dataSource) return parseFoodRequest(dataSource);
    return promptFoodRequest();
  }
}

function readDataSourceArg(argv: string[]): Record<string, unknown> | null {
  const idx = argv.indexOf("--input");
  if (idx === -1 || !argv[idx + 1]) return null;
  return JSON.parse(argv[idx + 1]);
}

export function parseFoodRequest(obj: Record<string, unknown>): FoodRequest {
  const macros = obj.macros as { carb?: number; protein?: number; fat?: number };
  const fixed = Array.isArray(obj.fixed) ? (obj.fixed as FixedItem[]) : [];
  const freeFoods = Array.isArray(obj.freeFoods) ? obj.freeFoods.map(String) : [];
  const mealCount = obj.mealCount === 4 ? 4 : 3;

  const request: FoodRequest = {
    macros: {
      carb: Number(macros?.carb ?? 0),
      protein: Number(macros?.protein ?? 0),
      fat: Number(macros?.fat ?? 0),
    },
    mealCount,
    fixed: fixed.map((f) => ({
      foodId: String(f.foodId),
      grams: Number(f.grams),
      meal: f.meal ? (f.meal as MealLabel) : undefined,
    })),
    freeFoods,
  };
  const error = validateFoodRequest(request);
  if (error) throw new Error(`输入不合法：${error}`);
  return request;
}

export function validateFoodRequest(req: FoodRequest): string | null {
  const { carb, protein, fat } = req.macros;
  if (!Number.isFinite(carb) || !Number.isFinite(protein) || !Number.isFinite(fat)) return "macros 需为数字";
  if (carb < 0 || protein < 0 || fat < 0) return "macros 不能为负";
  if (carb + protein + fat <= 0) return "macros 需至少有一个大于 0";
  const foods = new Set(getAllFoods().map((f) => f.id));
  const missing = [
    ...req.fixed.map((f) => f.foodId),
    ...req.freeFoods,
  ].filter((id) => !foods.has(id));
  if (missing.length) return `食材不存在：${missing.join("、")}`;
  return null;
}

interface LastFood extends FoodRequest {}

function loadLast(): FoodRequest | null {
  const last = loadJson<LastFood>("last-food");
  if (!last || typeof last.macros?.carb !== "number") return null;
  const foods = new Set(getAllFoods().map((f) => f.id));
  const filtered: FoodRequest = {
    macros: last.macros,
    mealCount: last.mealCount === 4 ? 4 : 3,
    fixed: (last.fixed ?? []).filter((f) => foods.has(f.foodId)),
    freeFoods: (last.freeFoods ?? []).filter((id) => foods.has(id)),
  };
  return parseFoodRequest(filtered as unknown as Record<string, unknown>);
}

async function promptFoodRequest(): Promise<FoodRequest> {
  let all = getAllFoods();
  const last = loadLast();

  console.log("");
  console.log("=========== 每日饮食配比 ===========");
  console.log("输入全天目标宏量 → 声明固定食物 → 选择自由食材补齐剩余");
  if (last) console.log("已载入上次配比：直接回车沿用默认值");
  console.log("=====================================");

  const askMacro = async (
    message: string,
    def?: number,
    validateExtra?: (v: number) => string | boolean
  ) =>
    number({
      message,
      step: "any",
      default: def ?? 0,
      validate: (v) => {
        if (v === null || v === undefined || v < 0) return "请输入 ≥0 的数字";
        if (validateExtra && v > 0) return validateExtra(v);
        return true;
      },
    });

  const carb = await askMacro("目标碳水 (g)（如 0 则只由其它食材自然带入）", last?.macros.carb);
  const protein = await askMacro("目标蛋白质 (g)", last?.macros.protein);
  const fat = await askMacro("目标脂肪 (g)", last?.macros.fat);

  const mealCount = await select<3 | 4>({
    message: "每日餐次",
    choices: [
      { name: "3 餐", value: 3 },
      { name: "4 餐", value: 4 },
    ],
    default: last?.mealCount ?? 3,
  });

  // ---- 固定食材 ----
  const fixed: FixedItem[] = [];
  console.log("");
  console.log("■ 固定食材：某些每天必须吃的量（如每天 500g 卷心菜、固定早餐燕麦+蛋）");
  const lastByFoodId = new Map(last?.fixed.map((f) => [f.foodId, f] as const) ?? []);
  for (;;) {
    const more = await confirm({
      message: "添加一条固定食材？",
      default: fixed.length === 0 && (last?.fixed.length ?? 0) > 0,
    });
    if (!more) break;

    const choice = await select<string>({
      message: "选择固定食材",
      choices: [
        { name: "＋ 新增自定义食材…", value: "__add__" },
        ...all.map((f) => ({
          name: `[${ROLE_NAME[f.role]}] ${f.name}`,
          value: f.id,
        })),
      ],
    });

    let foodId = choice;
    if (choice === "__add__") {
      const created = await addCustomFoodFlow();
      if (!created) continue;
      foodId = created.id;
      all = getAllFoods();
    }

    const food = all.find((f) => f.id === foodId)!;
    const lastItem = lastByFoodId.get(foodId);
    const grams = await number({
      message: `${food.name} 每天吃多少 (g)${food.note ? `（${food.note}）` : ""}`,
      step: "any",
      default: lastItem?.grams,
      validate: (v) => (v !== null && v !== undefined && v > 0 ? true : "请输入 >0 的克数"),
    });
    const mealVal = await select<string>({
      message: `${food.name} 归属`,
      choices: MEAL_CHOICES,
      default: lastItem?.meal ?? "",
    });
    fixed.push({ foodId, grams: Number(grams), meal: (mealVal || undefined) as MealLabel | undefined });
  }

  // ---- 自由食材 ----
  // 不排除已固定的食材：固定（如早餐 2 蛋）+ 其它餐再加蛋（自由补足）是用户预期场景
  const freeChoices = (checked: Set<string>) =>
    all.map((f) => ({
      name: `[${ROLE_NAME[f.role]}] ${f.name}${f.note ? `（${f.note}）` : ""}`,
      value: f.id,
      checked: checked.has(f.id),
    }));
  const lastFreeSet = new Set(
    (last?.freeFoods ?? []).filter((id) => all.some((f) => f.id === id))
  );

  let freeFoods: string[] = [];
  console.log("");
  console.log("■ 自由食材：勾选补齐剩余目标的食材（已固定的也可再勾补量）");
  console.log("  低能蔬菜（每 100g 碳水<10g）按每餐约 100g 计入，不挤占主食碳水；想多吃请加为固定");
  for (;;) {
    const picked = await checkbox<string>({
      message: "选择自由食材（空格勾选，回车确认）",
      choices: [...freeChoices(lastFreeSet), { name: "＋ 新增自定义食材…", value: "__add__" }],
    });
    if (picked.includes("__add__")) {
      lastFreeSet.clear();
      picked.filter((id) => id !== "__add__").forEach((id) => lastFreeSet.add(id));
      await addCustomFoodFlow();
      all = getAllFoods();
      continue;
    }
    freeFoods = picked;
    break;
  }

  if (fixed.length === 0 && freeFoods.length === 0) {
    throw new Error("未提供任何食材（固定或自由），无法生成配比");
  }

  const request: FoodRequest = {
    macros: { carb: Number(carb), protein: Number(protein), fat: Number(fat) },
    mealCount,
    fixed,
    freeFoods,
  };
  saveJson("last-food", request);
  console.log("");
  console.log("✓ 配比需求已录入，计算中...");
  return request;
}

function getFood(id: string): Food {
  return getAllFoods().find((f) => f.id === id)!;
}

async function addCustomFoodFlow(): Promise<Food | null> {
  console.log("");
  console.log("--- 新增自定义食材（每 100g 营养）---");
  const role = await select<Food["role"]>({
    message: "主要角色",
    choices: [
      { name: "主食/碳水", value: "carb" },
      { name: "蛋白", value: "protein" },
      { name: "脂肪/油脂", value: "fat" },
    ],
  });
  const name = await input({
    message: "食材名称",
    validate: (r) => (r.trim() ? true : "请输入名称"),
  });
  const askP = (message: string, allowZero = true) =>
    number({
      message,
      step: "any",
      default: 0,
      validate: (v) => (v !== null && v !== undefined && v >= 0 ? true : "请输入 ≥0 的数字"),
    });
  const kcal = await askP("热量 (大卡/100g)");
  const carb = await askP("碳水 (g/100g)");
  const protein = await askP("蛋白质 (g/100g)");
  const fat = await askP("脂肪 (g/100g)");
  const fiber = await askP("膳食纤维 (g/100g，可选)");

  const created = saveCustomFood({
    id: `custom-${Date.now().toString(36)}`,
    name: name.trim(),
    role,
    per100g: {
      kcal: Number(kcal),
      carb: Number(carb),
      protein: Number(protein),
      fat: Number(fat),
      fiber: Number(fiber),
    },
    note: "自定义",
  });
  console.log(`✓ 已保存自定义食材：${created.name}（存在 ~/.sports-diet/custom-foods.json）`);
  return created;
}
