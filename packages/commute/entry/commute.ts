import { newTable, printSection } from "@ai-tiny-codes/utils";
import { CommuteConfig } from "../src/types";
import { compareCommute } from "../src/compare";

// ==================== 你只需要改这里 ====================
const CONFIG: CommuteConfig = {
  year: 2026,

  // 通勤日：默认周一~周五；可加节假日把它们从通勤日里扣掉
  commuteWeekdays: [1, 2, 3, 4, 5],
  holidays: [], // 例如 ["2026-10-01", "2026-10-02"]

  // 单程公里数（开车 / 摩托共用）
  oneWayMileage: 22,

  // 地铁单程票价（元）
  metro: { oneWayPrice: 6 },

  // 开车·电车：能耗 KW/100km、电价 元/度、保养费 元、年固定费（保险/停车等）
  carEV: { consumptionPer100km: 20, pricePerUnit: 0.5, maintainEveryKm: 5000, maintainPrice: 750, annualFixedCost: 0 },
  // 开车·油车：油耗 L/100km、油价 元/升、保养费 元、年固定费
  carGas: { consumptionPer100km: 8, pricePerUnit: 8, maintainEveryKm: 5000, maintainPrice: 1500, annualFixedCost: 0 },
  // 摩托：油耗 L/100km、油价 元/升、保养费 元、年固定费
  moto: { consumptionPer100km: 3, pricePerUnit: 8, maintainEveryKm: 5000, maintainPrice: 300, annualFixedCost: 0 },
};
// ======================================================

const ENERGY_UNIT: Record<string, string> = { carEV: "度", carGas: "升", moto: "升" };

function money(n: number): string {
  return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function render(config: CommuteConfig): void {
  const report = compareCommute(config);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("");
  console.log(`==================== ${config.year} 年通勤花费对比 ====================`);
  console.log(
    `全年 ${report.days.totalDays} 天，其中通勤日 ${report.days.commuteDays} 天；单程 ${config.oneWayMileage} km`
  );

  const t = newTable(
    ["方式", "年里程(km)", "能耗", "能耗费", "保养费", "固定费", "总花费", "元/km", "对比最省"],
    ["left", "right", "right", "right", "right", "right", "right", "right", "right"]
  );

  for (const r of report.results) {
    const isMetro = r.mileage === 0;
    const energy = isMetro ? "—" : `${money(r.energyAmount)} ${ENERGY_UNIT[r.key] ?? ""}`.trim();
    t.push([
      `${r.label}${r.key === report.cheapest ? " ★" : ""}`,
      isMetro ? "—" : money(r.mileage),
      energy,
      isMetro ? "—" : money(r.energyCost),
      isMetro ? "—" : money(r.maintainCost),
      money(r.fixedCost),
      money(r.total),
      isMetro ? "—" : r.costPerKm.toFixed(2),
      r.diffVsCheapest === 0 ? "最省" : `+${money(r.diffVsCheapest)}`,
    ]);
  }
  printSection("各方式年度花费", t);

  const metroDisc = report.savingsVsMetroDiscount.metroDiscount; // 0
console.log("");
  console.log("■ 相对「地铁（累计优惠）」的差额（正=更省，负=更贵）");
  for (const r of report.results) {
    if (r.key === "metroDiscount") continue;
    const diff = report.savingsVsMetroDiscount[r.key];
    const sign = diff >= 0 ? "省" : "多花";
    console.log(`  ${r.label}：${sign} ${money(Math.abs(diff))} 元`);
  }
  console.log("");
  console.log("=====================================================================");
}

render(CONFIG);