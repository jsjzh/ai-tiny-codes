import { describe, expect, it } from "vitest";

import { getChartTheme } from "@/features/theme/theme";

import type { NumericChartData } from "./chartData";
import { buildNumericChartOption } from "./echartsOption";

function data(): NumericChartData {
  return {
    dates: ["2026-10-01", "2026-10-02", "2026-10-03"],
    series: [
      {
        metric: "daily",
        points: [
          { date: "2026-10-01", value: 80 },
          { date: "2026-10-02", value: null },
          { date: "2026-10-03", value: 78 },
        ],
      },
      {
        metric: "avg7",
        points: [
          { date: "2026-10-01", value: 79 },
          { date: "2026-10-02", value: 78.5 },
          { date: "2026-10-03", value: 78 },
        ],
      },
    ],
    min: 77,
    max: 81,
    unit: "kg",
    valueCount: 5,
  };
}

describe("buildNumericChartOption", () => {
  it("生成折线图、图例和滚轮缩放", () => {
    const option = buildNumericChartOption({
      data: data(),
      chartType: "line",
      color: "#1d4ed8",
    }) as {
      series: Array<Record<string, unknown>>;
      dataZoom: Array<Record<string, unknown>>;
      xAxis: { data: string[] };
      legend: { show: boolean };
    };

    expect(option.xAxis.data).toHaveLength(3);
    expect(option.series[0].type).toBe("line");
    expect(option.series[0].connectNulls).toBe(true);
    expect(option.series[1].lineStyle).toMatchObject({
      type: "dashed",
    });
    expect(option.legend.show).toBe(true);
    expect(option.dataZoom[0]).toMatchObject({
      type: "inside",
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
    });
    expect(option.dataZoom[1].type).toBe("slider");
  });

  it("柱状图使用 0 基线和柱系列", () => {
    const option = buildNumericChartOption({
      data: data(),
      chartType: "bar",
      color: "#1d4ed8",
    }) as {
      series: Array<Record<string, unknown>>;
      yAxis: { min: number };
      xAxis: { boundaryGap: boolean };
    };

    expect(option.series[0].type).toBe("bar");
    expect(option.yAxis.min).toBe(0);
    expect(option.xAxis.boundaryGap).toBe(true);
  });

  it("面积图带区域填充", () => {
    const option = buildNumericChartOption({
      data: data(),
      chartType: "area",
      color: "#1d4ed8",
    }) as {
      series: Array<Record<string, unknown>>;
    };

    expect(option.series[0].areaStyle).toMatchObject({
      color: "#1d4ed8",
    });
  });

  it("使用主题色板", () => {
    const option = buildNumericChartOption({
      data: data(),
      chartType: "line",
      color: "#1d4ed8",
      theme: getChartTheme("night"),
    }) as {
      tooltip: { backgroundColor: string; borderColor: string };
      yAxis: { axisLabel: { color: string } };
    };

    expect(option.tooltip.backgroundColor).toBe("#161b22");
    expect(option.tooltip.borderColor).toBe("#30363d");
    expect(option.yAxis.axisLabel.color).toBe("#8b949e");
  });
});