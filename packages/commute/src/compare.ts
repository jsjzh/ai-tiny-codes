import { buildYearDays } from "./days";
import { metroYearCum } from "./metro";
import { VehicleYearResult, vehicleYearCum } from "./vehicle";
import { CommuteConfig, CommuteReport, ModeResult } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5]; // 周一~周五

type ModeBody = Omit<ModeResult, "key" | "label" | "diffVsCheapest">;

function vehicleToRow(v: VehicleYearResult): ModeBody {
  return {
    mileage: v.realMileage,
    energyAmount: v.energyAmount,
    energyCost: v.energyCost,
    maintainCost: v.maintainCost,
    fixedCost: v.fixedCost,
    total: v.total,
    costPerKm: v.costPerKm,
  };
}

function metroRow(total: number): ModeBody {
  return {
    mileage: 0,
    energyAmount: 0,
    energyCost: 0,
    maintainCost: 0,
    fixedCost: 0,
    total: round2(total),
    costPerKm: 0,
  };
}

/** 生成通勤方式年花费对比报告 */
export function compareCommute(config: CommuteConfig): CommuteReport {
  const weekdays = config.commuteWeekdays ?? DEFAULT_WEEKDAYS;
  const days = buildYearDays(config.year, weekdays, config.holidays ?? []);

  const monthlyTrips = days.monthlyCommuteDays.map((d) => d * 2);
  const metro = metroYearCum(config.metro.oneWayPrice, monthlyTrips);

  const carEV = vehicleYearCum(days.commuteDays, config.oneWayMileage, config.carEV);
  const carGas = vehicleYearCum(days.commuteDays, config.oneWayMileage, config.carGas);
  const moto = vehicleYearCum(days.commuteDays, config.oneWayMileage, config.moto);

  const base: { key: string; label: string; body: ModeBody }[] = [
    { key: "metroDiscount", label: "地铁（累计优惠）", body: metroRow(metro.discounted) },
    { key: "metroFull", label: "地铁（无优惠）", body: metroRow(metro.full) },
    { key: "carEV", label: "开车·电车", body: vehicleToRow(carEV) },
    { key: "carGas", label: "开车·油车", body: vehicleToRow(carGas) },
    { key: "moto", label: "骑摩托", body: vehicleToRow(moto) },
  ];

  const sorted = [...base].sort((a, b) => a.body.total - b.body.total);
  const cheapestTotal = sorted[0].body.total;

  const results: ModeResult[] = sorted.map((r) => ({
    key: r.key,
    label: r.label,
    ...r.body,
    diffVsCheapest: round2(r.body.total - cheapestTotal),
  }));

  const metroDiscTotal = round2(metro.discounted);
  const savingsVsMetroDiscount: Record<string, number> = {};
  for (const r of results) savingsVsMetroDiscount[r.key] = round2(metroDiscTotal - r.total);

  return {
    year: config.year,
    days,
    results,
    cheapest: results[0].key,
    cheapestTotal,
    savingsVsMetroDiscount,
  };
}