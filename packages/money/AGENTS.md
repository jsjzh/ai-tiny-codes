# 项目：攒钱计划计算器（money）

用 TypeScript 编写，单文件实现：输入「已有存款 / 每年攒多少 / 年化 / 目标 / 开始日期」，逐年算出攒钱进度与达标时间。业务说明见 README.md，本文件记录架构与口径。

## 运行方式
- `pnpm money:calculate`（仓库根）/ `pnpm --filter @ai-tiny-codes/money calculate`（或本包 `pnpm calculate`）
- `pnpm typecheck`：tsc --noEmit
- 纯交互式（`@inquirer/prompts`），没有 `--input` / `--json` 免交互入口（这是刻意保持的简单形态）

## 结构
```
src/index.ts   # 全部逻辑：类型 / calculateSavingPlan（纯函数）/ 交互输入 / cli-table3 输出
```
- 表格统一用 `@ai-tiny-codes/utils` 的 `newTable` / `printSection`（已按需注入 colAligns，避免显式传 undefined 崩溃）
- 日期校验用 `@ai-tiny-codes/utils` 的 `isValidDateString`；格式化用 `roundTo` / `formatMoney` / `formatPercent`

## 计算口径（用户确认，勿随意改）
- **年初存入**：每年年初先存入当年的钱，再计息
- 年利息 = 年初余额（含当年存入）× 年化；年末总额 = 年初余额 × (1 + 年化)
- **精确到月**：年内利息按月线性累积，`第 m 月余额 = 年初余额 × (1 + 年化 × m/12)`，取第一个 ≥ 目标的月份为达标点（满年结果与纯年复利一致）
- **已有存款也参与计息**；初始存款 ≥ 目标 → 提示「已达标，无需再存」并输出当前金额，不出表格
- 年化为 0 且不再存入 → 提示无法达标（不会死循环）
- 年份标注：第 `year` 次存入对应日历 `startYear + year - 1`；达标发生在年初存入后（m=0）时标「（年初存入后）」，其余标「（第 N 个月）」
- 汇总：总投入本金 = 初始存款 + 年存 × 存入次数；总利息 = 最终金额 − 总投入本金

## 输入约定
- 年化收益率**输入 `2` 表示 2%**（代码内 `/100` 转小数）
- 各数字项 `step: "any"`，非法值重新提示：存款/年存/年化 ≥0，目标 >0
- 开始日期 `YYYY-MM-DD`，默认今天

## 记忆
- 用 `@ai-tiny-codes/utils` 的 `createJsonStore("money")`，上次输入存 `~/.ai-tiny-codes/money/last-input.json`，启动读回作默认值，录入成功后写入
- 注意：本地测试会写入该文件（默认值），测试完记得清理，别把残留值当默认

## 依赖
- 第三方依赖（`@inquirer/prompts`、`cli-table3` 等）统一在仓库根 `package.json` 声明；`@ai-tiny-codes/utils` 以 `workspace:*` 声明在本包
