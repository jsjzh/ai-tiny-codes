import path from "node:path";
import dayjs from "dayjs";
import { loadEnvFile } from "@ai-tiny-codes/keepstrong";
import { newTable, printSection } from "@ai-tiny-codes/utils";
import {
  SyncTrainingsReport,
  SyncWeightsReport,
  syncTrainings,
  syncWeights,
} from "../src/sync";
import { datasRelative, findProjectRoot } from "../src/utils/project";

type SyncOnly = "weight" | "training" | "all";

function argOf(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function normalizeOnly(value: string): SyncOnly {
  if (value === "trainings") return "training";
  if (value === "weight" || value === "training" || value === "all") return value;
  throw new Error(`不支持的 --only ${value}（可选 weight / training / all）`);
}

function renderWeight(report: SyncWeightsReport): void {
  const t = newTable(["指标", "数值"], ["left", "right"]);
  t.push(
    ["类型", "体重"],
    ["范围", `${report.from} ~ ${report.to}`],
    ["本次拉到", `${report.fetched} 天`],
    ["新增", String(report.added)],
    ["覆盖更新", String(report.updated)],
    ["删除", String(report.removed)],
    ["无变化", String(report.unchanged)],
    ["合并后总计", `${report.total} 天（${report.first ?? "—"} ~ ${report.last ?? "—"}）`],
    ["文件", datasRelative("fitness", "synced", "weights.json")],
    ["模式", report.dryRun ? "dry-run（未写入）" : "已写入"]
  );
  printSection("体重", t);
}

function renderTraining(report: SyncTrainingsReport): void {
  const t = newTable(["指标", "数值"], ["left", "right"]);
  t.push(
    ["类型", "训练"],
    ["范围", `${report.from} ~ ${report.to}`],
    ["本次拉到", `${report.fetched} 条`],
    ["新增", String(report.added)],
    ["覆盖更新", String(report.updated)],
    ["删除", String(report.removed)],
    ["无变化", String(report.unchanged)],
    ["合并后总计", `${report.total} 条 / ${report.days} 天（${report.first ?? "—"} ~ ${report.last ?? "—"}）`],
    ["文件", datasRelative("fitness", "synced", "trainings.json")],
    ["模式", report.dryRun ? "dry-run（未写入）" : "已写入"]
  );
  printSection("训练", t);
}

async function syncWeightRange(
  from: string,
  to: string,
  dryRun: boolean
): Promise<SyncWeightsReport> {
  try {
    return await syncWeights({ from, to, dryRun });
  } catch (err) {
    const matched =
      err instanceof Error
        ? err.message.match(/earliest allowed date \((\d{8})\)/)
        : null;
    if (!matched) throw err;
    const earliest = `${matched[1].slice(0, 4)}-${matched[1].slice(4, 6)}-${matched[1].slice(6, 8)}`;
    if (earliest <= from) throw err;
    return syncWeights({ from: earliest, to, dryRun });
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const only = normalizeOnly(argOf(argv, "--only") ?? "weight");
  const to = argOf(argv, "--to") ?? dayjs().format("YYYY-MM-DD");
  const all = argv.includes("--all");
  const days = Number(argOf(argv, "--days") ?? 365);
  const from =
    argOf(argv, "--from") ??
    (all
      ? dayjs(to).subtract(3, "year").format("YYYY-MM-DD")
      : dayjs(to).subtract(days - 1, "day").format("YYYY-MM-DD"));

  loadEnvFile(path.join(findProjectRoot(), ".env.local"));

  const dryRun = argv.includes("--dry-run");
  let weight: SyncWeightsReport | null = null;
  let training: SyncTrainingsReport | null = null;

  if (only === "weight" || only === "all") {
    weight = await syncWeightRange(from, to, dryRun);
  }

  if (only === "training" || only === "all") {
    training = await syncTrainings({ from, to, dryRun });
  }

  const json = argv.includes("--json");
  if (json) {
    console.log(JSON.stringify(only === "all" ? { weight, training } : (weight ?? training), null, 2));
    return;
  }

  console.log("");
  console.log("==================== 同步练练数据 ====================");
  if (weight) renderWeight(weight);
  if (training) renderTraining(training);
  console.log("=====================================================");
}

main().catch((err: unknown) => {
  console.error("");
  console.error("✗ 同步失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});
