import {
  createDefaultCalendarData,
  normalizeCalendarData,
  type CalendarData,
} from "./types";

const STORAGE_KEY = "ai-tiny-codes:calendar";

function readLocalData(): CalendarData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeCalendarData(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

function writeLocalData(data: CalendarData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 不可用时忽略，开发环境仍可通过 /api/calendar 持久化
  }
}

export async function loadCalendarData(): Promise<CalendarData> {
  try {
    const response = await fetch("/api/calendar", { cache: "no-store" });

    if (response.ok) {
      return normalizeCalendarData(await response.json());
    }
  } catch {
    // 网络或静态部署环境下走 localStorage
  }

  return readLocalData() ?? createDefaultCalendarData();
}

export async function saveCalendarData(data: CalendarData): Promise<void> {
  const body = JSON.stringify(data);

  try {
    const response = await fetch("/api/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      writeLocalData(data);
      return;
    }

    if (response.status !== 404 && response.status !== 405) {
      throw new Error(`保存失败（${response.status}）`);
    }
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }
  }

  writeLocalData(data);
}
