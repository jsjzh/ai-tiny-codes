# @ai-tiny-codes/calendar

满屏月历与事项记录。当前为**阶段 1：日历框架**，只做展示与导航。

## 使用

```bash
pnpm calendar:dev       # http://localhost:5174
pnpm calendar:build
pnpm calendar:preview
pnpm calendar:test
```

## 阶段 1 范围

- 满屏 7 列月历，周日至周六。
- 顶部年份 / 月份选择、上 / 下月、回到今天。
- 月份前后补齐到完整周，行数随月份在 4–6 行之间变化。
- 非本月日期文字淡化；今天整块靛蓝填充。
- 不做选中、右键菜单、编辑弹窗（阶段 2 起）。

## 目录

```
src/
  App.tsx
  main.tsx
  index.css                       # Tailwind v4 主题 + shadcn 变量
  components/ui/                  # Button / Select
  features/calendar/
    CalendarView.tsx
    components/                   # Header / WeekdayHeader / MonthGrid / DayCell
    hooks/useMonthView.ts         # 当前年月、上/下月、今天
    lib/monthGrid.ts              # 生成月网格（纯函数）
    lib/monthGrid.test.ts
    lib/date.ts                   # 星期/月份文案、年份范围
```

## 日期口径

- 内部 `month` 为 0–11，展示时 +1。
- 日期键统一为本地 `YYYY-MM-DD`，不使用 `toISOString()`，避免 UTC 偏移。
- 每周从周日开始，网格向前补到周日、向后补到周六。
- 年份选择范围默认 1970–2100，若当前视图超出范围会自动纳入。

## 设计

制图台 / Blueprint 方向：

- 主色：纸白 `#F7F8FA`、单元格 `#FFFFFF`、墨黑 `#101828`、分隔线 `#D5DAE3`、靛蓝 `#1D3A8A`、信号橙 `#FF5A1F`（阶段 2 选中态）。
- 字体：IBM Plex Sans（界面，中文回退 PingFang SC / 微软雅黑）+ IBM Plex Mono（年份与日期数字）。
- 满屏、无圆角、无阴影；细线网格；今天用唯一的大色块强调。

## 数据持久化（阶段 3 实现）

浏览器不能直接写仓库文件，计划用 Vite 中间件：

- `GET/PUT /api/calendar` 读写 `datas/calendar/calendar.json`。
- `configureServer` + `configurePreviewServer`，开发与预览均可用。
- 保存防抖 + 临时文件原子替换，JSON 格式化，方便 git diff 与手改。
- 静态部署时降级 localStorage，并支持 JSON 导入/导出。
- 多机同时编辑同一 JSON 可能产生 git 冲突，建议一次只在一台机器写。