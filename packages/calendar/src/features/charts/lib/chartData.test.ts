import { describe, expect, it } from "vitest";

import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartTemplate } from "../data/types";
import {
  buildNumericChartData,
  buildRecordCalendarData,
  buildTextChartData,
  type ChartRange,
} from "./chartData";

function calendar(): CalendarData {
  return {
    version: 1,
    templates: [
      {
        code: "weight",
        title: "体重",
        kind: "number",
        unit: "kg",
        color: "#1d4ed8",
        desc: "",
        sortOrder: 0,
      },
      {
        code: "mood",
        title: "心情",
        kind: "text",
        unit: "",
        color: "#ec4899",
        desc: "",
        sortOrder: 1,
      },
    ],
    events: {
      "2026-07-30": { weight: 80 },
      "2026-08-01": { weight: 78 },
      "2026-08-02": { weight: 76 },
      "2026-08-03": { mood: "平静" },
      "2026-08-04": { weight: 77 },
      "2026-08-05": { mood: "开心" },
      "2026-08-06": { mood: "平静" },
    },
    chartTemplates: [],
  };
}

function numericTemplate(
  metrics: ChartTemplate["metrics"],
): ChartTemplate {
  return {
    code: "weight-overview",
    title: "体重概览",
    eventCode: "weight",
    kind: "numeric",
    chartType: "line",
    metrics,
    desc: "",
    sortOrder: 0,
  };
}

function textTemplate(): ChartTemplate {
  return {
    code: "mood-table",
    title: "心情记录",
    eventCode: "mood",
    kind: "text",
    chartType: "table",
    metrics: [],
    desc: "",
    sortOrder: 1,
  };
}

const range: ChartRange = {
  startDate: "2026-08-01",
  endDate: "2026-08-05",
};

describe("buildNumericChartData", () => {
  it("生成每日点并在缺失日期留空", () => {
    const data = buildNumericChartData(
      numericTemplate(["daily"]),
      calendar(),
      range,
    );

    expect(data.dates).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
    ]);
    expect(data.series[0].points.map((point) => point.value)).toEqual([
      78,
      76,
      null,
      77,
      null,
    ]);
    expect(data.unit).toBe("kg");
    expect(data.valueCount).toBe(3);
  });

  it("7 日均允许回看案例开始前", () => {
    const data = buildNumericChartData(
      numericTemplate(["avg7"]),
      calendar(),
      range,
    );

    expect(data.series[0].points[0].value).toBeCloseTo(79);
    expect(data.series[0].points[1].value).toBeCloseTo(78);
    expect(data.series[0].points[4].value).toBeCloseTo(77.75);
  });

  it("变化率只在有记录的日期计算，并使用上一条记录", () => {
    const data = buildNumericChartData(
      numericTemplate(["changeRate"]),
      calendar(),
      range,
    );

    expect(data.unit).toBe("%");
    expect(data.series[0].points[0].value).toBeCloseTo(-2.5);
    expect(data.series[0].points[1].value).toBeCloseTo(-2.5641, 3);
    expect(data.series[0].points[2].value).toBeNull();
    expect(data.series[0].points[3].value).toBeCloseTo(1.3158, 3);
  });

  it("支持多字段和公式字段", () => {
    const calendarData = calendar();
    calendarData.templates.push({
      code: "diet",
      title: "饮食",
      kind: "number",
      unit: "kcal",
      color: "#f97316",
      desc: "",
      sortOrder: 2,
      fields: [
        { code: "carbs", label: "碳水", unit: "g", color: "#0f766e", kind: "input", showInCalendar: true },
        { code: "protein", label: "蛋白质", unit: "g", color: "#b45309", kind: "input", showInCalendar: true },
        { code: "fat", label: "脂肪", unit: "g", color: "#7c3aed", kind: "input", showInCalendar: true },
        {
          code: "calories",
          label: "热量",
          unit: "kcal",
          color: "#c2410c",
          kind: "formula",
          formula: "carbs * 4 + protein * 4 + fat * 9",
          showInCalendar: true,
        },
      ],
    });
    calendarData.events["2026-08-01"] = { diet: { carbs: 180, protein: 120, fat: 60 } };

    const data = buildNumericChartData(
      {
        code: "diet-chart",
        title: "饮食",
        eventCode: "diet",
        kind: "numeric",
        chartType: "bar",
        series: [
          { fieldCode: "carbs", operation: "raw" },
          { fieldCode: "protein", operation: "raw" },
          { fieldCode: "calories", operation: "raw" },
        ],
        stacked: true,
        desc: "",
        sortOrder: 0,
      },
      calendarData,
      range,
    );

    expect(data.series.map((series) => series.fieldCode)).toEqual([
      "carbs",
      "protein",
      "calories",
    ]);
    expect(data.series[0].points[0].value).toBe(180);
    expect(data.series[2].points[0].value).toBe(1740);
    expect(data.series[0].color).toBe("#0f766e");
  });

  it("支持月度净变化、周内平均、分布和记录质量", () => {
    const base = {
      code: "analysis",
      title: "分析",
      eventCode: "weight",
      kind: "numeric" as const,
      chartType: "bar" as const,
      analysisFields: ["value"],
      desc: "",
      sortOrder: 0,
    };
    const monthly = buildNumericChartData(
      { ...base, analysis: "monthlyDelta" },
      calendar(),
      range,
    );
    const weekday = buildNumericChartData(
      { ...base, analysis: "weekdayAverage" },
      calendar(),
      range,
    );
    const distribution = buildNumericChartData(
      { ...base, analysis: "distribution" },
      calendar(),
      range,
    );
    const quality = buildNumericChartData(
      { ...base, analysis: "recordQuality" },
      calendar(),
      range,
    );

    expect(monthly.dates).toEqual(["2026-08"]);
    expect(monthly.series[0].points[0].value).toBe(-1);
    expect(weekday.dates).toEqual([
      "周日",
      "周一",
      "周二",
      "周三",
      "周四",
      "周五",
      "周六",
    ]);
    expect(distribution.dates.length).toBeGreaterThan(0);
    expect(distribution.valueCount).toBe(3);
    expect(quality.dates).toEqual(["2026-08"]);
    expect(quality.series[0].points[0].value).toBe(3);
  });

  it("月净变化只统计案例区间内的记录", () => {
    const data = buildNumericChartData(
      {
        code: "monthly",
        title: "月度净变化",
        eventCode: "weight",
        kind: "numeric",
        chartType: "bar",
        analysis: "monthlyDelta",
        analysisFields: ["value"],
        desc: "",
        sortOrder: 0,
      },
      calendar(),
      { startDate: "2026-08-02", endDate: "2026-08-05" },
    );

    expect(data.series[0].points[0].value).toBe(1);
  });

  it("周净变化只统计案例区间内的记录", () => {
    const calendarData = calendar();
    calendarData.events["2026-08-08"] = { weight: 90 };

    const data = buildNumericChartData(
      {
        code: "weekly",
        title: "周净变化",
        eventCode: "weight",
        kind: "numeric",
        chartType: "bar",
        analysis: "weeklyDelta",
        analysisFields: ["value"],
        desc: "",
        sortOrder: 0,
      },
      calendarData,
      range,
    );

    expect(data.series[0].points.at(-1)?.value).toBe(1);
  });

  it("空区间返回空值", () => {
    const data = buildNumericChartData(
      numericTemplate(["daily"]),
      calendar(),
      { startDate: "2026-09-01", endDate: "2026-09-02" },
    );

    expect(data.valueCount).toBe(0);
  });
});

describe("buildRecordCalendarData", () => {
  it("按月生成记录日历并统计有记录天数", () => {
    const data = buildRecordCalendarData(
      calendar(),
      "weight",
      { startDate: "2026-07-30", endDate: "2026-08-02" },
    );

    expect(data.months.map((month) => month.label)).toEqual([
      "2026年7月",
      "2026年8月",
    ]);
    expect(data.recordedDays).toBe(3);
    expect(data.totalDays).toBe(4);
    expect(data.months[1].days[1].hasRecord).toBe(true);
  });
});

describe("buildTextChartData", () => {
  it("只保留案例区间内的文本记录并统计分布", () => {
    const data = buildTextChartData(textTemplate(), calendar(), range);

    expect(data.rows).toEqual([
      { date: "2026-08-03", value: "平静" },
      { date: "2026-08-05", value: "开心" },
    ]);
    expect(data.distribution).toEqual([
      { value: "平静", count: 1 },
      { value: "开心", count: 1 },
    ]);
    expect(data.total).toBe(2);
  });
});