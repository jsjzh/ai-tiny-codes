# 日历扩展手册

这份文档给后续接手的 AI / 开发者看。先读 `AGENTS.md`，再按这里的路径改代码；不要重新猜架构。

## 1. 数据流

```
datas/calendar/calendar.json
  -> /api/calendar (server/dataPlugins.ts)
  -> CalendarDataProvider
  -> CalendarView / EventEditModal / TemplateModal

datas/charts/charts.json
  -> /api/charts (server/dataPlugins.ts)
  -> ChartsDataProvider
  -> ChartsSection
  -> CaseEditor / CaseCanvas
  -> BlockCard / ChartCard
```

约束：

- 日历和图表数据完全分开。图表只读取日历，不写 `calendar.json`。
- 图表模板只通过 `eventCode` 关联事项模板；案例通过 `eventCodes` 筛选可用模板。
- 所有编辑先改草稿，用户确认后再 `commitData`。
- `datas/*.json` 是仓库内持久化数据，不要写入测试假数据后提交。
- 日期一律本地 `YYYY-MM-DD`；不要用 UTC 的 `toISOString().slice(0, 10)`。

## 2. 新增事项模板 / 导入事项

事项模板在 UI 里创建：日历 header「模板」->「新建模板」。

模板字段：

| 字段 | 含义 |
| --- | --- |
| `code` | 唯一键，自动生成，创建后只读 |
| `title` | 日历与图表显示名 |
| `kind` | `number` / `text` |
| `unit` | 数值单位，文本为空 |
| `color` | 日历色点 + 图表颜色 |
| `desc` | 说明 |
| `sortOrder` | 全局顺序，模板列表拖拽维护 |

事项数据导入：

- 模板表单底部「导入数据」。
- 支持 JSON / CSV。
- JSON 支持：
  - `{"logs":[{"dayStr":"20231019","value":87.8}]}`
  - `[{"date":"2023-10-19","value":87.8}]`
  - `{"2023-10-19":87.8}`
  - `{"2023-10-19":{"weight":87.8}}`
- CSV 支持 `date,value` 或 `日期,值` 表头；也支持制表符分隔。
- 导入按日期覆盖当前模板的值，不删除其他模板；空值、无效数字、非法日期跳过。
- 导入只改草稿，仍需点模板弹窗「完成」才写盘。
- 如果模板已有记录，类型（数值/文本）会锁定，导入前先确认类型。

## 3. 新增图表模板

图表模板在图表区「图表模板」里创建。一个模板只绑定一个事项。

字段：

```ts
type ChartTemplate = {
  code: string;
  title: string;
  eventCode: string;
  kind: "numeric" | "text";
  chartType: "line" | "bar" | "area" | "table" | "distribution";
  metrics: Array<"daily" | "avg7" | "avg30" | "changeRate">;
  desc: string;
  sortOrder: number;
};
```

修改位置：

1. `features/charts/data/types.ts`
   - `ChartType` / `ChartTemplate` / `ChartTemplateKind`
   - `NUMERIC_CHART_TYPES` / `TEXT_CHART_TYPES`
   - `normalizeChartTemplate`
   - `validateChartTemplateDraft`
2. `features/charts/ChartTemplateModal.tsx`
   - 表单字段、图表类型选项、指标选项
   - 新建默认值、删除提示
3. `features/charts/lib/widgetLayout.ts`
   - `CHART_TYPE_LABELS` / `METRIC_LABELS`
4. `features/charts/components/ChartCard.tsx`
   - 现在承载真实图表渲染；数据构建在 `lib/chartData.ts`。
5. `features/charts/data/types.test.ts`
   - 如果改了使用计数、规范化或删除逻辑，补测试。

规则：

- 数值事项：`line` / `bar` / `area`。
- 文本事项：`table` / `distribution`。
- `changeRate` 必须单独使用，不能和 `daily` / `avg7` / `avg30` 混。
- 图表模板删除时按案例去重计数，并清空所有案例中的对应图表。
- 事项模板删除后不要删图表模板；保留并显示「引用的事项已删除」。
- 新增图表类型时，同时更新类型、标签、表单选项、渲染分支和测试。

## 4. 新增块规则

块在案例编辑器里创建，没有全局块模板库。

字段：

```ts
type BlockRule = {
  type:
    | "fixed"
    | "latest"
    | "max"
    | "min"
    | "loss"
    | "change"
    | "bmi"
    | "distanceToTarget";
  value?: string;
  unit?: string;
  range?: { type: "case" } | { type: "all" } | { type: "lastDays"; days: number };
  heightCm?: number;
  target?: number;
};
```

修改位置：

1. `features/charts/data/types.ts`
   - `BlockRuleType`
   - `BLOCK_RULE_TYPES`
   - `normalizeRule`
2. `features/charts/BlockEditorDialog.tsx`
   - `RULE_LABELS`
   - `NUMERIC_RULES` / `availableRules`
   - 规则专属字段、校验、预览
3. `features/charts/lib/blockRules.ts`
   - `resolveBlockResult` 的 switch
   - `blockRangeDescription`
4. `features/charts/lib/blockRules.test.ts`
   - 至少覆盖正常值、空数据、范围回看、缺失参数、文本事项限制。

规则语义：

- `fixed`：不绑定事项；必须有值；单位可选。
- `latest`：范围内最后一条记录；文本事项只支持这个数值规则。
- `max` / `min`：范围内数值最大/最小。
- `loss`：范围内 `第一条 - 最后一条`。
- `change`：范围内 `最后一条 - 第一条`。
- `bmi`：`最后一条体重 / 身高(m)^2`。
- `distanceToTarget`：`最后一条 - 目标值`。
- 范围 `case`：跟随案例起止日期。
- 范围 `all`：全部历史，卡片显示「全部历史」和「含回看」。
- 范围 `lastDays`：以案例结束日前最后一条记录为终点，向前 N 天；允许回看到案例开始前，不能超过案例结束日。
- 所有计算实时读取日历数据，不把结果写进图表数据。

## 5. 图表渲染（5b 已完成）

入口：

```
ChartCard
  -> ChartRenderer
    -> EChart（line / bar / area，ECharts）
    -> TextTable（table）
    -> TextDistribution（distribution）
```

文件：

- `components/ChartCard.tsx`：标题、事项、类型切换、重置按钮、渲染容器。
- `components/charts/ChartRenderer.tsx`：按 `kind` / `chartType` 分发；数值图表用 `React.lazy` 加载 ECharts。
- `components/charts/EChart.tsx`：ECharts init / setOption / ResizeObserver / dispose；按需注册组件。
- `components/charts/TextTable.tsx`：日期 × 值表格，内部滚动。
- `components/charts/TextDistribution.tsx`：文本值计数横向条。
- `lib/chartData.ts`：纯数据构建。
- `lib/echartsOption.ts`：ECharts option、dataZoom、tooltip、坐标轴、柱状零基线。
- 根依赖 `echarts`；不要引入 `echarts-for-react`。

数据口径：

- `daily`：只取当天值，空值不补 0。
- `avg7` / `avg30`：每个案例日取向前 N 天平均，允许回看案例开始前；x 轴仍按案例区间。
- `changeRate`：只在有记录的日期计算，使用上一条记录，单位 `%`。
- 文本：只取案例区间内的字符串；表格按日期，分布按出现次数排序。
- 空区间 / 无数据：显示「区间内暂无数据」。
- `daily` 用事项颜色，其他指标用主题色板的不同颜色；实线/虚线/点线辅助区分，图例带颜色。
- 柱状图以 0 为基线；折线/面积按数据范围缩放。
- 横轴范围固定为案例起止日期；未来日期没有数据点但保留轴范围。
- 交互：滚轮缩放、拖拽平移、底部 slider、重置缩放；折线/柱状/面积切换只临时生效。
- ECharts 动画先关闭；主题阶段再统一定义图表主题和 token。

新增一种数值图表类型时：

1. `ChartType` / `NUMERIC_CHART_TYPES` / `validateChartTemplateDraft`。
2. `ChartTemplateModal` 的类型选项。
3. `CHART_TYPE_LABELS`。
4. `ChartRenderer` 分发分支和实际渲染组件。
5. `chartData.test.ts` 覆盖数据构建；`echartsOption.test.ts` 覆盖 series 类型、缩放、零基线。

## 6. 主题系统

主题入口在日历 header 右侧。切换后写入 `<html data-theme>` 和 localStorage；首屏内联脚本在 React 前恢复，避免闪白。

文件：

- `features/theme/theme.ts`：主题 ID、名称、色板、图表色板、默认值、localStorage、深色事件色提亮。
- `features/theme/ThemeProvider.tsx`：`data-theme`、`color-scheme`、meta theme-color、持久化。
- `features/theme/ThemeSwitcher.tsx`：header 菜单；入口带 `data-ignore-selection`，不触发日期选择清空。
- `index.css`：`@theme` 默认 token + `[data-theme]` 覆盖。
- `index.html`：首屏主题恢复脚本。

约定：

- 新组件只使用 token：`paper`、`sheet`、`ink`、`rule`、`blueprint`、`blueprint-soft`、`signal`、`muted-foreground`、`destructive`。
- 标题用 `--font-display`；控件圆角用 `--radius-control`；浮层阴影用 `--shadow-panel`。
- 不要在新组件里写死十六进制色值。
- ECharts canvas 不读 CSS 变量；`ChartCard` 用 `getChartTheme(theme)` 同步 option，Night 用 `resolveChartColor` 提亮事件色。
- 主题选择只存浏览器，不影响 `datas/*.json`。

新增主题步骤：

1. `THEME_IDS` / `THEME_DEFINITIONS` 加主题和 chart 色板。
2. `index.css` 加 `[data-theme="..."]` token（颜色、字体、圆角、阴影、color-scheme）。
3. `index.html` 内联允许列表加 ID。
4. ThemeSwitcher 自动读取定义，无需再写列表。
5. 视觉检查日历、图表、弹窗、移动端 320/390。

## 7. 动画

已实现：

- `index.css`：`motion-section-in`、`motion-case-in`、`motion-card-in`、`motion-drop-in`、`motion-popover-in`、`motion-fade-in`，Dialog 的 `data-state` 过渡。
- `ChartsSection`：IntersectionObserver 进入视口后加 `motion-section-in`；案例内容 key + `motion-case-in`。
- `CaseCanvas`：拖拽状态 `draggingFrom` / `dragOver` / `droppedSlot`，源卡片降透明度、目标高亮、放下回弹。
- `BlockCard`：`AnimatedValue` count-up，420ms。
- ECharts：option 的 `animation` 由 `useReducedMotion` 控制。
- 所有 CSS 动画受全局 `prefers-reduced-motion` 缩短；JS 动画单独检查。

约束：

- 只动画 opacity / transform，不动 height。
- 不要给日历网格加布局动画。
- 新增动画必须能在 reduced-motion 下关闭。

## 7. 提交前检查

```bash
pnpm calendar:test
pnpm typecheck
pnpm calendar:build
```

同时更新：

- `packages/calendar/README.md`（用户可见范围）
- `packages/calendar/AGENTS.md`（AI 约束）
- `prd/calendar.md`（需求进度）
- 本手册（如果扩展点变了）