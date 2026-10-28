# @ai-tiny-codes/calendar

满屏月历与事项记录。当前完成**阶段 4：编辑 + 日历事项展示 + 事件 CRUD**；图表框架待实现。

## 使用

```bash
pnpm calendar:dev       # http://localhost:5174
pnpm calendar:build
pnpm calendar:preview
pnpm calendar:test
```

## 阶段 4 范围

- Header：`‹ 年 月 ›` 和「回到今日」居中，模板按钮最右，图表不放在 header。
- 「回到今日」：非本月时高亮可点，本月时弱化/禁用。
- 日历事项展示：
  - 日期单独一行，`+N` 在左上角，日期在右上角。
  - 桌面格子宽 ≥170px 时两列，行数按屏幕动态计算；1440×900 约 2×4=8 条，1080p 约 2×5=10 条。
  - 移动端单列，390 宽约 5 条，320 宽按高度约 4 条。
  - 桌面显示 `色点 + 标题 + 值 + 单位`；移动端只显示 `色点 + 值`，避免窄格截断。
  - 事项按模板全局 `sortOrder` 排序，先左列后右列；超出显示 `+N`。
  - 今天用浅靛蓝底 + 靛蓝日期徽章，不再写“今天”文字。
- 单条编辑：当天已有事项列表 + 底部固定表单；数值模板显示单位，文本模板用 textarea；保存后留在弹窗。
- 多条编辑：连续日期显示区间，非连续日期显示 chips；逐日输入、已有值预填、统一填充、空值跳过。
- 多条已有事项：全选 / 逐条勾选 / 批量删除 / 行内确认；可切换模板继续填第二个事项。
- 清空：右键清空选中日期的全部事件，显示记录条数后二次确认。
- 弹窗统一 session draft：完成才写盘并刷新日历/图表；X 放弃并确认；遮罩不关闭；编辑弹窗与模板弹窗不叠加。
- 模板颜色：28 个更明亮的预设色 + 自定义取色面板。

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
      types.ts                    # CalendarData / 模板 / 规范化 / 校验
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
      TemplateForm.tsx            # 模板字段、使用次数、删除
      TemplateColorPicker.tsx     # 预设色 + 自定义取色
    lib/colors.ts
server/
  calendarDataPlugin.ts           # GET/PUT /api/calendar
datas/calendar/calendar.json      # 仓库内持久化数据
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
      "sortOrder": 0
    }
  ],
  "events": {
    "2026-10-27": {
      "weight": 75.2,
      "mood": "平静"
    }
  },
  "chartTemplates": []
}
```

- 每天每个模板最多一条记录，`events[date][code]` 天然唯一。
- 事件全局顺序由模板 `sortOrder` 决定，不在每日事件里单独存 order。
- 模板 `code` 自动生成、创建后只读；改标题不会影响事件。
- 删除模板会级联删除该模板的所有事件。
- `chartTemplates` 为阶段 5 预留。

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

- 单条编辑：双击日期或右键编辑；当天已有事项列表 + 添加/更新表单；保存后留在弹窗。
- 多条编辑：选中多个日期后右键编辑；逐日输入，每天可填不同值；统一填充是辅助，不强制同值。
- 多条删除：已有事项列表勾选后批量删除；单条删除在单条编辑里做。
- 清空：只清空选中日期的全部事件，二次确认。
- 编辑弹窗内不做拖动排序；全局顺序只在模板弹窗里通过拖拽调整。
- 所有编辑弹窗使用 session draft；完成才提交，X 放弃，遮罩不关闭。

## 设计

制图台 / Blueprint：

- 主色：纸白 `#F7F8FA`、单元格 `#FFFFFF`、墨黑 `#101828`、分隔线 `#D5DAE3`、靛蓝 `#1D3A8A`、信号橙 `#FF5A1F`。
- 字体：IBM Plex Sans（界面，中文回退 PingFang SC / 微软雅黑）+ IBM Plex Mono（年份与日期数字）。
- 满屏、无圆角、无阴影；细线网格。
- 选中态用 1px 橙色描边 + 淡橙底。
- 今天浅靛蓝底 + 靛蓝日期徽章。
- 事项色点使用明亮预设色；模板色同时用于图表。

## 数据持久化

- 开发/预览：Vite 中间件 `GET/PUT /api/calendar` 读写 `datas/calendar/calendar.json`。
- `configureServer` + `configurePreviewServer` 都支持。
- 静态部署：接口不可用或返回 404/405 时写 localStorage。
- 提交前 `normalizeCalendarData` 会修正排序、剔除无效模板和事件。
- 多机同时编辑同一 JSON 可能产生 git 冲突，建议一次只在一台机器写。