// 练练健身（KeepStrong）AI API 返回类型
// 说明：该 API 直接返回数据（无 { code, data, msg } 包裹）。
declare namespace KeepStrongAPI {
  interface PageResult<T> {
    list: T[];
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  }

  // ===== 身体 =====
  interface BodyRoundType {
    id: string;
    name: string;
    unit: string;
    custom: boolean;
  }

  interface BodyProfile {
    height: number;
    heightUnit: string;
    weight: number;
    weightUnit: string;
    weightSource: string;
    weightDayStr: string | null;
    fat: number | null;
    fatUnit: string;
    fatSource: string;
    fatDayStr: string | null;
    bodyRoundTypes: BodyRoundType[];
  }

  interface BodyLog {
    id: string;
    metric: string;
    bodyType: string;
    dayStr: string;
    dayTs: number;
    value: number;
    unit: string;
    time: number;
  }

  interface GetBodyLogs extends PageResult<BodyLog> {
    metric: string;
    bodyType: string;
    startDate: string;
    endDate: string;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  // ===== 动作库 =====
  interface ActionSummary {
    id: string;
    name: string;
  }

  interface SearchActions extends PageResult<ActionSummary> {
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  // ===== 训练 =====
  interface TrainingDropSet {
    weight: string;
    reps: string;
  }

  interface TrainingSet {
    _id: string;
    weight: string;
    reps: string;
    realRestSeconds?: number;
    isDone?: boolean;
    flag?: string;
    isNewRM1Record?: boolean;
    rm1Weight?: number;
    dropSets?: TrainingDropSet[];
    combGroups: unknown[];
  }

  interface TrainingAction {
    actionId: string;
    name: string;
    weightUnit: string;
    restSeconds: number;
    groups: TrainingSet[];
    combActions: unknown[];
    weightTag?: { tag: string };
    tip?: string;
    capacity?: number;
  }

  interface Template {
    id: string;
    name: string;
    parentId: string;
    count: number;
    createTs: number;
    actions: TrainingAction[];
  }

  interface GetTrainingTemplates extends PageResult<Template> {
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  interface HistoryRecord {
    recordId: string;
    dayStr: string;
    name: string;
    durationSeconds: number;
    actions: TrainingAction[];
  }

  interface GetActionHistory extends PageResult<HistoryRecord> {
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  interface TrainingRecord {
    id: string;
    recordType: string;
    source: string;
    status: string;
    createdBy: string | null;
    trainingType: string;
    dayStr: string;
    name: string;
    durationSeconds: number;
    capacity: number;
    calorie: number;
    avgHeartRate: number;
    statsCount: number;
    statsDistance: number;
    statsCostSeconds: number;
    planId: string;
    runningPlanId: string;
    templateId: string;
    watchName: string;
    actions: TrainingAction[];
  }

  interface GetTrainingRecords extends PageResult<TrainingRecord> {
    page: number;
    pageSize: number;
    hasMore: boolean;
    startDate: string;
    endDate: string;
  }

  // 跑计划：当前账号无实盘数据，字段为宽松可选结构
  interface RunningPlan {
    [key: string]: unknown;
    runningPlanId?: string;
    planId?: string;
    name?: string;
    startDate?: string;
    schedules?: unknown[];
    todayWorkout?: unknown;
  }

  interface GetRunningPlans {
    list: RunningPlan[];
    today: string;
  }

  // ===== 食物 =====
  interface FoodItem {
    id: string;
    name: string;
    caloriesPer100g: number;
    carbsPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
  }

  interface FoodSearch {
    keyword: string;
    list: FoodItem[];
    pageSize: number;
  }

  interface GetFoodFavorites extends PageResult<FoodItem> {
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  interface GetFoodMyFoods extends PageResult<FoodItem> {
    page: number;
    pageSize: number;
    hasMore: boolean;
  }

  interface FoodStats {
    calories: number;
    exerciseCost: number;
    carbs: number;
    protein: number;
    fat: number;
  }

  // 食物日志：近 30 天无实盘数据，字段按 skill 描述推断
  interface FoodLogEntry {
    [key: string]: unknown;
    id?: string;
    name: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    grams?: number;
    mealKey?: string;
  }

  interface ExerciseLogEntry {
    [key: string]: unknown;
    id?: string;
    name: string;
    minutes: number;
    calories: number;
    mealKey?: string;
  }

  interface GetFoodLogs {
    dayStr: string;
    stats: FoodStats;
    foodLogs: FoodLogEntry[];
    exerciseLogs: ExerciseLogEntry[];
  }

  // ===== 写：自定义计划返回（skill 明确给出） =====
  interface PostCustomPlan {
    id: string;
    operation: "created" | "updated";
    versionId: string;
    dayCount: number;
    schedules: {
      cycleDay: number;
      name: string;
      templateId: string | null;
      isRest: boolean;
      actionCount: number;
    }[];
    activatedByThisRequest: boolean;
    runningPlansChanged: boolean;
  }
}