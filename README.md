# ai-tiny-codes

存放一些 AI 帮我写的小工具，pnpm workspace 管理。CLI 工具用 TypeScript + `tsx` 直接跑源码；日历是 Vite + React 前端。

## 目录结构

```
packages/
  utils/      @ai-tiny-codes/utils      跨包公用工具（store / table / date / format）
  fitness/    @ai-tiny-codes/fitness    减脂工具（减脂周期计算 + 打卡复盘 + 体重大盘）
  money/      @ai-tiny-codes/money      攒钱计划计算器
  keepstrong/ @ai-tiny-codes/keepstrong 练练健身（KeepStrong）AI API 轻量客户端
  commute/    @ai-tiny-codes/commute    通勤方式（地铁/开车/摩托）年花费对比
  calendar/   @ai-tiny-codes/calendar   满屏月历与事项记录（Vite + React，阶段 1–5b + 主题 + 动画：框架 + 选择 + 模板/数据 + 编辑 + 图表 + 主题）
datas/      # 随项目保存的数据（fitness 计划/同步数据、生成的大盘、日历/图表数据），方便上传与手改
.opencode/  # opencode 项目配置（skills：frontend-design 等）
```

## 环境

- Node.js（建议 22.12+，Vite 8 / Vitest 5 要求）
- pnpm

## 使用

```bash
pnpm install
```

根目录提供的脚本：

| 命令 | 说明 |
| --- | --- |
| `pnpm fitness:calculate` | 减脂周期计算 |
| `pnpm fitness:checkin` | 读取计划 JSON，校验并输出减脂复盘 |
| `pnpm fitness:sync` | 从练练健身拉取数据写入 `datas/fitness/synced`（默认体重、近 1 年；`--days`/`--all`/`--from`/`--to`/`--dry-run`） |
| `pnpm fitness:dashboard` | 生成网页大盘 `datas/fitness/dashboard/index.html`（单页两 Tab：体重大盘 / 打卡复盘；深色切换、CSV 导出） |
| `pnpm fitness:update` | 一键刷新：`fitness:sync` + `fitness:dashboard` |
| `pnpm money:calculate` | 攒钱计划计算器 |
| `pnpm commute:compare` | 通勤方式年花费对比（改 `packages/commute/entry/commute.ts` 顶部配置） |
| `pnpm keepstrong:probe` | 练练健身 API 连通性探测（读取根 `.env.local`） |
| `pnpm calendar:dev` | 启动日历开发服务器（http://localhost:5174） |
| `pnpm calendar:build` | 构建日历静态产物 |
| `pnpm calendar:preview` | 预览日历构建产物 |
| `pnpm calendar:test` | 运行日历、事件、图表数据、块规则与导入单测 |
| `pnpm typecheck` | 对所有 workspace 包执行类型检查 |

也可以进入某个包直接跑，例如：

```bash
pnpm --filter @ai-tiny-codes/money calculate
```

## 约定

- 第三方依赖统一在**根 `package.json`** 声明，子包按 Node 向上查找解析；只有 workspace 内部包才在子包 `package.json` 里用 `"workspace:*"` 声明。
- 各 CLI 子包源码用 `tsx` 直接运行，`main` / `types` 指向 `src/index.ts`，无需构建产物。
- `calendar` 是 Vite + React + Tailwind + shadcn 前端，依赖同样统一在根 `package.json`，包内用 `@/` 指向 `src/`。
- 交互统一用 `@inquirer/prompts`，表格统一用 `cli-table3`（封装在 `@ai-tiny-codes/utils`），终端颜色用 `chalk`（各包自建 style 模块，如 fitness 的 `src/checkin/style.ts`）。
- 用户记忆数据统一存在 `~/.ai-tiny-codes/<scope>/`，由 `@ai-tiny-codes/utils` 的 `createJsonStore(scope)` 管理。
- 需要随项目上传/手改的数据放仓库内 `datas/<scope>/`，用 `createJsonStore(scope, { baseDir })` 覆盖基目录（如 fitness 的计划 JSON）。

## 子项目文档

- 减脂工具：[`packages/fitness/README.md`](packages/fitness/README.md)、[`packages/fitness/AGENTS.md`](packages/fitness/AGENTS.md)
- 攒钱计算器：[`packages/money/README.md`](packages/money/README.md)
- 练练健身 API 客户端：[`packages/keepstrong/README.md`](packages/keepstrong/README.md)
- 通勤花费对比：[`packages/commute/README.md`](packages/commute/README.md)
- 日历：[`packages/calendar/README.md`](packages/calendar/README.md)、[`packages/calendar/AGENTS.md`](packages/calendar/AGENTS.md)、[`扩展手册`](packages/calendar/docs/EXTENDING.md)、[`待办`](packages/calendar/TODO.md)
