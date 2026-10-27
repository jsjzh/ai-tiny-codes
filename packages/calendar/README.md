# @ai-tiny-codes/calendar

满屏月历与事项记录。当前完成**阶段 2：日历框架 + 选择交互**，编辑弹窗与数据持久化仍为占位。

## 使用

```bash
pnpm calendar:dev       # http://localhost:5174
pnpm calendar:build
pnpm calendar:preview
pnpm calendar:test
```

## 阶段 2 范围

- 满屏 7 列月历，周日至周六，始终保留 5–6 行。
- 月份前后各保留一周上下文：上个月最后一周、下个月第一周，方便跨周计划。
- 顶部年份 / 月份选择、上 / 下月、回到今天。
- 非本月日期文字淡化；今天整块靛蓝填充。
- 单击选中；Shift 区间；Windows/Linux 用 Ctrl、macOS 用 ⌘ 逐个加选/取消。
- 鼠标按住拖动连续选择；支持键盘 Tab 聚焦后 Enter / Space 选择。
- 选中块用 1px 信号橙描边 + 淡橙底。
- 右键菜单：编辑 / 清空；清空有二次确认。
- 双击日期打开编辑弹窗占位。
- 切换月份时清空选择。

编辑弹窗、事项 CRUD、模板、图表尚未实现。

## 目录

```
src/
  App.tsx
  main.tsx
  index.css                       # Tailwind v4 主题 + shadcn 变量
  components/ui/                  # Button / Select / ContextMenu / Dialog
  features/calendar/
    CalendarView.tsx              # 选择、右键菜单、弹窗编排
    components/                   # Header / WeekdayHeader / MonthGrid / DayCell
    hooks/useMonthView.ts         # 当前年月、上/下月、今天
    hooks/useCalendarSelection.ts # 单击 / Shift / Ctrl·⌘ / 拖拽 / 右键锚点
    lib/monthGrid.ts              # 生成月网格（纯函数）
    lib/selection.ts              # 日期区间（纯函数）
    lib/platform.ts               # macOS 与 Windows 的修饰键差异
    lib/*.test.ts
    lib/date.ts                   # 星期/月份文案、年份范围
```

## 日期与网格口径

- 内部 `month` 为 0–11，展示时 +1。
- 日期键统一为本地 `YYYY-MM-DD`，不使用 `toISOString()`，避免 UTC 偏移。
- 每周从周日开始，网格向前补到周日、向后补到周六。
- 始终保证上下各有一周相邻月份上下文：月初是周日时再向前加一周，月末是周六时再向后加一周；因此固定为 5–6 行，不会出现 4 行空荡或 7 行过密。
- 年份选择范围默认 1970–2100，若当前视图超出范围会自动纳入。

## 选择交互口径

- 普通单击：只选中该日期，并把它记为后续 Shift 的锚点。
- Shift：从锚点到点击日期连续选择；按住 Ctrl/⌘ 时改为并入现有选择。
- Ctrl（Windows/Linux）/ ⌘（macOS）：逐个加选或取消。
- 拖拽：按住左键从起点划到终点连续选择，松开结束；跨周、跨月均可。
- 右键：未选中的日期会先变成唯一选中，再打开菜单；已选中则保留当前多选。
- 清空：二次确认后清空当前选择；阶段 3 接入事项数据后再真正删除事项。
- 切换年月时自动清空选择。

## 设计

制图台 / Blueprint 方向：

- 主色：纸白 `#F7F8FA`、单元格 `#FFFFFF`、墨黑 `#101828`、分隔线 `#D5DAE3`、靛蓝 `#1D3A8A`、信号橙 `#FF5A1F`。
- 字体：IBM Plex Sans（界面，中文回退 PingFang SC / 微软雅黑）+ IBM Plex Mono（年份与日期数字）。
- 满屏、无圆角、无阴影；细线网格；今天用唯一的大色块强调。
- 选中态用 1px 橙色描边 + 淡橙底，避免多选时橙色线过密。
- 清空确认使用语义红色，仅出现在危险操作弹窗。

## 数据持久化（阶段 3 实现）

浏览器不能直接写仓库文件，计划用 Vite 中间件：

- `GET/PUT /api/calendar` 读写 `datas/calendar/calendar.json`。
- `configureServer` + `configurePreviewServer`，开发与预览均可用。
- 保存防抖 + 临时文件原子替换，JSON 格式化，方便 git diff 与手改。
- 静态部署时降级 localStorage，并支持 JSON 导入/导出。
- 多机同时编辑同一 JSON 可能产生 git 冲突，建议一次只在一台机器写。