# 项目：运动饮食减脂工具（fitness）

用 TypeScript 编写。仓库唯一业务说明文档是 README.md（减脂方法论来自视频总结），但架构与最新决策以本文件为准。

## 运行方式（三个独立入口/域名）
- `npm run calculate`：减脂周期计算（BMR → 热量 → 宏量档位 → 周/月目标 → 达成日期），并**自动落盘计划 JSON 到仓库内 `datas/fitness/plans/`**（`--no-save` 跳过；`--force` 覆盖已填 daily 的同名计划）
- `npm run checkin`：读取计划 JSON → 校验每日体重 → 输出减脂复盘（`--plan <名字>` 指定；`--json` 输出 JSON）
- `npm run sync`：从练练健身（KeepStrong）拉取逐日体重，合并进计划 `dailyWeights`（`--plan <名字>`、`--dry-run`、`--json`）
- calculate 支持免交互：`--input '<JSON>'` 直传数据；`--json` 输出 JSON，否则输出 cli-table3 表格
- `npm run typecheck`：tsc --noEmit
- 饮食配比（food）**已下线入口**，待后续优化（`src/food/` 源码暂保留，不接命令）

## 目录结构与架构约定
```
entry/calculate.ts  entry/checkin.ts  entry/sync.ts   # 各自实例化 runner / 直接跑命令
src/core/types.ts   src/core/runner.ts   # InputPort<T>{read(argv)} / OutputPort<T>{write(result)}
                                        # createRunner(compute) —— 领域互相独立，端口可插拔
src/calculate/      # 域名 calculate：types/input/cli · output/json|table · 纯计算逻辑
src/plan/           # 计划归档（calculate 写 / checkin·sync 读写）：types · store(datas/fitness/plans/<name>.json) · save-output(输出装饰器)
src/checkin/        # 域名 checkin：types · analyze · validate · input/cli · output/json|table · style(颜色) · sections/*(输出插槽注册表)
src/sync/           # 域名 sync：从 @ai-tiny-codes/keepstrong 拉体重 → 合并 dailyWeights
src/food/           # 域名 food：已下线入口，源码暂留待优化
src/utils/project.ts # findProjectRoot() / datasDir()：从 cwd 上溯 pnpm-workspace.yaml 定位仓库根，计划存到仓库内
src/utils/store.ts  # ~/.ai-tiny-codes/fitness/<name>.json 通用读写（如 last-calculate），薄封装自 @ai-tiny-codes/utils 的 createJsonStore("fitness")
```
> 计划文件在仓库内 `datas/fitness/plans/`（随项目上传/手改）；临时记忆（如 `last-calculate`）在 `~/.ai-tiny-codes/fitness/`。`createJsonStore(scope, { baseDir })` 支持覆盖基目录。
约定：
- 输入输出方式都实现 `src/core/types.ts` 的端口接口；加新输入/输出（excel、markdown、skill、文件）时新建类即可，不改计算层。
- 计算层保持纯函数，便于复用到其他入口。
- CLI 用 `@inquirer/prompts`（select/checkbox/number/input/confirm）；数字必须 `step: "any"`（否则整数限制，曾踩坑 96.8）；表格统一用 `@ai-tiny-codes/utils` 的 `newTable/printSection`（内部已按需注入 colAligns，避免显式传 undefined 崩溃）；颜色用 `chalk`。
- 记忆上次输入：`src/utils/store.ts` 落到 `~/.ai-tiny-codes/fitness/`。注意别把本地测试残留数据留在这（会影响默认值）。
- **输出插槽**：checkin 的每类指标是一个 `SectionBuilder`，注册在 `src/checkin/sections/index.ts`；输出层只遍历 `TrackSection[]`，增删/调整指标只改注册表，不动分析与输出。
- 公用能力来自 workspace 包 `@ai-tiny-codes/utils`（`createJsonStore` / `newTable` / `printSection` / `today` / `isValidDateString`）；练练健身接口来自 `@ai-tiny-codes/keepstrong`（`getKeepStrongBodyLogs` 等），均以 `workspace:*` 声明在本包；第三方依赖统一在仓库根 `package.json`，子包向上查找解析。

## calculate 领域口径（README 第一二模块）
- BMR：男 `88.362+13.397·kg+4.799·cm-5.677·age`；女 `447.593+9.247·kg+3.098·cm-4.330·age`
- 年龄由**出生年份 birthYear** 与开始日期年份相减得到（不再直接输入年龄）
- 训练消耗 = 强度(5/8/10) × 分钟；初始热量 = BMR + 训练消耗（大卡）
- 宏量：532=碳50/蛋30/脂20；442=碳40/蛋40/脂20；碳水/蛋白 4kcal/g，脂肪 9kcal/g
- 减脂期仅碳水渐降（快30g/中22.5g/慢15g，速率 5%/4%/3%），蛋白脂肪不变，碳水降到 100g 止 → `macroStages` 数组
- 周/月目标用**均匀线性模型**：1 月=30 天、1 周=7 天，日减=初始体重×速率÷30（用户选定的口径，勿改成自然日历）

## food 领域口径（已下线入口，待优化；以下为历史确认口径，保留供后续参考）
- 输入只有三大营养素目标（**纯手输 g**，与 calculate 松耦合：用户会从某个档位抄数字）+ 餐次(3/4) + 固定食材 + 自由食材
- 内置食材库 17 种（用户常吃清单：卷心菜/大米生/鸡胸/巴旦木/牛肉/鸡蛋/玉米油/蛋白粉/燕麦片/胡萝卜/土豆/红薯/鸡腿/彩椒/西蓝花/香菇/虾仁）；每 100g 记 `kcal/碳水/蛋白/脂肪/膳食纤维(+糖/钠)`。**分配只用碳蛋脂，纤维等仅统计展示**（用户已确认）
- 数值为“常见参考近似值”，来源口径注释在 builtin-foods；用户可按包装背标新增自定义覆盖
- 固定餐机制：用户声明的固定量（例：每天 500g 卷心菜、固定早餐 30g 燕麦+2 蛋≈100g）**先从全天目标扣除宏量**，剩余再交自由食材补齐 —— 这是用户亲自确认的“先扣再算剩余”语义，任意餐都可固定，未绑餐=全天配菜
- 自由求解按「碳水→蛋白→脂肪」顺序**逐宏扣减交叉带入**（如大米带蛋白、鸡腿带脂）后按角色(carb/protein/fat)均分补齐 → 贴近目标、偏差>5g 时出 warnings 提示（如“实际脂肪高 x g，多来自带脂蛋白…”）
- 蔬菜口径：低能蔬菜（每100g 碳水<10g，如彩椒/西蓝花/卷心菜）在自由池中**不参与碳水均分**（否则会解出几斤离谱克数），按**每餐约 100g 配额**（常量 VEGGIE_GRAMS_PER_MEAL，多选则平分）计入并统计；主食(米/薯/燕麦等)负责碳水，若主食不足会有 warnings。想要更多菜 → 走“固定食材”明确克数。曾踩坑：彩椒被均分碳水→单餐~1.5kg
- 分餐模板：3餐=早30/午40/晚30；4餐=早25/午35/加15/晚25；已绑固定的餐不参与自由分配，自由权重在其余餐之间归一
- 一周采购清单 = 7 天同一菜单按食材 ×7 汇总（用户周日统一备菜场景）；给易购换算提示（鸡蛋≈个、生米≈kg）
- 蛋白粉建议提示按手中罐装背标覆盖；全蛋 ≈50g/个

## checkin 领域口径
- **数据源是计划 JSON 的 `dailyWeights`**：`calculate` 生成仓库内 `datas/fitness/plans/plan-<初始体重>-<目标体重>-<开始日期>.json`，`dailyWeights` 已按 `开始日 → 目标日` 逐日铺 `null`（待填）；用户把某天的 `null` 改成体重数字。超过目标日的日期由用户**自己补 key**（checkin 不丢弃，识别为超期）
- `checkpoints` 只剩 `{ kind, index, date, planWeightKg, note? }`，**不再有 actual 字段**；节点实际值由 daily 就近（`±3 天`）派生
- `checkin` 只读：先 `validatePlanFile` 校验（version/结构、daily 日期合法、体重 30~300kg、单日跳变 >2kg 提示、早于开始日提示；晚于目标日视为超期不告警），有 error 则只出校验、不分析
- 分析用 `buildContext`：`daily` = 已填数值按日期升序并算好 `ma7`；`latest`=最后一条；`status`= no-data/ongoing/overdue/reached
- **MA7**：某日往前 7 自然日内已填值的均值，窗口 <`MA_MIN`(3) 条用原始值（抗水分噪音）
- **近况速率**：最近 `RECENT_DAYS`(14) 天的 MA7 线性回归斜率 ×7 = kg/周（正数=掉秤）；全程速率同理
- 计划是**线性模型**：`该日计划体重 = 初始体重 − dailyLossKg × 距开始天数`（夹到目标体重），用 `buildPlan(input).dailyLossKg`
- 周/月节点分**两张表**（`node-table.ts` 共用）：首行是「初始」基线（开始日 + 初始体重）；**期望降幅**=计划减重；**实际降幅(环比)**=同表上一**有数据**节点的 MA7 差；两列都给「kg / 相对初始体重的百分比」；**偏差**=实际(raw)−计划，也给 kg/% 并带「偏重/偏轻/持平」文字；累计减重=初始−实际(raw)。表格下方 `notes` 输出图例（偏差含义 + 箭头含义）
- **颜色/箭头**（`src/checkin/style.ts`，用 `chalk`）：实际降幅 绿↓（减重）/红↑（长胖）；偏差 红▲（比计划重）/绿▼（比计划轻）；累计减重 绿；趋势方向上色。JSON 输出前会递归去掉 ANSI（`output/json.ts` 的 `deepStrip`），保证 `--json` 干净
- 达标判定：最新 MA7 ≤ 目标体重 → reached；`latest.date > 目标日` 且未达标 → overdue（`progress` 出「超期 X 天」并按近况速率重算 ETA）
- ETA：`预计还需 = 距目标 / 近况回归速率`；对比 `estimatedGoalDate` 给提前/延后；已达标则给提前/延后天数
- 覆盖率分母 = 开始日~目标日天数；超期额外记录天数单列
- **保存保护**：`SavePlanOutput` 在写入前若同名计划已存在且 `dailyWeights` 有已填数值，则默认不覆盖（非交互）或弹 `confirm`（默认否）；`--force` 强制覆盖。`OutputPort.write` 支持异步，`runner` 已 `await`
- 输出插槽见上「约定」；阈值常量：平台期 `<0.1kg/周`、偏快 `>计划×1.5`、偏慢 `<计划×0.5`、BMI 健康区间 18.5~24.9

## sync 领域口径
- 数据源：`@ai-tiny-codes/keepstrong` 的 `getKeepStrongBodyLogs({ metric:"weight", startDate, endDate, page, pageSize:100 })`，返回 `{ list:[{ dayStr: "20260923", value, unit }], hasMore }`
- 日期口径：计划 `dailyWeights` 用 `YYYY-MM-DD`，练练 API 用 `yyyyMMdd`，双向转换（`toDashed`）
- 合并策略：只**填/更新**，不删除已有日期；目标日之后的新日期会新增 key；重复运行幂等
- `--dry-run` 只统计不写；写入用 `writePlan(name, plan)` 覆盖计划文件
- API key：`entry/sync.ts` 启动时 `loadEnvFile(findProjectRoot()/.env.local)`（keepstrong 导出的 `loadEnvFile`）读 `KEEPSTRONG_API_KEY`
- 返回值只做编辑/新增计数（added/filled/updated/unchanged）与首末日期，供 CLI 展示

## 已确认的决策/边界
- 历史：food 与 calculate 拆开是因为“碳水渐降时每个档位都要能重生成配比”，配比绑定某一档宏量而非初始热量；入口结构选型 A（一体 + 预留拆分）。food 现已下线入口待优化
- 未做/以后再做：food 配比优化、角色内自定义占比、训练日/休息日两套菜单、餐次比例可编辑、食材单位换算(个/片)、USDA/中国食物成分表严格溯源、excel/markdown/skill 输出

## 注意
- 仓库历史曾误提交 node_modules 已清理；改动后记得 typecheck 并验证 `calculate`/`checkin` 两条链路
- 此项目是用户个人工具，会在另一台电脑继续开发（依赖 AGENTS.md 恢复上下文）
