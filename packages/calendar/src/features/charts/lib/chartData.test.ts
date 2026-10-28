import { describe, expect, it } from "vitest";

import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartTemplate } from "../data/types";
import {
  buildNumericChartData,
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

  it("空区间返回空值", () => {
    const data = buildNumericChartData(
      numericTemplate(["daily"]),
      calendar(),
      { startDate: "2026-09-01", endDate: "2026-09-02" },
    );

    expect(data.valueCount).toBe(0);
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