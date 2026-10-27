# 项目：日历（calendar）

Vite + React + TS + Tailwind v4 + shadcn。当前完成**阶段 1：日历框架**。

## 运行

- `pnpm calendar:dev`：开发服务器，端口 5174。
- `pnpm calendar:build`：`tsc --noEmit` + Vite 构建。
- `pnpm calendar:test`：Vitest，跑日期网格纯函数。
- 根 `pnpm typecheck` 会递归执行本包 `tsc --noEmit`。

## 约束

- 第三方依赖统一装在**仓库根 `package.json`**；本包 `package.json` 只放脚本，不重复声明依赖。
- 路径别名 `@/*` -> `src/*`，Vite 与 tsconfig 已同步。
- 根 `tsconfig.json` 已 exclude `packages/calendar`，避免 CLI 包的 ES2020 lib 与本包 DOM/JSX 冲突。
- 不引入路由或全局状态库；阶段 1 用 `useState` / `useMemo` 足够。
- 日期键一律使用本地 `YYYY-MM-DD`；月份内部 0–11。
- 网格生成逻辑放 `src/features/calendar/lib/monthGrid.ts`，保持纯函数并配单测。
- 日期单元格目前只读（`role="grid"` + `aria-readonly`），阶段 2 再加选择与右键。

## 阶段规划

1. **日历框架（已完成）**：满屏网格、年月选择、上下月、今天、非本月淡化。
2. 选择与操作：单击、Shift 区间、Ctrl/⌘ 点选、右键菜单、清空二次确认。
3. 编辑与持久化：事项模型、编辑弹窗、CRUD、`datas/calendar/calendar.json`。
4. 模板：事项模板管理、一键套用。
5. 图表：按时间 / 模板聚合展示。

## 持久化方案（阶段 3）

- Vite 插件中间件提供 `GET/PUT /api/calendar`，写 `datas/calendar/calendar.json`。
- 同时实现 `configureServer` 和 `configurePreviewServer`；静态部署降级 localStorage + JSON 导入导出。
- 原子写入（临时文件 + rename）、保存防抖、`version` 字段。
- 多机编辑靠 git 同步，单文件可能冲突；需要时再按月拆分文件。

## 视觉

制图台 / Blueprint：冷白纸、靛蓝、信号橙（选中态）、IBM Plex Sans + Mono、无圆角无阴影、满屏细线网格。今天整块靛蓝是唯一强强调。