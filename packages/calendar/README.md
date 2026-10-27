# @ai-tiny-codes/calendar

满屏月历与事项记录。当前完成**阶段 3：模板 + 数据层 + 持久化**；编辑弹窗、日历事项展示和图表仍待实现。

## 使用

```bash
pnpm calendar:dev       # http://localhost:5174
pnpm calendar:build
pnpm calendar:preview
pnpm calendar:test
```

## 阶段 3 范围

- Header 改为三列：`‹ 年 月 ›` 和「回到今日」居中；模板按钮最右；图表不放 header，后续靠页面滚动。
- 左右切换分列年月两侧；「回到今日」按钮在非本月时高亮可点，已在本月时禁用/弱化。
- 事项模板弹窗：
  - 左侧模板列表 + 底部「新建模板」按钮，右侧表单 + 日历预览。
  - 左侧可拖动排序，写入全局 `sortOrder`；日历和图表后续都按这个顺序展示。
  - 字段：标题、自动生成的 code、数值/文本类型、单位、颜色、描述。
  - 颜色：28 个预设色块 + 自定义取色面板（饱和度/明度 + 色相滑条 + hex）。
  - 使用次数统计；已有记录时禁止改类型；删除模板会级联删除相关事件，并二次确认。
  - 标题校验显示在输入框下方并标红输入框，预留错误行高度，弹窗不会因报错突然变高。
  - 弹窗使用 session draft：点“完成”才写盘并统一刷新；X 放弃草稿（有改动先确认）；点遮罩不关闭；编辑弹窗与模板弹窗不叠加。
- `datas/calendar/calendar.json` 数据层：
  - `GET/PUT /api/calendar`，Vite dev/preview 中间件读写仓库内 JSON。
  - 静态环境降级 localStorage。
  - 原子写文件，JSON 格式化，方便手改和 git diff。
- 模板弹窗由 Header 最右按钮打开；模板数据在页面加载时读取。

编辑弹窗、事项 CRUD、日历事项展示、图表框架尚未实现。

## 目录

```
src/
  App.tsx
  main.tsx
  index.css                       # Tailwind v4 主题 + shadcn 变量
  components/ui/                  # Button / Select / ContextMenu / Dialog
  features/calendar/
    CalendarView.tsx              # 日历、选择、右键菜单、占位编辑弹窗
    components/                   # Header / WeekdayHeader / MonthGrid / DayCell
    data/
      types.ts                    # CalendarData / 模板 / 规范化 / 校验
      storage.ts                  # API + localStorage 读写
      CalendarDataProvider.tsx    # 全局数据、加载、commitData
      types.test.ts
    hooks/useMonthView.ts
    hooks/useCalendarSelection.ts
    lib/                          # monthGrid / selection / platform / date
  features/templates/
    TemplateModal.tsx             # 模板弹窗、草稿、完成/X、排序
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
      "code": "tpl_xxx",
      "title": "体重",
      "kind": "number",
      "unit": "kg",
      "color": "#0f766e",
      "desc": "",
      "sortOrder": 0
    }
  ],
  "events": {
    "2026-10-27": {
      "tpl_xxx": 75.2
    }
  },
  "chartTemplates": []
}
```

- 每天每个模板最多一条记录，`events[date][code]` 天然唯一。
- 全局事项顺序由模板 `sortOrder` 决定，不按日期单独存顺序。
- 模板 code 目前自动生成、创建后只读，保证历史事件不会因改名失联。
- 删除模板会级联删除该模板的所有事件。
- `chartTemplates` 为阶段 5 图表模板预留。

## 日期与网格口径

- 内部 `month` 为 0–11，展示时 +1。
- 日期键统一为本地 `YYYY-MM-DD`，不使用 `toISOString()`，避免 UTC 偏移。
- 每周从周日开始，网格向前补到周日、向后补到周六。
- 始终保证上下各有一周相邻月份上下文：月初是周日时再向前加一周，月末是周六时再向后加一周。
- 网格固定为 6 行：自然只有 5 行时向后补一周，避免不同月份格子高度变化。
- 年份选择范围默认 1970–2100，若当前视图超出范围会自动纳入。

## 选择交互口径

- 普通单击：选中该日期；若它已经是唯一选中项，再点一次取消选中。
- 多选状态下单击某个已选日期：收敛为只选该日期，再点一次取消。
- Shift：从锚点到点击日期连续选择；按住 Ctrl/⌘ 时改为并入现有选择。
- Ctrl（Windows/Linux）/ ⌘（macOS）：逐个加选或取消。
- 拖拽：按住左键从起点划到终点连续选择，松开结束；跨周、跨月均可。
- 右键：未选中的日期会先变成唯一选中，再打开菜单；已选中则保留当前多选。
- 点击日历以外区域（头部、星期栏等）清空选择；右键菜单和弹窗内部操作不会清空。
- 切换年月时自动清空选择。

## 设计

制图台 / Blueprint 方向：

- 主色：纸白 `#F7F8FA`、单元格 `#FFFFFF`、墨黑 `#101828`、分隔线 `#D5DAE3`、靛蓝 `#1D3A8A`、信号橙 `#FF5A1F`。
- 字体：IBM Plex Sans（界面，中文回退 PingFang SC / 微软雅黑）+ IBM Plex Mono（年份与日期数字）。
- 满屏、无圆角、无阴影；细线网格。
- 选中态用 1px 橙色描边 + 淡橙底。
- 模板色只做小色点，颜色可自定义；图表后续复用同一颜色。

## 数据持久化

- 开发/预览：Vite 中间件 `GET/PUT /api/calendar` 读写 `datas/calendar/calendar.json`。
- `configureServer` + `configurePreviewServer` 都支持。
- 静态部署：接口不可用或返回 404/405 时写 localStorage。
- 提交前 `normalizeCalendarData` 会修正排序、剔除无效模板和事件。
- 多机同时编辑同一 JSON 可能产生 git 冲突，建议一次只在一台机器写。