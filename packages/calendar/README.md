# @ai-tiny-codes/calendar

满屏月历与事项记录。当前完成**通用字段/公式 + 多值事项 + 全部历史案例 + 通用图表/块 + 主题/动画/备份**。

- 扩展手册：[`docs/EXTENDING.md`](docs/EXTENDING.md)
- 其他待办：[`TODO.md`](TODO.md)
## 使用

```bash
pnpm calendar:dev       # http://localhost:5174
pnpm calendar:build
pnpm calendar:preview
pnpm calendar:test
```

## 通用图表范围

- 图表 section 接在日历下方，全宽，页面纵向滚动进入；header 不放图表按钮。
- 图表数据独立存 `datas/charts/charts.json`，通过 `/api/charts` 读写；只读取日历事项和事件。
- 数值事项模板支持 1–N 个字段：手动字段和公式字段；公式支持安全四则运算和字段引用。
- 案例支持 `custom` 和 `all` 范围；`all` 自动取所选事项的最早到最新记录。
- 图表模板绑定单个事项，支持多个字段/多个统计系列；统计包括原始值、滚动窗口、累计合计、累计变化、百分比变化。
- 图表类型：折线/柱状/面积；多系列可并排或临时切换堆叠。
- 块在案例内创建/编辑：字段 + 通用聚合（latest/first/sum/average/max/min/count/streak/delta/fixed），范围支持案例、全部历史、近 N 天。
- BMI、距离目标等旧规则已迁移为公式字段 + `latest`。
- 原生 HTML5 拖拽移动内容或从模板面板复制图表；移动端槽位单列。
- 数值图表使用 ECharts 6，按需注册并动态加载；支持滚轮缩放、拖拽平移、缩放条、重置和临时切换折线/柱状/面积。

## 事项数据导入

- 模板弹窗选中模板后，表单底部「导入数据」。
- 支持 JSON / CSV；JSON 可导入 `logs`、对象数组、日期→值，也支持多字段对象；CSV 支持 `date,value` 或多字段列。
- 按日期覆盖当前模板，保留同日其他事项；多字段导入只合并字段输入值，公式字段自动计算；无效日期/值、空值跳过，重复日期保留最后一条。
- 导入只改模板弹窗草稿，点「完成」才写盘；已有记录时类型会锁定。
- 文件带单位而模板单位为空时，导入弹窗会提示补单位。

## 主题

- 日历 header 右侧「主题」入口，5 套主题：
  - `blueprint` 制图台：冷白纸 / 靛蓝 / 信号橙（默认）
  - `warm` 暖纸编辑部：燕麦纸 / 陶土 / 苔藓绿
  - `night` 夜航仪表盘：近黑 / 石墨 / 电光蓝
  - `botanical` 苔原笔记：鼠尾草 / 奶油白 / 黏土
  - `swiss` 瑞士信号：纯白 / 黑 / 红
- 主题用 `<html data-theme>` + CSS token 切换，存 localStorage；首屏内联脚本避免闪烁。
- 标题字体、控件圆角、浮层阴影、颜色全部来自 token；新增组件不要写死颜色。
- ECharts canvas 不继承 CSS 变量，图表配色由 `getChartTheme` 同步；Night 主题会自动提亮字段颜色。
- 主题只影响显示，不写入日历/图表 JSON。

## 动画

- 图表 section 进入视口时轻微淡入 / 上移；不阻塞首屏。
- 切换案例内容淡入，槽位卡片 30ms stagger。
- ECharts 折线/柱子入场动画；Block 数值 count-up。
- 拖拽时源卡片降透明度、目标槽位高亮、放下回弹。
- Dialog / 行内确认 120–180ms 过渡；主题菜单淡入。
- 只动画 opacity / transform，不改变高度；`prefers-reduced-motion` 下关闭位移、count-up 和图表动画。

## 阶段 4 范围

- Header：`‹ 年 月 ›` 和「回到今日」居中，右侧为主题 + 数据 + 模板按钮，图表不放在 header。
- 「回到今日」：非本月时高亮可点，本月时弱化/禁用。
- 日历事项展示：
  - 日期单独一行，`+N` 在左上角，日期固定在右上角；日期与事项之间保留平衡间距。
  - 桌面格子宽 ≥170px 时两列，行数按屏幕动态计算；1440×900 约 2×4=8 条，1080p 约 2×5=10 条。
  - 移动端单列，390 宽约 5 条，320 宽按高度约 4 条。
  - 单字段显示 `色点 + 标题 + 值 + 单位`；多字段紧凑显示 `180/120/60g·1740kcal`；含多字段事项的日期自动单列。
  - 事项按模板全局 `sortOrder` 排序，先左列后右列；超出显示 `+N`。
  - 今天用浅靛蓝底 + 靛蓝日期徽章，不再写“今天”文字。
- 单条编辑：当天已有事项列表 + 底部固定表单；数值模板按字段输入、公式字段只读；文本模板用 textarea；保存后留在弹窗。
- 多条编辑：连续日期显示区间，非连续日期显示 chips；选择字段后逐日输入/统一填充，保存时合并其他字段。
- 多条已有事项：全选 / 逐条勾选 / 批量删除 / 行内确认；可切换模板继续填第二个事项。
- 清空：右键清空选中日期的全部事件，显示记录条数后二次确认。
- 弹窗统一 session draft：完成才写盘并刷新日历/图表；X 放弃并确认；遮罩不关闭；编辑弹窗与模板弹窗不叠加。
- 模板颜色：28 个更明亮的预设色 + 自定义取色面板；新建模板标题按 `新事项 N` 递增，颜色随机取明亮预设色。

## 目录

```
src/
  App.tsx
  main.tsx
  index.css                       # Tailwind v4 主题 + shadcn 变量
  components/ui/                  # Button / Select / ContextMenu / Dialog
  features/calendar/
    CalendarView.tsx              # 日历、选择、右键菜单、清空
    components/                   # Header / WeekdayHeader / MonthGrid / DayCell
    data/
      types.ts                    # CalendarData / 模板字段 / 公式字段 / 规范化
      events.ts                   # 事件 upsert / 删除 / 解析 / 格式化
      storage.ts                  # API + localStorage 读写
      CalendarDataProvider.tsx    # 全局数据、加载、commitData
      *.test.ts
    hooks/useMonthView.ts
    hooks/useCalendarSelection.ts
    lib/
      monthGrid.ts                # 月网格
      selection.ts                # 日期区间
      dateRange.ts                # 连续区间 / 非连续日期摘要
      eventLayout.ts              # 动态可见条数
      formula.ts                  # 安全公式解析与计算
      platform.ts                 # macOS / Windows 修饰键
  features/events/
    EventEditModal.tsx            # 单条/多条编辑、草稿、完成/X
    components/
      SingleDateEditor.tsx        # 已有列表 + 底部表单
      MultiDateEditor.tsx         # 逐日输入 + 勾选删除
      TemplateSelect.tsx
  features/templates/
    TemplateModal.tsx             # 模板弹窗、草稿、完成/X、全局排序
    components/
      TemplateList.tsx            # dnd-kit 可拖动列表
      TemplateForm.tsx            # 模板字段、使用次数、导入、删除
      NumericFieldsEditor.tsx     # 手动/公式字段增删
      TemplateColorPicker.tsx     # 预设色 + 自定义取色
      ImportEventsDialog.tsx      # JSON / CSV 导入预览与确认
    lib/colors.ts
    lib/importEvents.ts           # 事项导入解析、日期/值规范化
  features/charts/
    ChartsSection.tsx             # 图表区、案例查看/编辑、模板入口
    CaseEditor.tsx                # 案例元数据、组件面板、槽位画布
    ChartTemplateModal.tsx        # 独立图表模板管理
    BlockEditorDialog.tsx         # 块规则、范围、预览
    components/
      CaseCanvas.tsx              # 行/槽位、原生拖拽、高度
      BlockCard.tsx               # 块取值展示
      ChartCard.tsx               # 图表元信息、类型切换、重置
      ChartTemplateList.tsx       # dnd-kit 图表模板排序
      charts/
        ChartRenderer.tsx         # 按模板类型分发
        EChart.tsx                # ECharts init/dispose/resize
        TextTable.tsx             # 文本对照表
        TextDistribution.tsx      # 文本分布
    data/
      types.ts                    # 图表模板/案例/块、规范化、使用计数
      storage.ts                  # API + localStorage
      ChartsDataProvider.tsx      # 图表数据、加载、commitData
      *.test.ts
    lib/
      blockRules.ts               # 块取值规则
      chartData.ts                # 通用系列/字段数据构建
      caseRange.ts                # custom/all 有效范围
      echartsOption.ts            # ECharts option、缩放、tooltip
      widgetLayout.ts             # 高度与拖拽 MIME
  features/theme/
    theme.ts                      # 主题定义、图表色板、localStorage
    ThemeProvider.tsx             # data-theme、持久化
    ThemeSwitcher.tsx             # header 主题菜单
  features/backup/
    backup.ts                     # 完整备份创建 / 解析 / 下载
    DataBackupButton.tsx          # header 数据入口与备份弹窗
server/
  dataPlugins.ts                  # GET/PUT /api/calendar + /api/charts
datas/calendar/calendar.json      # 日历持久化数据
datas/charts/charts.json          # 图表持久化数据
```

## 数据模型

```json
{
  "version": 1,
  "templates": [
    {
      "code": "weight",
      "title": "体重",
      "kind": "number",
      "unit": "kg",
      "color": "#2563eb",
      "desc": "晨起空腹",
      "sortOrder": 0,
      "fields": [
        { "code": "value", "label": "体重", "unit": "kg", "kind": "input", "showInCalendar": true }
      ]
    },
    {
      "code": "diet",
      "title": "饮食",
      "kind": "number",
      "unit": "kcal",
      "color": "#f97316",
      "desc": "",
      "sortOrder": 1,
      "fields": [
        { "code": "carbs", "label": "碳水", "unit": "g", "kind": "input", "showInCalendar": true },
        { "code": "protein", "label": "蛋白质", "unit": "g", "kind": "input", "showInCalendar": true },
        { "code": "fat", "label": "脂肪", "unit": "g", "kind": "input", "showInCalendar": true },
        { "code": "calories", "label": "热量", "unit": "kcal", "kind": "formula", "formula": "carbs*4+protein*4+fat*9", "showInCalendar": true }
      ]
    }
  ],
  "events": {
    "2026-10-27": {
      "weight": 75.2,
      "diet": { "carbs": 180, "protein": 120, "fat": 60 }
    }
  },
  "chartTemplates": []
}
```

- 每天每个模板最多一条记录，`events[date][code]` 天然唯一。
- 事件全局顺序由模板 `sortOrder` 决定，不在每日事件里单独存 order。
- 模板 `code` 自动生成、创建后只读；改标题不会影响事件。
- 删除模板会级联删除该模板的所有事件；图表中的引用会显示为软失效。
- 日历数据里的 `chartTemplates` 是早期兼容字段，当前不使用；图表模板全部在独立文件中。
- 图表数据独立存储，结构如下：

```json
{
  "version": 1,
  "templates": [
    {
      "code": "weight-overview",
      "title": "体重概览",
      "eventCode": "weight",
      "kind": "numeric",
      "chartType": "line",
      "series": [
        { "fieldCode": "value", "operation": "raw" },
        { "fieldCode": "value", "operation": "rolling", "window": 7 },
        { "fieldCode": "value", "operation": "rolling", "window": 30 }
      ],
      "stacked": false,
      "desc": "每日体重与均线",
      "sortOrder": 0
    }
  ],
  "cases": [
    {
      "id": "case_demo",
      "name": "减脂 8.1–10.28",
      "startDate": "2026-08-01",
      "endDate": "2026-10-28",
      "rangeMode": "custom",
      "eventCodes": ["weight"],
      "rows": [
        {
          "slots": [
            {
              "kind": "block",
              "height": 1,
              "block": {
                "id": "b_latest",
                "title": "最新体重",
                "info": "",
                "eventCode": "weight",
                "rule": { "type": "latest", "fieldCode": "value", "range": { "type": "case" } }
              }
            }
          ]
        }
      ],
      "createdAt": "2026-08-01T00:00:00.000Z",
      "updatedAt": "2026-10-28T00:00:00.000Z"
    }
  ]
}
```

- 图表模板只通过 `eventCode` 关联事项，不写入日历数据；案例通过 `eventCodes` 筛选可拖拽模板。
- 公式字段不存储结果，读取时计算；多输入字段的事件值是字段对象，单输入字段保持标量以兼容旧数据。

## 日期与网格口径

- 内部 `month` 为 0–11，展示时 +1。
- 日期键统一为本地 `YYYY-MM-DD`，不使用 `toISOString()`，避免 UTC 偏移。
- 每周从周日开始，网格向前补到周日、向后补到周六。
- 始终保证上下各有一周相邻月份上下文；网格固定 6 行，自然 5 行时向后补一周。
- 年份选择范围默认 1970–2100。

## 选择交互口径

- 普通单击：选中该日期；唯一选中项再点一次取消。
- 多选状态下单击某个已选日期：收敛为只选该日期。
- Shift：从锚点到点击日期连续选择；Ctrl/⌘ 时并入现有选择。
- Ctrl（Windows/Linux）/ ⌘（macOS）：逐个加选或取消。
- 拖拽：按住左键从起点划到终点连续选择，跨周、跨月均可。
- 右键：未选中的日期先变成唯一选中，再打开菜单；已选中则保留多选。
- 点击日历以外区域清空选择；右键菜单和弹窗内部操作不会清空。
- 切换年月时自动清空选择。

## 事件与编辑口径

- 单条编辑：双击日期或右键编辑；当天已有事项列表 + 添加/更新表单；数值模板按字段渲染多个输入，公式字段只读；保存后留在弹窗。
- 多条编辑：选中多个日期后右键编辑；选择数值字段后逐日输入，或统一填充；保存时与已有其他字段合并。
- 多条删除：已有事项列表勾选后批量删除；单条删除在单条编辑里做。
- 清空：只清空选中日期的全部事件，二次确认。
- 编辑弹窗内不做拖动排序；全局顺序只在模板弹窗里通过拖拽调整。
- 所有编辑弹窗使用 session draft；完成才提交，X 放弃，遮罩不关闭。

## 图表口径

- 案例是查看单位：保存日期范围、事项筛选和槽位布局；`rangeMode: "all"` 时自动使用所选事项的数据范围。
- 案例编辑使用草稿，保存后统一刷新；另存为生成副本；取消丢弃草稿。
- 槽位高度：块 1–2、图表 1–4；行高取本行最大值，空槽在查看态保留占位。
- 块取值实时计算，不存计算结果；`lastDays` 以案例结束日前最后一条记录为终点，允许回看案例开始前。
- 图表系列：
  - `raw`：只取当天值，空值不补 0。
  - `rolling`：自定义窗口，允许回看案例开始前；x 轴仍按案例区间。
  - `cumulative`：案例内累计合计；`deltaFromStart`：相对案例首个记录的变化。
  - `percentChange`：只在有记录的日期计算，单独成图。
  - 多字段按字段色区分；同字段多统计按主题色板区分；图例显示字段 + 统计 + 窗口。
- 文本：日期对照表 / 值分布。
- 图表卡片支持滚轮缩放、拖拽平移、底部缩放条、重置缩放；折线/柱状/面积切换和堆叠切换只临时生效。
- 空区间、缺失模板、事项失效都有明确空/错误状态。

## 设计

默认 Blueprint：

- 主色：纸白 `#F7F8FA`、单元格 `#FFFFFF`、墨黑 `#101828`、分隔线 `#D5DAE3`、靛蓝 `#1D3A8A`、信号橙 `#FF5A1F`。
- 字体：IBM Plex Sans（界面，中文回退 PingFang SC / 微软雅黑）+ IBM Plex Mono（年份与日期数字）。
- 满屏、无圆角、无阴影；细线网格。
- 选中态用 1px 橙色描边 + 淡橙底。
- 今天浅靛蓝底 + 靛蓝日期徽章。
- 事项色点使用明亮预设色；模板色同时用于图表。

其他主题共用组件与 token，只替换颜色、标题字体、控件圆角、浮层阴影和图表配色。

## 数据持久化

- 开发/预览：Vite 中间件 `GET/PUT /api/calendar` 读写 `datas/calendar/calendar.json`，`GET/PUT /api/charts` 读写 `datas/charts/charts.json`。
- `configureServer` + `configurePreviewServer` 都支持。
- 静态部署：接口不可用或返回 404/405 时分别写 localStorage；静态页面不能直接写仓库 `datas` 文件，数据只存在当前浏览器。
- 提交前 `normalizeCalendarData` / 图表规范化会修正排序、剔除无效模板和事件。
- 多机同时编辑同一 JSON 可能产生 git 冲突，建议一次只在一台机器写。
