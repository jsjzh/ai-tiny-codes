# ai-tiny-codes

存放一些 AI 帮我写的小工具，pnpm workspace 管理，纯 TypeScript，用 `tsx` 直接跑源码。

## 目录结构

```
packages/
  utils/    @ai-tiny-codes/utils   跨包公用工具（store / table / date / format）
  fitness/  @ai-tiny-codes/fitness 运动饮食减脂工具（减脂周期计算 + 饮食配比 + 打卡复盘）
  money/    @ai-tiny-codes/money   攒钱计划计算器
datas/      # 随项目保存的数据（如 fitness 的计划 JSON），方便上传与手改
```

## 环境

- Node.js（建议 18+）
- pnpm

## 使用

```bash
pnpm install
```

根目录提供的脚本：

| 命令 | 说明 |
| --- | --- |
| `pnpm fitness:calculate` | 减脂周期计算 |
| `pnpm fitness:food` | 每日饮食配比 + 一周采购清单 |
| `pnpm fitness:checkin` | 读取计划 JSON，校验并输出减脂复盘 |
| `pnpm money:calculate` | 攒钱计划计算器 |
| `pnpm typecheck` | 对所有 workspace 包执行 `tsc --noEmit` |

也可以进入某个包直接跑，例如：

```bash
pnpm --filter @ai-tiny-codes/money calculate
```

## 约定

- 第三方依赖统一在**根 `package.json`** 声明，子包按 Node 向上查找解析；只有 workspace 内部包才在子包 `package.json` 里用 `"workspace:*"` 声明。
- 各子包源码用 `tsx` 直接运行，`main` / `types` 指向 `src/index.ts`，无需构建产物。
- 交互统一用 `@inquirer/prompts`，表格统一用 `cli-table3`（封装在 `@ai-tiny-codes/utils`），终端颜色用 `chalk`（各包自建 style 模块，如 fitness 的 `src/checkin/style.ts`）。
- 用户记忆数据统一存在 `~/.ai-tiny-codes/<scope>/`，由 `@ai-tiny-codes/utils` 的 `createJsonStore(scope)` 管理。
- 需要随项目上传/手改的数据放仓库内 `datas/<scope>/`，用 `createJsonStore(scope, { baseDir })` 覆盖基目录（如 fitness 的计划 JSON）。

## 子项目文档

- 减脂工具：[`packages/fitness/README.md`](packages/fitness/README.md)、[`packages/fitness/AGENTS.md`](packages/fitness/AGENTS.md)
- 攒钱计算器：[`packages/money/README.md`](packages/money/README.md)
