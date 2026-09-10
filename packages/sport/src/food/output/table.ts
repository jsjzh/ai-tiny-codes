import Table from "cli-table3";
import { FoodReport } from "../types";
import { OutputPort } from "../../core/types";

const STYLE: Table.TableConstructorOptions["style"] = { head: ["bold", "cyan"], border: ["gray"] };

function newTable(head?: string[], colAligns?: string[]): Table.Table {
  const o: Table.TableConstructorOptions = { style: STYLE };
  if (head) o.head = head;
  if (colAligns) o.colAligns = colAligns as Table.HorizontalAlignment[];
  return new Table(o);
}

function g(n: number): string {
  return `${n.toFixed(1)}g`;
}

function signed(n: number): string {
  return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}

export class FoodTableOutput implements OutputPort<FoodReport> {
  write(result: FoodReport): void {
    renderTable(result);
  }
}

export function renderTable(result: FoodReport): void {
  const m = result.macros;
  console.log("");
  console.log("============== 每日饮食配比报告 ==============");
  console.log(`目标宏量：碳水 ${m.carb}g ／ 蛋白质 ${m.protein}g ／ 脂肪 ${m.fat}g`);

  renderFixed(result);
  renderMeals(result);
  renderDaily(result);
  renderWeekly(result);
  renderSummary(result);

  console.log("");
  console.log("=============================================");
}

function renderFixed(result: FoodReport): void {
  if (result.fixed.length === 0) return;
  const t = newTable(["固定食材", "每天克数", "归属"], ["left", "right", "left"]);
  result.fixed.forEach((f) => t.push([f.name, g(f.grams), f.meal ?? "全天配菜"]));
  printSection("固定食材（先扣除其宏量）", t);
}

function renderMeals(result: FoodReport): void {
  console.log("");
  console.log("■ 每日分餐");
  result.meals.forEach((meal) => {
    if (meal.items.length === 0) {
      console.log("");
      console.log(`  ${meal.label}：—`);
      return;
    }
    const t = newTable(["类型", "食物", "克数"], ["left", "left", "right"]);
    meal.items.forEach((it) => t.push([it.fromFixed ? "固定" : "自由", it.name, g(it.grams)]));
    const m = meal.macros;
    t.push(["", `合计 碳${m.carb}g 蛋${m.protein}g 脂${m.fat}g · ${meal.kcal} 大卡`, ""]);
    console.log("");
    console.log(`  ${meal.label}`);
    console.log(t.toString());
  });
}

function renderDaily(result: FoodReport): void {
  const t = newTable(["食材", "类别", "每天克数"], ["left", "left", "right"]);
  result.daily.forEach((d) => t.push([d.name, roleName(d.role), g(d.grams)]));
  printSection("全天食材用量", t);
}

function renderWeekly(result: FoodReport): void {
  const t = newTable(["食材", "每天", "每周采购", "备注"], ["left", "right", "right", "left"]);
  result.weekly.forEach((w) => {
    const big = w.weeklyGrams >= 1000;
    t.push([
      w.name,
      g(w.dailyGrams),
      big ? `${w.weeklyGrams.toFixed(0)}g（${(w.weeklyGrams / 1000).toFixed(2)}kg）` : g(w.weeklyGrams),
      w.note ?? "",
    ]);
  });
  printSection("一周采购清单（7 天同一菜单，周日备菜用）", t);
}

function renderSummary(result: FoodReport): void {
  const t = newTable(["指标", "实际", "目标", "偏差"], ["left", "right", "right", "right"]);
  t.push(
    ["碳水 (g)", result.achieved.carb.toFixed(1), result.macros.carb.toFixed(1), signed(result.deviation.carb)],
    ["蛋白质 (g)", result.achieved.protein.toFixed(1), result.macros.protein.toFixed(1), signed(result.deviation.protein)],
    ["脂肪 (g)", result.achieved.fat.toFixed(1), result.macros.fat.toFixed(1), signed(result.deviation.fat)],
    ["热量 (大卡)", String(result.kcal), "", ""]
  );
  printSection("全天核对（实际 vs 目标）", t);

  const extra = [`膳食纤维 ${result.stats.fiber}g`];
  if (result.stats.sugar > 0) extra.push(`糖 ${result.stats.sugar}g`);
  if (result.stats.sodium > 0) extra.push(`钠 ${result.stats.sodium}mg`);
  console.log(`  ${extra.join(" ｜ ")}`);

  if (result.warnings.length > 0) {
    console.log("");
    console.log("⚠ 提示：");
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }
}

function roleName(role: string): string {
  return role === "carb" ? "主食/碳水" : role === "protein" ? "蛋白" : "脂肪/油脂";
}

function printSection(title: string, table: Table.Table): void {
  console.log("");
  console.log(`■ ${title}`);
  console.log(table.toString());
}
