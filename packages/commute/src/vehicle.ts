import { EnergyVehicleConfig } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface VehicleYearResult {
  /** 年里程 */
  realMileage: number;
  /** 能耗量：电=度，油=升 */
  energyAmount: number;
  energyCost: number;
  maintainCost: number;
  fixedCost: number;
  total: number;
  costPerKm: number;
}

/**
 * 能耗型交通工具的年度花费（电车/油车/摩托通用）。
 * 年里程 = 通勤日 × 单程公里 × 2（往返）。
 */
export function vehicleYearCum(
  commuteDays: number,
  oneWayMileage: number,
  config: EnergyVehicleConfig
): VehicleYearResult {
  const realMileage = commuteDays * oneWayMileage * 2;
  const energyAmount = (realMileage / 100) * config.consumptionPer100km;
  const energyCost = energyAmount * config.pricePerUnit;
  const maintainCost = Math.floor(realMileage / config.maintainEveryKm) * config.maintainPrice;
  const fixedCost = config.annualFixedCost ?? 0;
  const total = energyCost + maintainCost + fixedCost;

  return {
    realMileage,
    energyAmount: round2(energyAmount),
    energyCost: round2(energyCost),
    maintainCost: round2(maintainCost),
    fixedCost: round2(fixedCost),
    total: round2(total),
    costPerKm: realMileage > 0 ? round2(total / realMileage) : 0,
  };
}