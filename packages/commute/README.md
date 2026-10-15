# @ai-tiny-codes/commute

通勤方式（地铁 / 开车·电车 / 开车·油车 / 摩托）的**年花费对比**。配置驱动，数据都在 `entry/commute.ts` 顶部。

## 使用

```bash
pnpm commute:compare        # 仓库根
pnpm --filter @ai-tiny-codes/commute compare
```

输出一张对比表：年里程、能耗量、能耗费、保养费、固定费、总花费、元/km，并按总花费排名（★ 为最省），最后给出相对「地铁（累计优惠）」的差额。加 `--json` 输出结构化结果。

## 配置（`entry/commute.ts` 顶部）

```ts
const CONFIG: CommuteConfig = {
  year: 2026,
  commuteWeekdays: [1, 2, 3, 4, 5],   // 通勤的星期（0=周日…6=周六）
  holidays: [],                        // 从通勤日扣除的节假日（YYYY-MM-DD）
  oneWayMileage: 22,                   // 单程公里
  metro:  { oneWayPrice: 6 },          // 地铁单程票价
  carEV:  { consumptionPer100km: 20, pricePerUnit: 0.5, maintainEveryKm: 5000, maintainPrice: 750, annualFixedCost: 0 },
  carGas: { consumptionPer100km: 8,  pricePerUnit: 8,   maintainEveryKm: 5000, maintainPrice: 1500, annualFixedCost: 0 },
  moto:   { consumptionPer100km: 3,  pricePerUnit: 8,   maintainEveryKm: 5000, maintainPrice: 300, annualFixedCost: 0 },
};
```

- 电车能耗单位 `KW/100km`、电价 `元/度`；油车/摩托 `L/100km`、油价 `元/升`
- `annualFixedCost` = 每年保险/停车/年检等固定费，默认 0

## 计算口径

- 通勤日 = 落在 `commuteWeekdays` 的日期，扣除 `holidays`
- 年里程 = 通勤日 × 单程公里 × 2（往返）
- 能耗费 = 里程/100 × 能耗 × 单价；保养费 = ⌊里程 / `maintainEveryKm`⌋ × `maintainPrice`
- 地铁按「**当月累计消费**」分档、每月重置：累计 <50 元 九折、50~100 元 七折、≥100 元 五折（`src/metro.ts` 的 `METRO_RATES`，可覆盖）

## 作为库引用

```ts
import { compareCommute, type CommuteConfig } from "@ai-tiny-codes/commute";

const report = compareCommute(config);
report.results;        // 按总花费升序
report.cheapest;       // key
report.savingsVsMetroDiscount; // 相对地铁(优惠) 的差额
```

> 注意：仅按 `commuteWeekdays` 估算通勤日，不含临时外出/加班等；节假日请自行填入 `holidays`。