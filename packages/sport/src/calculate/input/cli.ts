import { input, select, number } from "@inquirer/prompts";
import {
  CalculateInput,
  DietPlan,
  Gender,
  Pace,
  TrainingIntensity,
  PACE_CONFIG,
  DIET_PLAN_CONFIG,
  INTENSITY_CONFIG,
} from "../types";
import { InputPort } from "../../core/types";
import { loadJson, saveJson, removeJson } from "../../utils/store";

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const currentYear = () => new Date().getFullYear();

const GENDER_CHOICES: { name: string; value: Gender }[] = [
  { name: "男", value: "male" },
  { name: "女", value: "female" },
];

const INTENSITY_CHOICES: { name: string; value: TrainingIntensity; description?: string }[] = [
  5, 8, 10,
].map((i) => ({
  value: i as TrainingIntensity,
  name: `强度 ${i}`,
  description: INTENSITY_CONFIG[i as TrainingIntensity],
}));

const DIET_CHOICES: { name: string; value: DietPlan; description?: string }[] = (
  ["532", "442"] as DietPlan[]
).map((p) => ({
  value: p,
  name: p,
  description: DIET_PLAN_CONFIG[p].label,
}));

const PACE_CHOICES: { name: string; value: Pace; description?: string }[] = (
  ["fast", "medium", "slow"] as Pace[]
).map((p) => ({
  value: p,
  name: p,
  description: PACE_CONFIG[p].label,
}));

export class CalculateCli implements InputPort<CalculateInput> {
  async read(argv: string[] = process.argv.slice(2)): Promise<CalculateInput> {
    const dataSource = readDataSourceArg(argv);
    if (dataSource) return parseCalculateInput(dataSource);
    return promptForInput();
  }
}

function readDataSourceArg(argv: string[]): Record<string, unknown> | null {
  const idx = argv.indexOf("--input");
  if (idx === -1 || !argv[idx + 1]) return null;
  return JSON.parse(argv[idx + 1]);
}

export function parseCalculateInput(obj: Record<string, unknown>): CalculateInput {
  const data: CalculateInput = {
    gender: String(obj.gender).toLowerCase() as Gender,
    weightKg: Number(obj.weightKg),
    targetWeightKg: Number(obj.targetWeightKg),
    heightCm: Number(obj.heightCm),
    birthYear: Number(obj.birthYear),
    trainingMinutes: Number(obj.trainingMinutes),
    trainingIntensity: Number(obj.trainingIntensity) as TrainingIntensity,
    dietPlan: String(obj.dietPlan) as DietPlan,
    pace: String(obj.pace).toLowerCase() as Pace,
    startDate: obj.startDate ? String(obj.startDate) : today(),
  };
  const error = validateCalculateInput(data);
  if (error) throw new Error(`输入不合法：${error}`);
  return data;
}

export function validateCalculateInput(input: CalculateInput): string | null {
  if (!(input.gender === "male" || input.gender === "female")) return "gender 需为 male/female";
  if (!["532", "442"].includes(input.dietPlan)) return "dietPlan 需为 532/442";
  if (![5, 8, 10].includes(input.trainingIntensity)) return "trainingIntensity 需为 5/8/10";
  if (!["fast", "medium", "slow"].includes(input.pace)) return "pace 需为 fast/medium/slow";
  if (input.targetWeightKg >= input.weightKg) return "目标体重必须低于当前体重";
  if (!Number.isInteger(input.birthYear)) return "birthYear 需为整数年份";
  if (input.birthYear < currentYear() - 90 || input.birthYear > currentYear() - 10)
    return `birthYear 需在 ${currentYear() - 90}~${currentYear() - 10} 之间`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return "startDate 需为 YYYY-MM-DD";
  return null;
}

function loadLast(): CalculateInput | null {
  // 优先读新 key，兼容重构前用过的旧 key last-input
  const last = loadJson<Record<string, unknown>>("last-calculate") ?? loadJson("last-input");
  if (!last || typeof last.weightKg !== "number") return null;
  try {
    return parseCalculateInput(last);
  } catch {
    return null;
  }
}

async function promptForInput(): Promise<CalculateInput> {
  const last = loadLast();

  console.log("");
  console.log("=========== 减脂周期计算器 ===========");
  console.log("回车/方向键选择，Ctrl+C 随时退出");
  if (last) console.log("已载入上次记录：直接回车沿用默认值，想改哪项输哪项");
  console.log("======================================");

  const gender = await select<Gender>({
    message: "性别",
    choices: GENDER_CHOICES,
    default: last?.gender ?? "male",
  });

  const weightKg = await number({
    message: "当前体重 (kg)",
    step: "any",
    default: last?.weightKg,
    validate: (v) =>
      v !== null && v !== undefined && v > 30 && v < 300
        ? true
        : "请输入 30~300 之间的体重（kg）",
  });

  const targetWeightKg = await number({
    message: "目标体重 (kg，必须低于当前体重)",
    step: "any",
    default: last?.targetWeightKg,
    validate: (v) =>
      v !== null && v !== undefined && v > 30 && v < 300
        ? true
        : "请输入 30~300 之间的体重（kg）",
  });

  const heightCm = await number({
    message: "身高 (cm)",
    step: "any",
    default: last?.heightCm,
    validate: (v) =>
      v !== null && v !== undefined && v >= 100 && v <= 250
        ? true
        : "请输入 100~250 之间的身高（cm）",
  });

  const birthYear = await number({
    message: "出生年份",
    step: "any",
    default: last?.birthYear,
    validate: (v) => {
      if (v === null || v === undefined || !Number.isInteger(v)) return "请输入整数出生年份";
      if (v < currentYear() - 90 || v > currentYear() - 10)
        return `请输入 ${currentYear() - 90}~${currentYear() - 10} 之间的出生年份`;
      return true;
    },
  });

  const trainingMinutes = await number({
    message: "平均每次训练时长 (min)",
    step: "any",
    default: last?.trainingMinutes,
    validate: (v) =>
      v !== null && v !== undefined && v >= 1 && v <= 300
        ? true
        : "请输入 1~300 之间的训练时长（min）",
  });

  const trainingIntensity = await select<TrainingIntensity>({
    message: "训练强度（训练消耗 = 强度 × 时长）",
    choices: INTENSITY_CHOICES,
    default: last?.trainingIntensity,
  });

  const dietPlan = await select<DietPlan>({
    message: "饮食计划",
    choices: DIET_CHOICES,
    default: last?.dietPlan ?? "532",
  });

  const pace = await select<Pace>({
    message: "期望减脂速度",
    choices: PACE_CHOICES,
    default: last?.pace ?? "medium",
  });

  const startDateRaw = await input({
    message: "开始日期 (YYYY-MM-DD)",
    default: last?.startDate || today(),
    validate: (r) =>
      /^\d{4}-\d{2}-\d{2}$/.test(r.trim()) ? true : "请输入 YYYY-MM-DD 格式日期",
  });

  const data: CalculateInput = {
    gender,
    weightKg: Number(weightKg),
    targetWeightKg: Number(targetWeightKg),
    heightCm: Number(heightCm),
    birthYear: Number(birthYear),
    trainingMinutes: Number(trainingMinutes),
    trainingIntensity,
    dietPlan,
    pace,
    startDate: startDateRaw.trim(),
  };

  const error = validateCalculateInput(data);
  if (error) throw new Error(`输入不合法：${error}`);

  saveJson("last-calculate", data);
  removeJson("last-input"); // 迁移完成，清理旧 key

  console.log("");
  console.log("✓ 录入完成，计算中...");
  return data;
}
