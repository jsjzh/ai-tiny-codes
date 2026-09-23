/// <reference path="../typings/api.d.ts" />
import { API_PREFIX } from "./config";
import { KeepStrongClient, createKeepStrong } from "./client";
import {
  KeepStrongAction,
  KeepStrongExerciseInput,
  KeepStrongFoodInput,
  KeepStrongMealKey,
  KeepStrongMetric,
  KeepStrongRunningCommand,
  KeepStrongSchedule,
} from "./types";

let defaultClient: KeepStrongClient | null = null;
let overrideClient: KeepStrongClient | null = null;

/** 覆盖默认客户端（例如显式传入 apiKey / baseUrl） */
export function setKeepStrongClient(client: KeepStrongClient | null): void {
  overrideClient = client;
}

function client(): KeepStrongClient {
  if (overrideClient) return overrideClient;
  defaultClient ??= createKeepStrong();
  return defaultClient;
}

const P = API_PREFIX;

// ==================== 读：训练 ====================

/** 训练记录（力量/计划/手动/导入） */
export function getKeepStrongTrainingRecords(data: {
  startDate: string;
  endDate: string;
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.GetTrainingRecords> {
  return client().getJson<KeepStrongAPI.GetTrainingRecords>(`${P}/training/records`, data);
}

/** 跑计划（含 schedules / 今日训练 / 周期设置） */
export function getKeepStrongRunningPlans(): Promise<KeepStrongAPI.GetRunningPlans> {
  return client().getJson<KeepStrongAPI.GetRunningPlans>(`${P}/training/running-plans`);
}

/** 搜索动作库 */
export function getKeepStrongActions(data: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.SearchActions> {
  return client().getJson<KeepStrongAPI.SearchActions>(`${P}/training/actions`, data);
}

/** 某个动作的历史组数/次数/重量 */
export function getKeepStrongActionHistory(data: {
  actionId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.GetActionHistory> {
  const { actionId, ...query } = data;
  return client().getJson<KeepStrongAPI.GetActionHistory>(
    `${P}/training/actions/${encodeURIComponent(actionId)}/history`,
    query
  );
}

/** 动作模板列表 */
export function getKeepStrongTrainingTemplates(data?: {
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.GetTrainingTemplates> {
  return client().getJson<KeepStrongAPI.GetTrainingTemplates>(`${P}/training/templates`, data);
}

// ==================== 读：食物 ====================

/** 单日食物 + 运动日志（仅近 60 天，一次一天） */
export function getKeepStrongFoodLogs(data: { dayStr: string }): Promise<KeepStrongAPI.GetFoodLogs> {
  return client().getJson<KeepStrongAPI.GetFoodLogs>(`${P}/food/logs`, data);
}

/** 搜索食物（仅 name + 每 100g 营养） */
export function getKeepStrongFoodSearch(data: {
  keyword: string;
  pageSize?: number;
}): Promise<KeepStrongAPI.FoodSearch> {
  return client().getJson<KeepStrongAPI.FoodSearch>(`${P}/food/search`, data);
}

/** 收藏食物 */
export function getKeepStrongFoodFavorites(data?: {
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.GetFoodFavorites> {
  return client().getJson<KeepStrongAPI.GetFoodFavorites>(`${P}/food/favorites`, data);
}

/** 我创建的食物（含 AI 创建的私有食物） */
export function getKeepStrongFoodMyFoods(data?: {
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.GetFoodMyFoods> {
  return client().getJson<KeepStrongAPI.GetFoodMyFoods>(`${P}/food/my-foods`, data);
}

// ==================== 读：身体 ====================

/** 身体档案（身高/体重/体脂/可用围度类型） */
export function getKeepStrongBodyProfile(): Promise<KeepStrongAPI.BodyProfile> {
  return client().getJson<KeepStrongAPI.BodyProfile>(`${P}/body/profile`);
}

/** 体重/体脂/围度记录（近 3 年，一天保留最新一条） */
export function getKeepStrongBodyLogs(data: {
  metric: KeepStrongMetric;
  bodyType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<KeepStrongAPI.GetBodyLogs> {
  return client().getJson<KeepStrongAPI.GetBodyLogs>(`${P}/body/logs`, data);
}

// ==================== 写：训练 ====================

/** 在日历上排一次训练 */
export function postKeepStrongScheduledWorkout(data: {
  dayStr: string;
  name: string;
  actions: KeepStrongAction[];
}): Promise<unknown> {
  return client().postJson<unknown>(`${P}/training/scheduled-workouts`, data);
}

/** 新建或更新动作模板 */
export function postKeepStrongTemplate(data: {
  name: string;
  actions: KeepStrongAction[];
  templateId?: string;
}): Promise<unknown> {
  return client().postJson<unknown>(`${P}/training/templates`, data);
}

/** 整表替换某个模板的动作列表 */
export function postKeepStrongTemplateActions(data: {
  templateId: string;
  name?: string;
  actions: KeepStrongAction[];
}): Promise<unknown> {
  const { templateId, ...body } = data;
  return client().postJson<unknown>(
    `${P}/training/templates/${encodeURIComponent(templateId)}/actions`,
    body
  );
}

/**
 * 新建/更新自定义计划（一个周期内所有训练日与休息日一次性提交）。
 * 训练日必须有已存在的 templateId；休息日省略 templateId。
 */
export function postKeepStrongCustomPlan(data: {
  name: string;
  schedules: KeepStrongSchedule[];
  planId?: string;
}): Promise<KeepStrongAPI.PostCustomPlan> {
  return client().postJson<KeepStrongAPI.PostCustomPlan>(`${P}/training/custom-plans`, data);
}

/** 替换某个跑计划内某个训练模板的动作列表 */
export function postKeepStrongRunningWorkout(data: {
  runningPlanId: string;
  actions: KeepStrongAction[];
  dayStr?: string;
  templateId?: string;
  name?: string;
}): Promise<unknown> {
  const { runningPlanId, ...body } = data;
  return client().postJson<unknown>(
    `${P}/training/running-plans/${encodeURIComponent(runningPlanId)}/workouts`,
    body
  );
}

/** 修改跑计划：delay / cancel_rest / add_alternative / add_temporary_workout */
export function postKeepStrongRunningCommand(data: {
  runningPlanId: string;
  command: KeepStrongRunningCommand;
  dayStr?: string;
  [key: string]: unknown;
}): Promise<unknown> {
  const { runningPlanId, ...body } = data;
  return client().postJson<unknown>(
    `${P}/training/running-plans/${encodeURIComponent(runningPlanId)}/commands`,
    body
  );
}

// ==================== 写：食物 ====================

/** 写食物 / 运动日志（grams 必填 0.1~100000） */
export function postKeepStrongFoodLog(data: {
  dayStr: string;
  mealKey: KeepStrongMealKey;
  foods?: KeepStrongFoodInput[];
  exercises?: KeepStrongExerciseInput[];
}): Promise<unknown> {
  return client().postJson<unknown>(`${P}/food/logs`, data);
}

// ==================== 写：身体 ====================

/** 写一条身体记录（同日同指标覆盖） */
export function postKeepStrongBodyLog(data: {
  metric: KeepStrongMetric;
  bodyType?: string;
  value: number;
  unit: string;
  dayStr: string;
}): Promise<unknown> {
  return client().postJson<unknown>(`${P}/body/logs`, data);
}