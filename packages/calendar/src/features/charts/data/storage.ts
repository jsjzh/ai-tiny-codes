import {
  createDefaultChartsData,
  normalizeChartsData,
  type ChartsData,
} from "./types";

const STORAGE_KEY = "ai-tiny-codes:charts";

function readLocalData(): ChartsData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeChartsData(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

function writeLocalData(data: ChartsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadChartsData(): Promise<ChartsData> {
  try {
    const response = await fetch("/api/charts", { cache: "no-store" });

    if (response.ok) {
      return normalizeChartsData(await response.json());
    }
  } catch {}

  return readLocalData() ?? createDefaultChartsData();
}

export async function saveChartsData(data: ChartsData): Promise<void> {
  const body = JSON.stringify(data);

  try {
    const response = await fetch("/api/charts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      writeLocalData(data);
      return;
    }

    if (response.status !== 404 && response.status !== 405) {
      throw new Error(`图表数据保存失败（${response.status}）`);
    }
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }
  }

  writeLocalData(data);
}