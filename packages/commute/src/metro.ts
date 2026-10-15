/**
 * 地铁累计优惠口径（按「当月累计消费」计算，每月重置）：
 * 累计 < 50 元 → 九折；50~100 元 → 七折；≥ 100 元 → 五折。
 * 折率取「本次乘坐前」的当月累计金额判断。
 */
export interface MetroRates {
  tier1Max: number;
  tier1Rate: number;
  tier2Max: number;
  tier2Rate: number;
  tier3Rate: number;
}

export const METRO_RATES: MetroRates = {
  tier1Max: 50,
  tier1Rate: 0.9,
  tier2Max: 100,
  tier2Rate: 0.7,
  tier3Rate: 0.5,
};

/**
 * 全年地铁花费。
 * @param oneWayPrice 单程票价
 * @param monthlyTrips 每月的乘车次数（12 项，通常 = 每月通勤日 × 2）
 */
export function metroYearCum(
  oneWayPrice: number,
  monthlyTrips: number[],
  rates: MetroRates = METRO_RATES
): { discounted: number; full: number } {
  let discounted = 0;
  let full = 0;

  for (const trips of monthlyTrips) {
    let monthCum = 0; // 当月累计（用于判断折率，每月重置）
    for (let i = 0; i < trips; i++) {
      const rate =
        monthCum < rates.tier1Max
          ? rates.tier1Rate
          : monthCum < rates.tier2Max
            ? rates.tier2Rate
            : rates.tier3Rate;
      monthCum += oneWayPrice * rate;
      full += oneWayPrice;
    }
    discounted += monthCum;
  }

  return { discounted, full };
}