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
   - 当前只显示元信息；5b 在这里接真实图表。
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

## 5. 图表渲染（5b）

当前 `ChartCard` 是占位。5b 渲染时建议：

- 新建 `features/charts/components/charts/`，按图表类型拆分：
  - `LineChart.tsx`
  - `BarChart.tsx`
  - `AreaChart.tsx`
  - `TextTable.tsx`
  - `DistributionChart.tsx`
- 共享 `useChartSeries` / `buildChartData`：
  - 输入：`ChartTemplate`、`CalendarData`、`ChartCase` 的日期范围。
  - 数值：按日期取当天值；`daily` 画原始点；`avg7` / `avg30` 在案例开始前回看，但坐标轴仍从案例开始画到案例结束。
  - 文本：表格按日期 × 事项；分布按值计数。
  - 空值不要补 0；折线断点或跳过。
- 轴与颜色：
  - 颜色用事项模板 `color`。
  - 同单位多指标可共用 y 轴；`changeRate` 单独使用。
  - 横轴按案例区间，未来日期不画数据点但保留轴范围。
- 可访问性：
  - SVG 加 `role="img"` / `aria-label`。
  - 不只靠颜色区分指标；图例带文字。
  - 移动端横向滚动或自适应宽度，避免挤压。
- 测试：
  - 数据构建放纯函数，配 Vitest。
  - 不依赖浏览器尺寸测 SVG；只测数据、范围、空值、回看。

## 6. 新增主题 / 动画

见 `TODO.md`。主题和动画都排在 5b 之后，不要现在改现有 Blueprint 视觉。

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