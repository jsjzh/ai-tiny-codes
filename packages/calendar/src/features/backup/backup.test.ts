import { describe, expect, it } from "vitest";

import {
  createDefaultCalendarData,
  type CalendarData,
} from "@/features/calendar/data/types";
import {
  createDefaultChartsData,
  type ChartsData,
} from "@/features/charts/data/types";

import { BACKUP_APP, createBackup, parseBackup } from "./backup";

function data(): { calendar: CalendarData; charts: ChartsData } {
  const calendar = createDefaultCalendarData();
  calendar.templates = [
    {
      code: "weight",
      title: "体重",
      kind: "number",
      unit: "kg",
      color: "#1d4ed8",
      desc: "",
      sortOrder: 0,
    },
  ];
  calendar.events = {
    "2026-10-28": { weight: 82.3 },
  };

  const charts = createDefaultChartsData();
  charts.templates = [
    {
      code: "weight-overview",
      title: "体重趋势",
      eventCode: "weight",
      kind: "numeric",
      chartType: "line",
      metrics: ["daily"],
      desc: "",
      sortOrder: 0,
    },
  ];

  return { calendar, charts };
}

describe("backup", () => {
  it("导出并解析完整备份", () => {
    const { calendar, charts } = data();
    const text = JSON.stringify(createBackup(calendar, charts));
    const parsed = parseBackup(text);

    expect(parsed.calendar.events).toEqual({
      "2026-10-28": { weight: 82.3 },
    });
    expect(parsed.charts.templates[0].code).toBe("weight-overview");
  });

  it("拒绝非 JSON", () => {
    expect(() => parseBackup("not-json")).toThrow("JSON 格式错误");
  });

  it("拒绝其他应用的备份", () => {
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: "other-app",
          calendar: createDefaultCalendarData(),
          charts: createDefaultChartsData(),
        }),
      ),
    ).toThrow("不是日历备份文件");
  });

  it("拒绝缺少数据的文件", () => {
    expect(() =>
      parseBackup(JSON.stringify({ app: BACKUP_APP })),
    ).toThrow("缺少 calendar 或 charts");
  });
});