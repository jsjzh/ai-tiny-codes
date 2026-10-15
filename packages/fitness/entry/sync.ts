import path from "node:path";
import dayjs from "dayjs";
import { loadEnvFile } from "@ai-tiny-codes/keepstrong";
import { newTable, printSection } from "@ai-tiny-codes/utils";
import { SyncWeightsReport, syncWeights } from "../src/sync";
import { datasRelative, findProjectRoot } from "../src/utils/project";

function argOf(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function render(report: SyncWeightsReport, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("");
  console.log("==================== 同步练练数据 ====================");
  const t = newTable(["指标", "数值"], ["left", "right"]);
  t.push(
    ["类型", report.kind],
    ["范围", `${report.from} ~ ${report.to}`],
    ["本次拉到", `${report.fetched} 天`],
    ["新增", String(report.added)],
    ["覆盖更新", String(report.updated)],
    ["无变化", String(report.unchanged)],
    ["合并后总计", `${report.total} 天（${report.first ?? "—"} ~ ${report.last ?? "—"}）`],
    ["文件", datasRelative("fitness", "synced", "weights.json")],
    ["模式", report.dryRun ? "dry-run（未写入）" : "已写入"]
  );
  printSection("结果", t);
  console.log("");
  console.log("=====================================================");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const only = argOf(argv, "--only") ?? "weight";
  if (only !== "weight") {
    throw new Error(`暂不支持 --only ${only}（目前仅 weight）`);
  }

  const to = argOf(argv, "--to") ?? dayjs().format("YYYY-MM-DD");
  const all = argv.includes("--all");
  const days = Number(argOf(argv, "--days") ?? 365);
  const from =
    argOf(argv, "--from") ??
    (all
      ? dayjs(to).subtract(3, "year").format("YYYY-MM-DD") // 接口上限：近 3 年
      : dayjs(to).subtract(days - 1, "day").format("YYYY-MM-DD"));

  loadEnvFile(path.join(findProjectRoot(), ".env.local"));

  const dryRun = argv.includes("--dry-run");
  let report: SyncWeightsReport;
  try {
    report = await syncWeights({ from, to, dryRun });
  } catch (err) {
    // 接口可能限制不早于某天（earliest allowed date (yyyyMMdd)），自动夹到该日期重试
    const matched = err instanceof Error ? err.message.match(/earliest allowed date \((\d{8})\)/) : null;
    if (!matched) throw err;
    const earliest = `${matched[1].slice(0, 4)}-${matched[1].slice(4, 6)}-${matched[1].slice(6, 8)}`;
    if (earliest <= from) throw err;
    report = await syncWeights({ from: earliest, to, dryRun });
  }
  render(report, argv.includes("--json"));
}

main().catch((err: unknown) => {
  console.error("");
  console.error("✗ 同步失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});