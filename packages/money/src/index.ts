interface SavingConfig {
  yearlySaving: number; // 每年攒多少
  annualRate: number; // 年化收益率，如 0.02 表示 2%
  target: number; // 目标金额
  startDate: Date; // 开始日期
}

interface YearlyRecord {
  year: number; // 第几年
  date: string; // 日期（年份）
  interest: number; // 当年利息
  saved: number; // 当年存入
  total: number; // 年末总额
}

function calculateSavingPlan(config: SavingConfig): {
  records: YearlyRecord[];
  yearsNeeded: number;
  finalAmount: number;
} {
  const { yearlySaving, annualRate, target, startDate } = config;

  const records: YearlyRecord[] = [];
  let balance = 0;
  let year = 0;

  while (balance < target) {
    year++;
    const interest = balance * annualRate; // 年初余额产生的利息
    balance = balance + interest + yearlySaving; // 利息 + 新存入

    const currentDate = new Date(startDate);
    currentDate.setFullYear(startDate.getFullYear() + year);

    records.push({
      year,
      date: currentDate.getFullYear().toString(),
      interest: Math.round(interest * 100) / 100,
      saved: yearlySaving,
      total: Math.round(balance * 100) / 100,
    });

    // 防止死循环（比如利率为负等极端情况）
    if (year > 500) {
      console.warn("⚠️ 超过500年仍未达标，请检查参数");
      break;
    }
  }

  return {
    records,
    yearsNeeded: year,
    finalAmount: records[records.length - 1]?.total ?? 0,
  };
}

// ========== 运行 ==========

const config: SavingConfig = {
  yearlySaving: 100000, // 每年攒 10 万
  annualRate: 0.05, // 年化 2%
  target: 1000000, // 目标 250 万
  startDate: new Date("2026-01-01"),
};

const result = calculateSavingPlan(config);

// 打印表格
console.log("=".repeat(72));
console.log(
  `📋 攒钱计划：每年存 ${config.yearlySaving.toLocaleString()} 元 | 年化 ${(config.annualRate * 100).toFixed(1)}% | 目标 ${config.target.toLocaleString()} 元`,
);
console.log(`📅 开始日期：${config.startDate.getFullYear()} 年`);
console.log("=".repeat(72));
console.log(
  "年份".padStart(6) +
    "当年利息".padStart(14) +
    "当年存入".padStart(14) +
    "年末总额".padStart(16),
);
console.log("-".repeat(72));

for (const r of result.records) {
  console.log(
    `${r.date}年`.padStart(6) +
      r.interest.toLocaleString().padStart(14) +
      r.saved.toLocaleString().padStart(14) +
      r.total.toLocaleString().padStart(16),
  );
}

console.log("=".repeat(72));
console.log(
  `🎯 结论：需要 ${result.yearsNeeded} 年，最终金额为 ${result.finalAmount.toLocaleString()} 元`,
);
console.log(
  `📅 达成年份：${config.startDate.getFullYear() + result.yearsNeeded} 年`,
);
console.log(
  `💰 总投入本金：${(result.yearsNeeded * config.yearlySaving).toLocaleString()} 元`,
);
console.log(
  `📈 总利息收益：${(result.finalAmount - result.yearsNeeded * config.yearlySaving).toLocaleString()} 元`,
);
