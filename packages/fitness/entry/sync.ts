import path from "node:path";
import { loadEnvFile } from "@ai-tiny-codes/keepstrong";
import { newTable, printSection } from "@ai-tiny-codes/utils";
import { CheckinCli } from "../src/checkin/input/cli";
import { SyncReport, syncPlanWeights } from "../src/sync";
import { findProjectRoot } from "../src/utils/project";

function render(report: SyncReport): void {
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("");
  console.log("==================== 同步练练体重 ====================");
  const t = newTable(["指标", "数值"], ["left", "right"]);
  t.push(
    ["计划", report.planName],
    ["范围", `${report.startDate} ~ ${report.endDate}`],
    ["拉到记录", `${report.fetched} 天`],
    ["新增日期", String(report.added)],
    ["填充待填", String(report.filled)],
    ["覆盖更新", String(report.updated)],
    ["无变化", String(report.unchanged)],
    ["最早 / 最新", `${report.firstFilled ?? "—"} / ${report.lastFilled ?? "—"}`],
    ["模式", report.dryRun ? "dry-run（未写入）" : "已写入计划"]
  );
  printSection("结果", t);
  console.log("");
  console.log("=====================================================");
}

async function main(): Promise<void> {
  loadEnvFile(path.join(findProjectRoot(), ".env.local"));

  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const planName = await new CheckinCli().read(argv);
  const report = await syncPlanWeights(planName, { dryRun });
  render(report);
}

main().catch((err: unknown) => {
  console.error("");
  console.error("✗ 同步失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});