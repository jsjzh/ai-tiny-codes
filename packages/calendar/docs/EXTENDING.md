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

## 2. 事项模板与字段

事项模板在 UI 里创建：日历 header「模板」->「新建模板」。

数值模板字段：

| 字段 | 含义 |
| --- | --- |
| `code` | 唯一键，自动生成，创建后稳定 |
| `title` | 日历与图表显示名 |
| `kind` | `number` / `text` |
| `unit` | 兼容默认单位 |
| `color` | 日历色点 + 默认字段色 |
| `fields` | 数值字段数组；文本为空 |
| `desc` / `sortOrder` | 说明 / 全局顺序 |

`NumericField`：

```ts
{
  code, label, unit, color,
  kind: "input" | "formula",
  formula?: string,
  showInCalendar: boolean
}
```

- 手动字段存事件值；公式字段由 `lib/formula.ts` 实时计算，支持 `+ - * / ( )` 和字段引用，不使用 `eval`。
- 公式字段不写入事件数据；例如饮食热量 `carbs * 4 + protein * 4 + fat * 9`。
- 单输入字段事件保持标量；多输入字段存 `{ fieldCode: number }`。旧单值数据继续兼容。
- 新增字段时旧标量映射到第一个 input 字段；数据规范化在 `normalizeCalendarData`。
- 日历显示用 `showInCalendar` 过滤；多字段事件会占用整行，避免两列截断。
- 字段 code 不要手改；字段 label/unit/color 可改。

事项导入/导出：

- 模板表单「导入数据」/「导出数据」。
- JSON 支持 `logs`、对象数组、日期映射、多字段对象；CSV 支持 `date,value` 或多字段列。
- 导入按日期覆盖当前模板，保留同日其他事项；空值/无效值跳过；只改草稿，点「完成」写盘。
- 公式字段不导入，读取时计算。
- 完整备份见 `features/backup/backup.ts`，导入直接覆盖日历 + 图表。

## 3. 图表模板

图表模板在图表区「图表模板」里创建。一个模板只绑定一个事项；当前不做多事项同图。

```ts
type ChartSeriesSpec = {
  fieldCode: string;
  operation: "raw" | "rolling" | "cumulative" | "deltaFromStart" | "percentChange";
  window?: number;
};

type ChartTemplate = {
  code: string;
  title: string;
  eventCode: string;
  kind: "numeric" | "text";
  chartType: "line" | "bar" | "area" | "table" | "distribution";
  analysis?:
    | "series"
    | "cumulative"
    | "monthlyDelta"
    | "weeklyDelta"
    | "weekdayAverage"
    | "distribution"
    | "recordQuality"
    | "calendar";
  analysisFields?: string[];
  series?: ChartSeriesSpec[];
  stacked?: boolean;
  // 兼容旧数据：metrics?: NumericMetricCode[]
  desc: string;
  sortOrder: number;
};
```

修改位置：

1. `features/charts/data/types.ts`：`ChartSeriesSpec`、`getChartSeries`、规范化、校验。
2. `features/charts/ChartTemplateModal.tsx`：系列行（字段/操作/窗口）、堆叠开关、文本类型。
3. `features/charts/lib/chartData.ts`：按字段 + 操作生成数据。
4. `features/charts/lib/echartsOption.ts`：图例、颜色、堆叠、tooltip、缩放。
5. `features/charts/components/ChartCard.tsx`：字段单位、系列数、临时类型/堆叠切换、重置。
6. 测试：`chartData.test.ts` / `echartsOption.test.ts`。

规则：

- 数值事项支持 `line|bar|area`；文本支持 `table|distribution`。
- `raw` 只取当天值；`rolling` 用自定义窗口并允许回看案例前；`cumulative` 是案例内累计合计；`deltaFromStart` 是相对案例首个记录的变化；`percentChange` 只独立成图。
- 同一张图只允许同单位字段；`g` 和 `kcal` 分图。
- 多字段默认用字段颜色；同字段多操作使用主题色板 + 线型区分，图例名称带统计方式和窗口。
- 图表模板删除按案例去重提示，并清空所有案例中的对应图表；草稿同步清理。
- 事项模板删除后保留图表并显示「引用的事项已删除」。
### 基础分析预设

- `analysis` 缺省为 `series`；`analysisFields` 缺省回退到系列字段。
- 累计变化：`cumulative`，以区间首条记录为 0 点。
- 月度/周净变化：`monthlyDelta` / `weeklyDelta`，按自然桶取最后值减首值；周桶首尾裁到案例区间。
- 周内平均：`weekdayAverage`，按周一至周日分组求均值。
- 数值分布：`distribution`，单字段等宽分桶，统计记录条数。
- 每月记录天数：`recordQuality`，按事项是否有记录计数，不要求字段。
- 记录日历：`calendar`，由 `RecordHeatmap` 直接渲染，不构建 ECharts option，不要求字段。
- 非趋势分析固定柱状；累计变化可切折线/柱状/面积；多字段分析必须同单位。
- 文本轴数据设 `NumericChartData.xMode = "text"`，`echartsOption.ts` 不再按日期格式化。
- 修改位置：`ChartAnalysis`/`getChartAnalysis`/`getAnalysisFieldCodes`、`buildAnalysisChartData`、`ChartTemplateModal` 分析选择与字段 chips、`ChartCard` 分析控件、`ChartRenderer` 分发、`RecordHeatmap`。
- 新增分析时要补 `chartData.test.ts` 的桶边界/空数据测试，并更新 `CHART_ANALYSIS_LABELS`、README、TODO。

## 4. 块

块在案例编辑器里创建，没有全局块模板库。

通用聚合：

```ts
type BlockRule = {
  type:
    | "fixed"
    | "latest"
    | "first"
    | "sum"
    | "average"
    | "max"
    | "min"
    | "count"
    | "streak"
    | "delta";
  fieldCode?: string;
  direction?: "last-first" | "first-last";
  value?: string;
  unit?: string;
  range?: { type: "case" } | { type: "all" } | { type: "lastDays"; days: number };
};
```

- `fieldCode` 选择字段（含公式字段）；文本事项支持 `latest`/`count`。
- `delta` 方向：`last-first` 或 `first-last`。
- 旧 `loss/change/bmi/distanceToTarget` 只作兼容读取；BMI/距离目标应改成公式字段 + `latest`。
- 范围 `case` 使用案例有效范围；`all` 全部历史；`lastDays` 以案例结束日前最后记录为终点，允许回看案例开始前。
- 计算在 `lib/blockRules.ts`，保持纯函数并配 `blockRules.test.ts`。
- 旧数据迁移：BMI/距离目标块已转成公式字段 + `latest`；旧块仍能读取。

## 5. 图表渲染

入口：

```
ChartCard
  -> ChartRenderer
    -> EChart（line / bar / area，ECharts）
    -> TextTable（table）
    -> TextDistribution（distribution）
```

- `EChart.tsx`：ECharts init / setOption / ResizeObserver / dispose；按需注册。
- `chartData.ts`：通用系列数据构建。
- `echartsOption.ts`：option、dataZoom、tooltip、坐标轴、堆叠。
- `caseRange.ts`：`rangeMode` 有效范围；图表、块、`lastDays` 共用。
- 图表交互：滚轮缩放、拖拽平移、slider、重置、类型切换、堆叠切换。
- ECharts 动画由 `useReducedMotion` 控制；主题通过 `getChartTheme` / `resolveThemeColor` 同步。
- 文本图表继续用 React 表格/分布，不进 ECharts。

## 6. 主题系统

主题入口在日历 header 右侧。切换后写入 `<html data-theme>` 和 localStorage；首屏内联脚本在 React 前恢复，避免闪白。

文件：

- `features/theme/theme.ts`：主题 ID、名称、色板、`chart.palette` 图表系列色板、默认值、localStorage、深色事件色提亮。
- `features/theme/ThemeProvider.tsx`：`data-theme`、`color-scheme`、meta theme-color、持久化。
- `features/theme/ThemeSwitcher.tsx`：header 菜单；入口带 `data-ignore-selection`，不触发日期选择清空。
- `index.css`：`@theme` 默认 token + `[data-theme]` 覆盖。
- `index.html`：首屏主题恢复脚本。

约定：

- 新组件只使用 token：`paper`、`sheet`、`ink`、`rule`、`blueprint`、`blueprint-soft`、`signal`、`muted-foreground`、`destructive`。
- 标题用 `--font-display`；控件圆角用 `--radius-control`；浮层阴影用 `--shadow-panel`。
- 不要在新组件里写死十六进制色值。
- ECharts canvas 不读 CSS 变量；`ChartCard` 用 `getChartTheme(theme)` 同步 option。系列/图例颜色取 `theme.palette`，滚动平均/变化率取 `theme.avg7/avg30/changeRate`；日历事项色点用 `resolveThemeColor` 提亮。
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

## 8. 数据备份

- header「数据」按钮：`features/backup/DataBackupButton.tsx`。
- 完整备份结构：

```json
{
  "app": "ai-tiny-codes/calendar-backup",
  "version": 1,
  "exportedAt": "2026-10-29T...",
  "calendar": {},
  "charts": {}
}
```

- `backup.ts` 负责创建、下载和解析；解析后走 `normalizeCalendarData` / `normalizeChartsData`。
- 导入前显示覆盖预览，确认后直接覆盖；不提供逐项冲突策略。
- 先写日历再写图表；失败时尝试恢复导入前数据。
- 完整备份不包含主题偏好（主题仍在 localStorage）。

## 9. 提交前检查

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