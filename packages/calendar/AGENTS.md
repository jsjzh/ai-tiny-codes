# 项目：日历（calendar）

Vite + React + TS + Tailwind v4 + shadcn。当前完成**阶段 2：日历框架 + 选择交互**。

## 运行

- `pnpm calendar:dev`：开发服务器，端口 5174。
- `pnpm calendar:build`：`tsc --noEmit` + Vite 构建。
- `pnpm calendar:test`：Vitest，跑日期网格与日期区间纯函数。
- 根 `pnpm typecheck` 会递归执行本包 `tsc --noEmit`。

## 约束

- 第三方依赖统一装在**仓库根 `package.json`**；本包 `package.json` 只放脚本，不重复声明依赖。
- 路径别名 `@/*` -> `src/*`，Vite 与 tsconfig 已同步。
- 根 `tsconfig.json` 已 exclude `packages/calendar`，避免 CLI 包的 ES2020 lib 与本包 DOM/JSX 冲突。
- 不引入路由或全局状态库；目前 `useState` / `useMemo` / 自定义 hook 足够。
- 日期键一律使用本地 `YYYY-MM-DD`；月份内部 0–11。
- 网格生成逻辑放 `src/features/calendar/lib/monthGrid.ts`，保持纯函数并配单测。
- 网格固定 5–6 行：始终保留上下相邻月份各一周；月初周日再前加一周，月末周六再后加一周。
- 日期单元格是 `<button role="gridcell">`，支持 Tab / Enter / Space；不要改回只读 div。
- 选择状态集中在 `useCalendarSelection`；Shift 区间、Ctrl/⌘ 加选、拖拽、右键锚点都在这里，避免散落到组件。
- 修饰键用 `lib/platform.ts`：macOS 用 ⌘，Windows/Linux 用 Ctrl；不要直接用 `metaKey || ctrlKey`，否则 macOS 的 Ctrl+click（右键）会误加选。
- 右键菜单用 Radix ContextMenu，编辑/清空弹窗用 Radix Dialog；清空必须二次确认。
- 切换年月会清空选择，这个行为在 `CalendarView` 的 effect 里。

## 阶段规划

1. **日历框架（已完成）**：满屏网格、年月选择、上下月、今天、非本月淡化、相邻周上下文。
2. **选择与操作（已完成）**：单击、Shift 区间、Ctrl/⌘ 点选、拖拽、右键菜单、清空二次确认、双击编辑占位。
3. 编辑与持久化：事项模型、编辑弹窗、CRUD、`datas/calendar/calendar.json`。
4. 模板：事项模板管理、一键套用。
5. 图表：按时间 / 模板聚合展示。

## 当前占位

- 编辑弹窗只显示选中日期，并提示阶段 3 接入。
- 清空确认后只清空选择；阶段 3 再接事项删除。
- 右键菜单中的编辑/清空在选中数为 0 时禁用，但正常右键一定会先选中日期。

## 持久化方案（阶段 3）

- Vite 插件中间件提供 `GET/PUT /api/calendar`，写 `datas/calendar/calendar.json`。
- 同时实现 `configureServer` 和 `configurePreviewServer`；静态部署降级 localStorage + JSON 导入导出。
- 原子写入（临时文件 + rename）、保存防抖、`version` 字段。
- 多机编辑靠 git 同步，单文件可能冲突；需要时再按月拆分文件。

## 视觉

制图台 / Blueprint：冷白纸、靛蓝、信号橙（选中态）、语义红（清空确认）、IBM Plex Sans + Mono、无圆角无阴影、满屏细线网格。今天整块靛蓝是唯一强强调，选中态用 1px 橙描边 + 淡橙底。