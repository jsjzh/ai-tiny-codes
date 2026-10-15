import fs from "node:fs";
import path from "node:path";
import { DashboardPayload, DashboardWeight, buildDashboardHtml } from "../src/dashboard/build";
import { buildCheckinViewModel } from "../src/checkin/view-model";
import { loadWeightFile } from "../src/dataset/weights";
import { toDashed } from "../src/dataset/types";
import { listPlans, loadPlan } from "../src/plan/store";
import { datasDir, datasRelative } from "../src/utils/project";

/** 剔除疑似录入异常：与相邻 5 点中位数相差超过 8kg 的记录 */
function cleanOutliers(list: DashboardWeight[]): {
  keep: DashboardWeight[];
  removed: DashboardWeight[];
} {
  const vals = list.map((w) => w.kg);
  const keep: DashboardWeight[] = [];
  const removed: DashboardWeight[] = [];
  for (let i = 0; i < list.length; i++) {
    const win = vals
      .slice(Math.max(0, i - 2), Math.min(vals.length, i + 3))
      .slice()
      .sort((a, b) => a - b);
    const median = win[Math.floor(win.length / 2)];
    if (Math.abs(vals[i] - median) > 8) removed.push(list[i]);
    else keep.push(list[i]);
  }
  return { keep, removed };
}

function pickPlan(argv: string[]): string | null {
  const idx = argv.indexOf("--plan");
  if (idx >= 0) return argv[idx + 1] ?? null;
  if (argv.includes("--no-plan")) return null;

  const names = listPlans();
  let best: string | null = null;
  let bestTs = "";
  for (const name of names) {
    const plan = loadPlan(name);
    if (plan && plan.createdAt > bestTs) {
      bestTs = plan.createdAt;
      best = name;
    }
  }
  return best;
}

function main(): void {
  const argv = process.argv.slice(2);

  const file = loadWeightFile();
  if (!file || file.logs.length === 0) {
    throw new Error("没有同步数据，请先运行 pnpm fitness:sync");
  }

  const raw = file.logs
    .map((log) => ({ date: toDashed(log.dayStr), kg: log.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const cleaned = cleanOutliers(raw);

  const planName = pickPlan(argv);
  const plan = planName ? loadPlan(planName) : null;

  const payload: DashboardPayload = {
    generatedAt: new Date().toISOString(),
    weights: cleaned.keep,
    removedOutliers: cleaned.removed,
    plan: plan
      ? {
          name: planName as string,
          startDate: plan.input.startDate,
          targetDate: plan.report.estimatedGoalDate,
          startKg: plan.input.weightKg,
          targetKg: plan.input.targetWeightKg,
          heightCm: plan.input.heightCm,
        }
      : null,
    checkin: plan && planName ? buildCheckinViewModel(planName, plan) : null,
  };

  const outDir = datasDir("fitness", "dashboard");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), buildDashboardHtml(payload), "utf-8");

  console.log(
    `✓ 体重大盘已生成：${datasRelative("fitness", "dashboard", "index.html")}（${cleaned.keep.length} 天${
      plan ? `，叠加计划 ${planName}` : "，无计划"
    }${cleaned.removed.length ? `，剔除异常 ${cleaned.removed.length} 条` : ""}）`
  );
}

main();