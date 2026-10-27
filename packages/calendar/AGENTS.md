# 项目：日历（calendar）

Vite + React + TS + Tailwind v4 + shadcn。当前完成**阶段 3：模板 + 数据层 + 持久化**。

## 运行

- `pnpm calendar:dev`：开发服务器，端口 5174，同时挂载 `/api/calendar`。
- `pnpm calendar:build`：`tsc --noEmit` + Vite 构建。
- `pnpm calendar:test`：Vitest，跑日期网格、日期区间、数据规范化/校验。
- 根 `pnpm typecheck` 会递归执行本包 `tsc --noEmit`。

## 约束

- 第三方依赖统一装在**仓库根 `package.json`**；本包 `package.json` 只放脚本，不重复声明依赖。
- 路径别名 `@/*` -> `src/*`，Vite 与 tsconfig 已同步。
- 根 `tsconfig.json` 已 exclude `packages/calendar`，避免 CLI 包的 ES2020 lib 与本包 DOM/JSX 冲突。
- 不引入路由或全局状态库；目前 `useState` / `useMemo` / Context 足够。
- 日期键一律使用本地 `YYYY-MM-DD`；月份内部 0–11。
- 网格生成逻辑放 `src/features/calendar/lib/monthGrid.ts`，保持纯函数并配单测。
- 网格固定 6 行：月初周日再前加一周，月末周六再后加一周；自然只有 5 行时向后补一周。
- 日期单元格是 `<button role="gridcell">`，支持 Tab / Enter / Space；不要改回只读 div。
- 选择状态集中在 `useCalendarSelection`；Shift 区间、Ctrl/⌘ 加选、拖拽、右键锚点都在这里。
- 普通点击：唯一选中项再点一次取消；多选时点某个已选日期收敛为只选该日期。
- 点击日历以外区域清空选择：`CalendarView` 监听 document `pointerdown`，排除 grid/menu/dialog/overlay。
- 双击和右键前调用 `ensureDateSelected`，保证目标日期处于选中态。
- 修饰键用 `lib/platform.ts`：macOS 用 ⌘，Windows/Linux 用 Ctrl；不要用 `metaKey || ctrlKey`。
- 切换年月会清空选择。

## 数据层（阶段 3）

- 数据文件：`datas/calendar/calendar.json`，结构由 `src/features/calendar/data/types.ts` 定义。
- `CalendarDataProvider` 在 App 最外层挂载，负责加载、错误状态和 `commitData`。
- `storage.ts`：优先 `GET/PUT /api/calendar`；静态环境或 404/405 降级 localStorage。
- `server/calendarDataPlugin.ts`：Vite dev/preview 中间件，原子写临时文件后 rename。
- `normalizeCalendarData`：排序 `sortOrder`、去重 code、剔除无效模板和事件；提交前会跑一遍。
- 每天每模板一条：`events[date][code] = value`；全局顺序由模板 `sortOrder` 决定，不存每日 order。
- 模板 `code` 当前自动生成、创建后只读；改标题不会影响事件。
- 删除模板必须级联删除该模板的事件，并二次确认。
- `chartTemplates` 已预留，阶段 5 再定义具体字段。

## 模板弹窗（阶段 3）

- `features/templates/TemplateModal.tsx`：大弹窗、左列表右表单、全局遮罩，不与编辑弹窗叠加。
- 左列表用 `@dnd-kit` 拖动排序，改写模板 `sortOrder`；这是全局顺序的唯一编辑入口。
- 「新建模板」按钮固定在左列表底部，不要放回弹窗 header。
- 标题校验展示在输入框下方并标红输入框；错误行用 `min-h-4` 预留高度，避免弹窗因报错变高。
- 编辑事件弹窗后续不得加入拖动排序。
- 颜色用 `react-colorful` + 28 个预设色块；自定义取色面板在表单内展开。
- 模板字段：标题、code、数值/文本、单位、颜色、描述；带日历预览。
- 使用次数从草稿 `events` 计算；有记录的模板禁止改 kind。
- session draft：打开时 clone 数据，内部所有修改只改 draft；“完成”才 `commitData` 并关闭；X 放弃（有改动先确认）；点遮罩不关闭；Escape 等同 X。
- 模板弹窗的 `DialogContent` 使用 `scrollable={false}`，内部列各自滚动。
- 编辑弹窗没模板时，后续提供“去新建模板”入口；先关闭编辑弹窗再打开模板弹窗。

## Header

- 三列 grid：`‹ 年 月 ›` 和「回到今日」居中；左右切换分列年月两侧；模板按钮最右；图表不放 header。
- 「回到今日」按钮：非本月时实心/可用，本月时 ghost + disabled。
- 手机端模板按钮图标化；320px 下用 `max-[359px]` 紧凑尺寸，避免和模板按钮重叠。

## 阶段规划

1. **日历框架（已完成）**：满屏网格、固定 6 行、年月选择、上下月、今天、非本月淡化、相邻周上下文。
2. **选择与操作（已完成）**：单击 / 再次点击取消、Shift 区间、Ctrl/⌘ 点选、拖拽、点击外部清空、右键菜单、清空确认。
3. **模板 + 数据层 + 持久化（已完成）**：模板弹窗、全局拖拽排序、颜色选择、`calendar.json`、Vite API、session draft。
4. 编辑 + 日历事项展示 + 事件 CRUD：单条/多条、逐日输入、勾选删除、动态两列展示、完成/X。
5. 图表框架：日历下方 section + 空状态 + 独立图表模板入口；具体图表后续。

## 当前占位

- 编辑弹窗仍是占位，尚未接事件 CRUD。
- 日历格子尚未展示事项。
- 图表 section 和图表模板管理尚未开始。
- 清空选中日期目前只清空选择，阶段 4 再接事件删除。

## 视觉

制图台 / Blueprint：冷白纸、靛蓝、信号橙（选中态）、语义红（危险操作）、IBM Plex Sans + Mono、无圆角无阴影、满屏细线网格。今天仍为实心靛蓝（阶段 4 会改为浅靛蓝 + 日期徽章）。