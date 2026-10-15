/** 能耗型交通工具（电车/油车/摩托）的配置 */
export interface EnergyVehicleConfig {
  /** 能耗：电车=KW/100km，油车/摩托=L/100km */
  consumptionPer100km: number;
  /** 单价：电=元/度，油=元/升 */
  pricePerUnit: number;
  /** 保养周期（每多少公里保养一次） */
  maintainEveryKm: number;
  /** 单次保养费（元） */
  maintainPrice: number;
  /** 每年固定费（保险/停车/年检等，元），默认 0 */
  annualFixedCost?: number;
}

export interface CommuteConfig {
  year: number;
  /** 每周通勤的星期（0=周日 … 6=周六），默认 [1,2,3,4,5]（周一~周五） */
  commuteWeekdays?: number[];
  /** 需要从通勤日里扣除的节假日（YYYY-MM-DD） */
  holidays?: string[];
  /** 单程公里数（开车/摩托共用） */
  oneWayMileage: number;
  /** 地铁 */
  metro: { oneWayPrice: number };
  /** 开车·电车 */
  carEV: EnergyVehicleConfig;
  /** 开车·油车 */
  carGas: EnergyVehicleConfig;
  /** 摩托 */
  moto: EnergyVehicleConfig;
}

export interface YearDays {
  /** 全年自然日数 */
  totalDays: number;
  /** 通勤日数（按 commuteWeekdays，扣除 holidays） */
  commuteDays: number;
  /** 每月通勤日数（12 项） */
  monthlyCommuteDays: number[];
}

/** 一种出行方式的年度结果（金额单位：元） */
export interface ModeResult {
  key: string;
  label: string;
  /** 年里程（km）；地铁为 0 */
  mileage: number;
  /** 能耗量：电=度，油=升；地铁为 0 */
  energyAmount: number;
  energyCost: number;
  maintainCost: number;
  fixedCost: number;
  total: number;
  /** 元/km；地铁为 0 */
  costPerKm: number;
  /** 相对最省方式多花多少（最省为 0） */
  diffVsCheapest: number;
}

export interface CommuteReport {
  year: number;
  days: YearDays;
  /** 按总花费升序 */
  results: ModeResult[];
  cheapest: string;
  cheapestTotal: number;
  /** 相对「地铁（累计优惠）」的差额：正=比地铁省，负=比地铁多花 */
  savingsVsMetroDiscount: Record<string, number>;
}