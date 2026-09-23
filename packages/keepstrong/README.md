# @ai-tiny-codes/keepstrong

练练健身（KeepStrong）AI API 的轻量客户端：只包 `fetch`，一个接口一个函数，参数与返回都有 TS 类型。

## 安装与引用

仓库内其它包可直接声明依赖：

```json
{ "dependencies": { "@ai-tiny-codes/keepstrong": "workspace:*" } }
```

## 配置

API Key 走环境变量，仓库根放一份 `.env.local`（已被 git 忽略，参考 `.env.example`）：

```
KEEPSTRONG_API_KEY=ll_ai_xxx
# KEEPSTRONG_BASE_URL=https://lianlian.gzyunke.cn
```

也可显式传入，覆盖环境变量：

```ts
import { createKeepStrong, setKeepStrongClient } from "@ai-tiny-codes/keepstrong";

setKeepStrongClient(createKeepStrong({ apiKey: "...", baseUrl: "..." }));
```

**每个请求自动带**：`Authorization: Bearer`、`X-KeepStrong-Skill-Version: 1.25.0`、`X-KeepStrong-Agent-Name: opencode`、`X-Timezone-Offset`（= `-getTimezoneOffset()`，中国 480）。
**写请求额外**：`Content-Type: application/json`、`Idempotency-Key`（随机）、body 自动合并 `userConfirmed: true`。

## 用法

```ts
import {
  getKeepStrongBodyProfile,
  getKeepStrongTrainingRecords,
  getKeepStrongTrainingTemplates,
  postKeepStrongBodyLog,
} from "@ai-tiny-codes/keepstrong";

const profile = await getKeepStrongBodyProfile();
const records = await getKeepStrongTrainingRecords({ startDate: "20260901", endDate: "20260923", pageSize: 10 });

// 写：只需传业务字段，幂等键与 userConfirmed 由客户端补
await postKeepStrongBodyLog({ metric: "weight", value: 88.1, unit: "kg", dayStr: "20260923" });
```

日期格式统一 `yyyyMMdd`。

## 接口一览

**读（11）**
`getKeepStrongTrainingRecords` / `getKeepStrongRunningPlans` / `getKeepStrongActions` / `getKeepStrongActionHistory` / `getKeepStrongTrainingTemplates` / `getKeepStrongFoodLogs` / `getKeepStrongFoodSearch` / `getKeepStrongFoodFavorites` / `getKeepStrongFoodMyFoods` / `getKeepStrongBodyProfile` / `getKeepStrongBodyLogs`

**写（8）**
`postKeepStrongScheduledWorkout` / `postKeepStrongTemplate` / `postKeepStrongTemplateActions` / `postKeepStrongCustomPlan` / `postKeepStrongRunningWorkout` / `postKeepStrongRunningCommand` / `postKeepStrongFoodLog` / `postKeepStrongBodyLog`

动作 payload 三种形态见 `src/types.ts`：普通 / `dropSets`（递变组，挂在组上）/ `supersetActions`（超级组，2~4 个动作）。**未指定重量传 `weight: ""`，不要传 0**。

返回类型在 `typings/api.d.ts` 的全局命名空间 `KeepStrongAPI`（如 `KeepStrongAPI.GetTrainingRecords`）。

## 约定与限制（来自练练 skill）

- 返回**无 `{code,data,msg}` 包裹**，直接是数据
- 写操作前需用户确认；本客户端只负责带上 `userConfirmed=true`，是否确认由调用方负责
- 食物日志一次一天、仅近 60 天；食物搜索每页 ≤30、每日限 100 次；身体记录近 3 年、每页 ≤100
- `401 apiKeyExpired` 会抛出「请去 App 重新生成 key」；`429` 按 `Retry-After` 有界重试；`426` 提示 skill 需更新
- 中文里应用名统一叫「练练健身」

## 本地探测

`pnpm keepstrong:probe`（根）或 `pnpm --filter @ai-tiny-codes/keepstrong probe`：会读取根 `.env.local`，依次调用各 GET 并打印原始返回，用于核对返回结构，**不触碰写接口**。