import dayjs from "dayjs";

import type { CalendarData } from "@/features/calendar/data/types";
import { normalizeCalendarData } from "@/features/calendar/data/types";
import {
  normalizeChartsData,
  type ChartsData,
} from "@/features/charts/data/types";
import { downloadJson } from "@/lib/download";

export const BACKUP_APP = "ai-tiny-codes/calendar-backup";

export type BackupFile = {
  app: typeof BACKUP_APP;
  version: 1;
  exportedAt: string;
  calendar: CalendarData;
  charts: ChartsData;
};

export type ParsedBackup = {
  calendar: CalendarData;
  charts: ChartsData;
};

export function createBackup(
  calendar: CalendarData,
  charts: ChartsData,
): BackupFile {
  return {
    app: BACKUP_APP,
    version: 1,
    exportedAt: new Date().toISOString(),
    calendar,
    charts,
  };
}

export function downloadBackup(
  calendar: CalendarData,
  charts: ChartsData,
): void {
  const filename = `calendar-backup-${dayjs().format("YYYY-MM-DD-HHmm")}.json`;
  downloadJson(filename, createBackup(calendar, charts));
}

export function parseBackup(text: string): ParsedBackup {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("JSON 格式错误");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("不是有效的备份文件");
  }

  const raw = value as Record<string, unknown>;

  if (raw.app && raw.app !== BACKUP_APP) {
    throw new Error("不是日历备份文件");
  }

  if (!raw.calendar || !raw.charts) {
    throw new Error("备份文件缺少 calendar 或 charts");
  }

  return {
    calendar: normalizeCalendarData(raw.calendar),
    charts: normalizeChartsData(raw.charts),
  };
}
