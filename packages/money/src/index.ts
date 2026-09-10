import { number, input, select } from "@inquirer/prompts";
import {
  createJsonStore,
  newTable,
  printSection,
  today,
  isValidDateString,
  roundTo,
  formatMoney,
  formatPercent,
} from "@ai-tiny-codes/utils";

// ========== 类型 ==========

type DepositFrequency = "yearly" | "monthly";

interface MoneyInput {
  depositFrequency: DepositFrequency; // 按年存 / 按月存
  savingAmount: number; // 每期存入（元）：按年=每年，按月=每月
  initialDeposit: number; // 当前已有存款（元）
  annualRatePercent: number; // 年化收益率，输入 2 表示 2%
  target: number; // 目标金额（元）
  startDate: string; // 开始日期 YYYY-MM-DD
}

interface SavingConfig {
  frequency: DepositFrequency;
  savingAmount: number;
  initialDeposit: number;
  annualRate: number; // 小数，如 0.02
  target: number;
  startDate: Date;
}

interface YearlyRecord {
  year: number; // 第几年
  date: string; // 年份
  interest: number; // 当年利息
  saved: number; // 当年存入
  total: number; // 年末总额
  months: number; // 该年计入的月份数，满年 12
}

interface SavingPlan {
  records: YearlyRecord[];
  years: number; // 完整年数
  months: number; // 额外月数 0~11
  totalMonths: number;
  depositCount: number; // 存入次数（按年=年数，按月=月数）
  totalDeposited: number; // 累计存入金额
  finalAmount: number;
  totalPrincipal: number;
  totalInterest: number;
  reached: boolean;
  alreadyMet: boolean;
  truncated: boolean;
}

// ========== 计算 ==========

const MAX_YEARS = 1000;
const MAX_DISPLAY_YEARS = 100;

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** 等效月利率：按月复利 12 次正好等于年化 */
function effectiveMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function emptyPlan(initialDeposit: number, reached: boolean, alreadyMet: boolean): SavingPlan {
  return {
    records: [],
    years: 0,
    months: 0,
    totalMonths: 0,
    depositCount: 0,
    totalDeposited: 0,
    finalAmount: roundTo(initialDeposit),
    totalPrincipal: roundTo(initialDeposit),
    totalInterest: 0,
    reached,
    alreadyMet,
    truncated: false,
  };
}

function reachedPlan(
  records: YearlyRecord[],
  totalMonths: number,
  depositCount: number,
  finalAmount: number,
  totalDeposited: number,
  initialDeposit: number,
  truncated: boolean
): SavingPlan {
  const totalPrincipal = initialDeposit + totalDeposited;
  return {
    records,
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
    depositCount,
    totalDeposited: roundTo(totalDeposited),
    finalAmount: roundTo(finalAmount),
    totalPrincipal: roundTo(totalPrincipal),
    totalInterest: roundTo(finalAmount - totalPrincipal),
    reached: true,
    alreadyMet: false,
    truncated,
  };
}

/** 按年：每年年初存入，年利息 = 年初余额 × 年化，年内按月线性累积 */
function calculateYearly(config: SavingConfig): SavingPlan {
  const { initialDeposit, savingAmount, annualRate, target, startDate } = config;
  const records: YearlyRecord[] = [];
  let balance = initialDeposit;
  let truncated = false;

  for (let year = 1; year <= MAX_YEARS; year++) {
    const withSaving = balance + savingAmount; // 年初存入

    // 年内逐月检查是否达标（利息按月线性累积），m=0 表示年初存入后立即达标
    let hitMonth = -1;
    for (let m = 0; m <= 12; m++) {
      if (withSaving * (1 + annualRate * (m / 12)) >= target) {
        hitMonth = m;
        break;
      }
    }

    const date = String(startDate.getFullYear() + (year - 1));

    if (hitMonth >= 0) {
      const interest = withSaving * annualRate * (hitMonth / 12);
      const total = withSaving + interest;
      records.push({
        year,
        date,
        interest: roundTo(interest),
        saved: savingAmount,
        total: roundTo(total),
        months: hitMonth,
      });
      return reachedPlan(
        records,
        (year - 1) * 12 + hitMonth,
        year,
        total,
        savingAmount * year,
        initialDeposit,
        truncated
      );
    }

    const interest = withSaving * annualRate;
    balance = withSaving + interest;

    if (records.length < MAX_DISPLAY_YEARS) {
      records.push({
        year,
        date,
        interest: roundTo(interest),
        saved: savingAmount,
        total: roundTo(balance),
        months: 12,
      });
    } else {
      truncated = true;
    }
  }

  return {
    records,
    years: MAX_YEARS,
    months: 0,
    totalMonths: MAX_YEARS * 12,
    depositCount: MAX_YEARS,
    totalDeposited: roundTo(savingAmount * MAX_YEARS),
    finalAmount: roundTo(balance),
    totalPrincipal: roundTo(initialDeposit + savingAmount * MAX_YEARS),
    totalInterest: roundTo(balance - (initialDeposit + savingAmount * MAX_YEARS)),
    reached: false,
    alreadyMet: false,
    truncated,
  };
}

/** 按月：每月月初存入，当月利息按等效月利率逐月复利 */
function calculateMonthly(config: SavingConfig): SavingPlan {
  const { initialDeposit, savingAmount: monthlySaving, annualRate, target, startDate } = config;
  const r = effectiveMonthlyRate(annualRate);
  const records: YearlyRecord[] = [];
  let balance = initialDeposit;
  let truncated = false;

  for (let year = 1; year <= MAX_YEARS; year++) {
    let yearInterest = 0;
    let yearSaved = 0;
    let hitMonth = -1;

    for (let m = 1; m <= 12; m++) {
      balance += monthlySaving; // 月初存入
      yearSaved += monthlySaving;
      const interest = balance * r;
      balance += interest;
      yearInterest += interest;
      if (balance >= target) {
        hitMonth = m;
        break;
      }
    }

    const date = String(startDate.getFullYear() + (year - 1));

    if (hitMonth >= 0) {
      records.push({
        year,
        date,
        interest: roundTo(yearInterest),
        saved: roundTo(yearSaved),
        total: roundTo(balance),
        months: hitMonth,
      });
      const totalMonths = (year - 1) * 12 + hitMonth;
      return reachedPlan(
        records,
        totalMonths,
        totalMonths,
        balance,
        monthlySaving * totalMonths,
        initialDeposit,
        truncated
      );
    }

    if (records.length < MAX_DISPLAY_YEARS) {
      records.push({
        year,
        date,
        interest: roundTo(yearInterest),
        saved: roundTo(yearSaved),
        total: roundTo(balance),
        months: 12,
      });
    } else {
      truncated = true;
    }
  }

  const totalMonths = MAX_YEARS * 12;
  const totalDeposited = monthlySaving * totalMonths;
  return {
    records,
    years: MAX_YEARS,
    months: 0,
    totalMonths,
    depositCount: totalMonths,
    totalDeposited: roundTo(totalDeposited),
    finalAmount: roundTo(balance),
    totalPrincipal: roundTo(initialDeposit + totalDeposited),
    totalInterest: roundTo(balance - (initialDeposit + totalDeposited)),
    reached: false,
    alreadyMet: false,
    truncated,
  };
}

function calculateSavingPlan(config: SavingConfig): SavingPlan {
  const { initialDeposit, annualRate, savingAmount, target, frequency } = config;

  if (initialDeposit >= target) return emptyPlan(initialDeposit, true, true);
  // 年化为 0 且不再存入，永远无法达标
  if (annualRate === 0 && savingAmount === 0) return emptyPlan(initialDeposit, false, false);

  return frequency === "monthly" ? calculateMonthly(config) : calculateYearly(config);
}

// ========== 记忆 ==========

const store = createJsonStore("money");
const STORE_KEY = "last-input";

function loadLast(): MoneyInput | null {
  const raw = store.load<Record<string, unknown>>(STORE_KEY);
  if (!raw || typeof raw !== "object") return null;

  // 兼容旧结构：只有 yearlySaving 的视为按年
  const depositFrequency: DepositFrequency = raw.depositFrequency === "monthly" ? "monthly" : "yearly";
  const savingAmount =
    typeof raw.savingAmount === "number"
      ? raw.savingAmount
      : typeof raw.yearlySaving === "number"
        ? raw.yearlySaving
        : null;
  if (savingAmount === null) return null;

  return {
    depositFrequency,
    savingAmount,
    initialDeposit: Number(raw.initialDeposit ?? 0),
    annualRatePercent: Number(raw.annualRatePercent ?? 2),
    target: Number(raw.target ?? 2500000),
    startDate: String(raw.startDate ?? today()),
  };
}

// ========== 输入 ==========

const WAN = 10000; // 输入以「万元」为单位，内部与存储统一用「元」

function wanToYuan(wan: number): number {
  return Math.round(wan * WAN);
}

function yuanToWan(yuan: number): number {
  return roundTo(yuan / WAN, 4);
}

const FREQUENCY_CHOICES: { name: string; value: DepositFrequency }[] = [
  { name: "按年存（每年年初存入）", value: "yearly" },
  { name: "按月存（每月月初存入，逐月复利）", value: "monthly" },
];

function defaultSavingWan(last: MoneyInput | null, frequency: DepositFrequency): number {
  if (!last) return frequency === "yearly" ? 10 : 1;
  let yuan = last.savingAmount;
  if (last.depositFrequency === "monthly" && frequency === "yearly") yuan = last.savingAmount * 12;
  else if (last.depositFrequency === "yearly" && frequency === "monthly") yuan = last.savingAmount / 12;
  return yuanToWan(yuan);
}

function toConfig(data: MoneyInput): SavingConfig {
  return {
    frequency: data.depositFrequency,
    savingAmount: data.savingAmount,
    initialDeposit: data.initialDeposit,
    annualRate: data.annualRatePercent / 100,
    target: data.target,
    startDate: new Date(`${data.startDate}T00:00:00`),
  };
}

async function promptForInput(): Promise<MoneyInput> {
  const last = loadLast();

  console.log("");
  console.log("=========== 攒钱计划计算器 ===========");
  console.log("回车/方向键选择，Ctrl+C 随时退出");
  console.log("金额均以「万元」为单位，如 250 表示 250 万");
  if (last) console.log("已载入上次记录：直接回车沿用默认值，想改哪项输哪项");
  console.log("======================================");

  const initialDeposit = await number({
    message: "当前已有存款 (万元)",
    step: "any",
    default: last ? yuanToWan(last.initialDeposit) : 0,
    validate: (v) => (v !== null && v !== undefined && v >= 0 ? true : "请输入 ≥0 的数字"),
  });

  const depositFrequency = await select<DepositFrequency>({
    message: "存款方式",
    choices: FREQUENCY_CHOICES,
    default: last?.depositFrequency ?? "yearly",
  });

  const savingWan = await number({
    message: depositFrequency === "yearly" ? "每年攒多少 (万元)" : "每月攒多少 (万元)",
    step: "any",
    default: defaultSavingWan(last, depositFrequency),
    validate: (v) => (v !== null && v !== undefined && v >= 0 ? true : "请输入 ≥0 的数字"),
  });

  const annualRatePercent = await number({
    message: "年化收益率 (%，输入 2 表示 2%)",
    step: "any",
    default: last?.annualRatePercent ?? 2,
    validate: (v) => (v !== null && v !== undefined && v >= 0 ? true : "请输入 ≥0 的数字"),
  });

  const target = await number({
    message: "目标金额 (万元)",
    step: "any",
    default: last ? yuanToWan(last.target) : 250,
    validate: (v) => (v !== null && v !== undefined && v > 0 ? true : "请输入 >0 的数字"),
  });

  const startDateRaw = await input({
    message: "开始日期 (YYYY-MM-DD)",
    default: last?.startDate || today(),
    validate: (r) => (isValidDateString(r.trim()) ? true : "请输入合法的 YYYY-MM-DD 日期"),
  });

  return {
    depositFrequency,
    savingAmount: wanToYuan(Number(savingWan)),
    initialDeposit: wanToYuan(Number(initialDeposit)),
    annualRatePercent: Number(annualRatePercent),
    target: wanToYuan(Number(target)),
    startDate: startDateRaw.trim(),
  };
}

// ========== 输出 ==========

function renderPlan(config: SavingConfig, plan: SavingPlan): void {
  const isYearly = config.frequency === "yearly";
  const savingLabel = isYearly ? "按年存" : "按月存";

  console.log("");
  console.log("==================== 攒钱计划 ====================");
  console.log(
    `已有 ${formatMoney(config.initialDeposit)} 元 ｜ ${savingLabel} ${formatMoney(config.savingAmount)} 元 ｜ 年化 ${formatPercent(config.annualRate)} ｜ 目标 ${formatMoney(config.target)} 元`
  );
  console.log(`开始日期：${config.startDate.getFullYear()} 年`);

  const t = newTable(
    ["年份", "当年利息", "当年存入", "年末总额"],
    ["left", "right", "right", "right"]
  );
  for (const r of plan.records) {
    let yearLabel = `${r.date}年`;
    if (r.months === 0) yearLabel = `${r.date}年（年初存入后）`;
    else if (r.months < 12) yearLabel = `${r.date}年（第 ${r.months} 个月）`;
    t.push([yearLabel, formatMoney(r.interest), formatMoney(r.saved), formatMoney(r.total)]);
  }
  if (plan.records.length > 0) {
    printSection("逐年明细", t);
    if (plan.truncated) {
      console.log(`（仅展示前 ${MAX_DISPLAY_YEARS} 年）`);
    }
  }

  console.log("");
  if (!plan.reached) {
    console.log(`⚠ 按此参数无法达标，请检查输入`);
  } else {
    const duration =
      plan.totalMonths === 0
        ? "立即达成"
        : plan.months === 0
          ? `${plan.years} 年`
          : `${plan.years} 年 ${plan.months} 个月`;
    const reachDate = addMonths(config.startDate, plan.totalMonths);
    console.log(`🎯 结论：需要 ${duration}`);
    console.log(`📅 达成年月：${reachDate.getFullYear()} 年 ${reachDate.getMonth() + 1} 月`);
  }
  console.log(`💰 最终金额：${formatMoney(plan.finalAmount)} 元`);
  const depositLabel = isYearly ? "年存" : "月存";
  const depositUnit = isYearly ? "年" : "个月";
  console.log(
    `📥 总投入本金：${formatMoney(plan.totalPrincipal)} 元（初始 ${formatMoney(config.initialDeposit)} + ${depositLabel} × ${plan.depositCount} ${depositUnit}）`
  );
  console.log(`📈 总利息收益：${formatMoney(plan.totalInterest)} 元`);
  console.log("=================================================");
}

// ========== 运行 ==========

async function main(): Promise<void> {
  const data = await promptForInput();
  store.save(STORE_KEY, data);

  const config = toConfig(data);
  const plan = calculateSavingPlan(config);

  if (plan.alreadyMet) {
    console.log("");
    console.log(`✓ 已达标，无需再存。当前金额 ${formatMoney(plan.finalAmount)} 元`);
    return;
  }

  renderPlan(config, plan);
}

main().catch((err: unknown) => {
  console.error("");
  console.error("✗ 计算失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});
