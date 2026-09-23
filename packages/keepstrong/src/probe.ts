import fs from "node:fs";
import path from "node:path";
import * as api from "./api";
import { loadEnvFile } from "./env";

/** 从仓库根的 .env.local 读取环境变量（本地开发用） */
function loadRootEnv(): void {
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      loadEnvFile(path.join(dir, ".env.local"));
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

function dayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

async function probe(label: string, run: () => Promise<unknown>): Promise<void> {
  console.log(`\n========== ${label} ==========`);
  try {
    console.log(JSON.stringify(await run(), null, 2));
  } catch (err) {
    console.error(`✗ ${label} 失败：`, err instanceof Error ? err.message : err);
  }
}

async function main(): Promise<void> {
  loadRootEnv();

  const today = dayStr();
  const from = dayStr(30);

  await probe("getBodyProfile", () => api.getKeepStrongBodyProfile());
  await probe("getTrainingTemplates", () => api.getKeepStrongTrainingTemplates({ page: 1, pageSize: 2 }));
  await probe("getActions(卧推)", () => api.getKeepStrongActions({ keyword: "卧推", page: 1, pageSize: 2 }));
  await probe("getTrainingRecords", () =>
    api.getKeepStrongTrainingRecords({ startDate: from, endDate: today, page: 1, pageSize: 1 })
  );
  await probe("getRunningPlans", () => api.getKeepStrongRunningPlans());
  await probe("getBodyLogs(weight)", () =>
    api.getKeepStrongBodyLogs({ metric: "weight", startDate: from, endDate: today, page: 1, pageSize: 3 })
  );
  await probe("getFoodSearch(鸡胸)", () => api.getKeepStrongFoodSearch({ keyword: "鸡胸", pageSize: 2 }));
  await probe("getFoodFavorites", () => api.getKeepStrongFoodFavorites({ page: 1, pageSize: 2 }));
  await probe("getFoodMyFoods", () => api.getKeepStrongFoodMyFoods({ page: 1, pageSize: 2 }));
  await probe("getFoodLogs(today)", () => api.getKeepStrongFoodLogs({ dayStr: today }));

  // 动作历史需要先拿到一个 actionId
  const actions = await api.getKeepStrongActions({ keyword: "卧推", pageSize: 1 });
  const first = actions.list[0];
  if (first) {
    await probe(`getActionHistory(${first.id})`, () =>
      api.getKeepStrongActionHistory({ actionId: first.id, startDate: from, endDate: today, page: 1, pageSize: 1 })
    );
  }
}

main().catch((err: unknown) => {
  console.error("probe 失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});