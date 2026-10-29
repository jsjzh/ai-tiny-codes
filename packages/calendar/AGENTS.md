# 项目：日历（calendar）

Vite + React + TS + Tailwind v4 + shadcn。当前完成**阶段 5b + 主题系统**；下一步动画。

扩展手册：`docs/EXTENDING.md`（新增事项/图表模板、块规则、图表渲染、导入格式）。
待办：`TODO.md`（动画、导入增强）。
## 运行

- `pnpm calendar:dev`：开发服务器，端口 5174，同时挂载 `/api/calendar` 和 `/api/charts`。
- `pnpm calendar:build`：`tsc --noEmit` + Vite 构建。
- `pnpm calendar:test`：Vitest，跑日期网格、日期区间、事件 CRUD、布局计算、数据规范化、块规则、图表数据工具。
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

## 数据层

- 日历数据：`datas/calendar/calendar.json`，结构由 `src/features/calendar/data/types.ts` 定义。
- 图表数据：`datas/charts/charts.json`，结构由 `src/features/charts/data/types.ts` 定义；与日历数据解耦。
- `CalendarDataProvider` / `ChartsDataProvider` 在 App 外层挂载，负责加载、错误状态和 `commitData`。
- `storage.ts`：优先 `GET/PUT /api/calendar`、`/api/charts`；静态环境或 404/405 降级各自 localStorage。
- `server/dataPlugins.ts`：通用 Vite dev/preview JSON 中间件，两个路由共用，原子写临时文件后 rename。
- `normalizeCalendarData`：排序 `sortOrder`、去重 code、剔除无效模板和事件；提交前会跑一遍。
- 图表数据同样在提交前规范化；图表模块只读取日历数据，不向 `calendar.json` 写入。
- 每天每模板一条：`events[date][code] = value`；全局顺序由模板 `sortOrder` 决定，不存每日 order。
- 模板 `code` 当前自动生成、创建后只读；改标题不会影响事件。
- 删除模板必须级联删除该模板的事件，并二次确认。
- `data/events.ts` 提供事件 upsert / 批量 upsert / 按 key 删除 / 按日期清空 / 解析输入 / 格式化展示；纯函数并配单测。
- `lib/dateRange.ts` 提供连续区间判断、日期摘要、非连续日期 chips 文案。
- `lib/eventLayout.ts` 计算格子可见行数；1440×900 约 2×4=8 条，1920×1080 约 2×5=10 条，390 宽约 5 条，320 宽约 4 条。

## 模板弹窗

- `features/templates/TemplateModal.tsx`：大弹窗、左列表右表单、全局遮罩，不与编辑弹窗叠加。
- 左列表用 `@dnd-kit` 拖动排序，改写模板 `sortOrder`；这是全局顺序的唯一编辑入口。
- 「新建模板」按钮固定在左列表底部，不要放回弹窗 header。
- 新建模板默认标题按 `新事项 N` 递增，颜色从明亮预设色中随机取，方便测试。
- 标题校验展示在输入框下方并标红输入框；错误行用 `min-h-4` 预留高度，避免弹窗因报错变高。
- 颜色用 `react-colorful` + 28 个偏明亮的预设色块；自定义取色面板在表单内展开。
- 模板字段：标题、code、数值/文本、单位、颜色、描述；带日历预览。
- 使用次数从草稿 `events` 计算；有记录的模板禁止改 kind。
- session draft：打开时 clone 数据，内部所有修改只改 draft；“完成”才 `commitData` 并关闭；X 放弃（有改动先确认）；点遮罩不关闭；Escape 等同 X。
- 模板弹窗的 `DialogContent` 使用 `scrollable={false}`，内部列各自滚动。
- 模板表单底部「导入数据」支持 JSON / CSV；导入按日期覆盖当前模板，不删除其他事项，只改草稿，点「完成」才写盘。
- 导入解析在 `features/templates/lib/importEvents.ts`，JSON 支持 `logs`、数组、日期映射；CSV 支持 `date,value` / `日期,值`。

## 编辑弹窗（阶段 4）

- `features/events/EventEditModal.tsx`：按选中日期数量切换单条/多条；同样使用 session draft。
- 单条：当天已有事项列表 + 底部固定表单；点已有行载入表单；数值显示 unit 输入，文本用 textarea；保存后留在弹窗。
- 单条删除用行内二次确认；单条和多条都**没有拖动排序**。
- 多条：头部显示连续区间或非连续 chips；逐日输入框，已有值预填；空值跳过；统一填充可先填所有行；可切换模板继续填第二个事项。
- 多条已有事项列表：全选 / 逐条勾选 / 批量删除 / 行内确认。
- 没有模板时显示“去新建模板”；先关闭编辑弹窗再打开模板弹窗，不叠加。
- 完成提交草稿并关闭；X 放弃并确认；点遮罩不关闭；Escape 等同 X。
- 右键“清空”真正删除选中日期的全部事件，并显示记录条数后二次确认。

## 日历事项展示

- `MonthGrid` 用 `useLayoutEffect` + `ResizeObserver` 测量单元格尺寸，计算动态列数/行数。
- 桌面单元格宽度 ≥170px 时两列，否则单列；行数按高度计算，最多 5 行/列。
- 日期独立一行：`+N` 在左上角，日期固定在右上角；今天用浅靛蓝底 + 靛蓝日期徽章，不再写“今天”。
- DayCell 必须是 `flex flex-col`；日期行 `shrink-0`，事项区 `flex-1`，否则内容会把日期挤到中间。
- 日期行与事项之间保留 gap（桌面 8px、移动端 4px），和格子底部 padding 平衡。
- 桌面每行显示 `色点 + 标题 + 值 + 单位`；移动端只显示 `色点 + 值`，避免窄格被单位截断。
- 事项按模板 `sortOrder` 全局排序；两列按列优先填充，先左列再右列。
- 事项文字不单独点击；整个日期格仍是选择/编辑入口。
- 清空选中日期会真正删除事件；日历和图表在弹窗完成后统一刷新。

## 图表框架与渲染（阶段 5a / 5b）

- 图表 section 在日历下方，`#charts`，全宽；页面整体纵向滚动，首屏日历仍为 `100dvh`。
- 图表 header：标题、说明、回到月历、案例选择、新建案例、编辑案例、图表模板；图表模板入口只在图表区，不放进日历 header。
- 无案例时显示空状态和 `新建案例` CTA；无图表模板时，新建案例里提示到上方「图表模板」创建。
- 案例编辑器是图表区内联视图，不是弹窗；取消直接丢弃草稿，保存/另存为/删除才写盘。
- 案例字段：`name`、`startDate`、`endDate`、`eventCodes`、`rows`、`createdAt`、`updatedAt`。
- 行：1–4 个槽位；槽位可以是空、块或图表。空槽在查看态保留空白，在编辑态显示虚线提示。
- 高度：块 1–2，图表 1–4；行高取本行最大高度，卡片顶部对齐。移动端 `chart-slot-grid` 强制单列。
- 拖拽使用原生 HTML5 DnD：`WIDGET_DRAG_TYPE` 移动内容，`CHART_DRAG_TYPE` 从模板面板复制；不要改成依赖库。
- 块：
  - 案例内联创建/编辑，没有全局块模板库。
  - 字段：`title`、`info`、`eventCode`（固定值可为 `null`）、`rule`。
  - 规则：`fixed`、`latest`、`max`、`min`、`loss`、`change`、`bmi`、`distanceToTarget`。
  - 范围：`case`、`all`、`lastDays`；`lastDays` 以案例结束日前最后一条记录为终点，允许回看到案例开始前，不能超过案例结束日。
  - `case` 是默认展示范围；`all` 明确读取全部历史；非 `case` 范围在卡片上显示范围 badge。
  - 块规则计算在 `lib/blockRules.ts`，保持纯函数并配测试。
- 图表模板：
  - 与事项模板分开管理，通过 `eventCode` 关联；每个模板只绑定一个事项。
  - 数值事项支持 `line|bar|area`，文本事项支持 `table|distribution`。
  - 数值指标：`daily|avg7|avg30|changeRate`；同单位指标可合并，`changeRate` 必须单独使用。
  - 图表模板删除时按**案例数去重**提示，并清空所有案例中的对应图表；草稿中的对应图表也要清理。
  - 事项模板删除时图表模板/块不删除，显示“引用的事项已删除”软失效。
- 案例编辑器打开时可以继续打开「图表模板」弹窗；创建模板后草稿保留，删除模板会同步清理草稿中失效的图表。
- 数值图表用 **ECharts 6**，不引入 `echarts-for-react`；`components/charts/EChart.tsx` 负责 init/dispose/resize，`lib/echartsOption.ts` 负责 option。
- ECharts 按需注册 `LineChart` / `BarChart` / `Grid` / `Tooltip` / `Legend` / `DataZoom` / `CanvasRenderer`；组件通过 `React.lazy` 动态加载，避免压首屏。
- 图表交互：滚轮缩放、拖拽平移、底部 slider、重置缩放、折线/柱状/面积临时切换；切换只改当前视图，不写模板/案例。
- 动画先关闭 `animation: false`，等主题/动画阶段统一设计。
- 文本图表不走 ECharts：`TextTable.tsx` 按日期列表；`TextDistribution.tsx` 按值计数横向条。
- 数据构建在 `lib/chartData.ts`，保持纯函数并配 `chartData.test.ts`；option 构建配 `echartsOption.test.ts`：
  - `daily` 只取当天值；空值不补 0。
  - `avg7` / `avg30` 在案例开始前回看，但 x 轴仍从案例开始画到案例结束。
  - `changeRate` 只在有记录的日期计算，使用上一条记录；单位显示 `%`。
  - 文本只读案例区间内的值；分布按出现次数排序。
- 图表尺寸由 ECharts wrapper 内的 `ResizeObserver` 调 `chart.resize()`；移动端单列时仍可读。
- 柱状图以 0 为基线；折线/面积按数据范围缩放。`daily` 用事项颜色，`avg7` / `avg30` / `changeRate` 用主题色板的不同颜色，并用实线/虚线/点线区分；图例显示每种颜色。
- `ChartCard` 只负责标题、事项、类型、图例和渲染容器；不要在这里写死数据计算。

## 主题系统

- `features/theme/theme.ts`：`ThemeId`、5 套主题定义、图表色板、默认主题、localStorage key、深色事件色提亮。
- `ThemeProvider` 挂在 `App` 最外层；`useTheme` 提供 `theme` / `setTheme`。
- 主题通过 `<html data-theme="...">` 生效；`index.html` 的内联脚本在首屏前读取 localStorage，避免闪烁。
- `ThemeSwitcher` 在日历 header 右侧；入口带 `data-ignore-selection`，点击不会清空日期选择。
- 5 套主题：`blueprint` 制图台、`warm` 暖纸编辑部、`night` 夜航仪表盘、`botanical` 苔原笔记、`swiss` 瑞士信号。
- 颜色、字体、控件圆角、浮层阴影都在 `index.css` 用 token 定义；新组件不要写死颜色，用 `paper/sheet/ink/rule/blueprint/signal/muted-foreground` 等 token。
- 标题字使用 `--font-display`；控件圆角用 `--radius-control`；浮层阴影用 `--shadow-panel`。
- ECharts canvas 不继承 CSS 变量：`ChartCard` 必须通过 `getChartTheme(theme)` 把主题传给 `buildNumericChartOption`；深色主题用 `resolveChartColor` 提亮事件颜色；多指标用 `getMetricColor` 从主题色板取不同颜色。
- 新增主题时同步：`THEME_DEFINITIONS`、`index.css` 的 `[data-theme]` token、`index.html` 内联脚本允许列表、图表色板、`TODO`/README。
- 主题选择只存 localStorage，不写入日历/图表 JSON。

## Header

- 三列 grid：`‹ 年 月 ›` 和「回到今日」居中；左右切换分列年月两侧；右侧为主题 + 模板按钮；图表不放 header。
- 「回到今日」按钮：非本月时实心/可用，本月时 ghost + disabled。
- 手机端模板按钮图标化；320px 下用 `max-[359px]` 紧凑尺寸，避免和模板按钮重叠。

## 阶段规划

1. **日历框架（已完成）**：满屏网格、固定 6 行、年月选择、上下月、回到今日、非本月淡化、相邻周上下文。
2. **选择与操作（已完成）**：单击 / 再次点击取消、Shift 区间、Ctrl/⌘ 点选、拖拽、点击外部清空、右键菜单、清空确认。
3. **模板 + 数据层 + 持久化（已完成）**：模板弹窗、全局拖拽排序、颜色选择、`calendar.json`、Vite API、session draft。
4. **编辑 + 日历事项展示 + 事件 CRUD（已完成）**：单条/多条、逐日输入、非连续日期、勾选删除、动态两列、今天浅色、清空事件。
5a. **图表框架（已完成）**：独立图表数据/API、图表模板、案例、槽位布局、块规则、原生拖拽、软失效。
5b. **图表渲染（已完成）**：ECharts 折线/柱状/面积、文本对照表/分布、坐标轴与案例区间、缩放/平移/重置。
6. **主题（已完成）**：5 套 token 主题、header 切换器、localStorage、ECharts 同步。
7. **动画（下一阶段）**：图表/卡片/切换/拖拽/弹窗动效，尊重 reduced-motion。

## 当前阶段

- 5b 与主题系统已完成；下一步按 `TODO.md` 做动画。
- 图表模板与事项模板分开管理，通过 `eventCode` 关联；案例通过 `eventCodes` 过滤可用模板。

## 视觉

默认 Blueprint：冷白纸、靛蓝、信号橙（选中态）、语义红（危险操作）、IBM Plex Sans + Mono、无圆角无阴影、满屏细线网格。另有 Warm / Night / Botanical / Swiss；所有主题共用同一套组件 token，不写死颜色。事项色点用明亮预设色，桌面显示单位、移动端只显示值。
