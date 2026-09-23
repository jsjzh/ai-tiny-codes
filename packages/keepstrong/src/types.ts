/** 食物餐次：+ 号表示早餐/午餐/晚餐之后的加餐；exercise 用于记录运动消耗 */
export type KeepStrongMealKey =
  | "breakfast"
  | "breakfast+"
  | "lunch"
  | "lunch+"
  | "dinner"
  | "dinner+"
  | "exercise";

/** 身体记录指标 */
export type KeepStrongMetric = "weight" | "fat" | "bodyRound";

/** 跑计划命令 */
export type KeepStrongRunningCommand =
  | "delay"
  | "cancel_rest"
  | "add_alternative"
  | "add_temporary_workout";

/**
 * 一组（一组 = 若干次 reps）。
 * 未指定重量时 weight 传空字符串 ""（不能用 0，0 会关闭自动沿用历史重量）。
 */
export interface KeepStrongSet {
  reps: number;
  weight?: number | string;
  /** 左右分开记录时的右侧重量 */
  rightWeight?: number | string;
  /** 递变组：本组结束后依次递减的小组 */
  dropSets?: KeepStrongDropSet[];
}

export interface KeepStrongDropSet {
  reps: number;
  weight?: number | string;
  rightWeight?: number | string;
}

/**
 * 训练动作。写接口里一个 actions 项可以是：
 * - 普通动作：actionId + groups
 * - 递变组：普通动作的每组带 dropSets
 * - 超级组：supersetActions（2~4 个动作，且组数一致；超级组内不支持递变组）
 */
export interface KeepStrongAction {
  actionId?: string;
  restSeconds?: number;
  weightUnit?: string;
  groups?: KeepStrongSet[];
  supersetActions?: KeepStrongAction[];
}

/** 自定义计划里的一天：训练日必须有 templateId，休息日 templateId 省略或 null */
export interface KeepStrongSchedule {
  templateId?: string | null;
  name?: string | null;
}

/** 写食物日志的食物项：优先 foodId；或传 name + 每 100g 营养由练练创建私有食物 */
export interface KeepStrongFoodInput {
  foodId?: string;
  name?: string;
  grams: number;
  caloriesPer100g?: number;
  carbsPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
}

/** 写食物日志的运动项（mealKey=exercise） */
export interface KeepStrongExerciseInput {
  name: string;
  minutes: number;
  calories: number;
}