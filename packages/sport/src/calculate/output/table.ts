import Table from "cli-table3";
import { CalculateReport, MacroCombo, Pace, PACE_CONFIG } from "../types";
import { OutputPort } from "../../core/types";

const PACE_LABEL: Record<Pace, string> = {
  fast: "快（每月 5%）",
  medium: "中（每月 4%）",
  slow: "慢（每月 3%）",
};

const BORDER_STYLE: Table.TableConstructorOptions["style"] = {
  head: ["bold", "cyan"],
  border: ["gray"],
};

function newTable(head?: string[], colAligns?: string[]): Table.Table {
  const options: Table.TableConstructorOptions = { style: BORDER_STYLE };
  if (head) options.head = head;
  if (colAligns) options.colAligns = colAligns as Table.HorizontalAlignment[];
  return new Table(options);
}

export class CalculateTableOutput implements OutputPort<CalculateReport> {
  write(result: CalculateReport): void {
    renderTable(result);
  }
}

export function renderTable(result: CalculateReport): void {
  console.log("");
  console.log("==================== 减脂计划报告 ====================");

  renderInput(result);
  renderSummary(result);
  renderMacroStages(result.macroStages);

  const { input } = result;
  const monthlyLoss = input.weightKg * PACE_CONFIG[input.pace].rate;
  const weeklyLoss = (monthlyLoss / 30) * 7;
  renderTargets(`月度目标体重（每月约减 ${monthlyLoss.toFixed(2)}kg）`, result.monthlyTargets, "月份");
  renderTargets(`每周目标体重（每周约减 ${weeklyLoss.toFixed(2)}kg）`, result.weeklyTargets, "周次");

  console.log("");
  console.log("说明：蛋白质与脂肪在整个减脂期保持不变，只递减碳水至 100g 结束。");
  console.log("======================================================");
}

function renderInput(result: CalculateReport): void {
  const { input } = result;
  const t = newTable();
  t.push(
    ["性别", input.gender === "male" ? "男" : "女"],
    ["当前体重", `${input.weightKg} kg`],
    ["目标体重", `${input.targetWeightKg} kg`],
    ["身高", `${input.heightCm} cm`],
    ["出生年份", String(input.birthYear)],
    ["每次训练时长", `${input.trainingMinutes} min`],
    ["训练强度", String(input.trainingIntensity)],
    ["饮食计划", input.dietPlan],
    ["减脂速度", PACE_LABEL[input.pace]],
    ["开始日期", input.startDate]
  );
  printSection("基础信息", t);
}

function renderSummary(result: CalculateReport): void {
  const t = newTable();
  t.push(
    ["基础代谢率 (BMR)", result.baseMetabolism],
    ["单次训练消耗热量", result.exerciseBurn],
    ["初始热量（每日摄入）", result.initialCalories],
    ["预估达成目标日期", result.estimatedGoalDate]
  );
  printSection("热量总览", t);
}

function renderMacroStages(stages: MacroCombo[]): void {
  const t = newTable(["档位", "碳水 (g)", "蛋白质 (g)", "脂肪 (g)", "热量 (大卡)"], [
    "right",
    "right",
    "right",
    "right",
    "right",
  ]);
  stages.forEach((s, i) => {
    const cal = Math.round(s.carb * 4 + s.protein * 4 + s.fat * 9);
    t.push([String(i + 1), s.carb.toFixed(1), s.protein.toFixed(1), s.fat.toFixed(1), String(cal)]);
  });
  printSection("三大营养素档位（碳水递减至 100g）", t);
}

function renderTargets(
  title: string,
  targets: CalculateReport["weeklyTargets"],
  indexName: string
): void {
  const t = newTable([indexName, "日期", "目标体重 (kg)"], ["right", "left", "right"]);
  targets.forEach((r) => t.push([String(r.index), r.date, r.weightKg.toFixed(2)]));
  printSection(title, t);
}

function printSection(title: string, table: Table.Table): void {
  console.log("");
  console.log(`■ ${title}`);
  console.log(table.toString());
}
