import { describe, expect, it } from "vitest";

import {
  countChartTemplateUsage,
  removeChartTemplateFromData,
  type ChartCase,
  type ChartsData,
} from "./types";

function chartWidget(code: string) {
  return { kind: "chart" as const, chartTemplateCode: code, height: 2 as const };
}

function emptyWidget() {
  return null;
}

function chartCase(
  id: string,
  rows: ChartCase["rows"],
): ChartCase {
  return {
    id,
    name: id,
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    eventCodes: ["weight"],
    rows,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function data(): ChartsData {
  return {
    version: 1,
    templates: [
      {
        code: "weight",
        title: "体重概览",
        eventCode: "weight",
        kind: "numeric",
        chartType: "line",
        metrics: ["daily"],
        desc: "",
        sortOrder: 0,
      },
    ],
    cases: [
      chartCase("case-a", [
        { slots: [chartWidget("weight"), emptyWidget()] },
        { slots: [chartWidget("weight"), emptyWidget()] },
      ]),
      chartCase("case-b", [{ slots: [chartWidget("weight")] }]),
    ],
  };
}

describe("countChartTemplateUsage", () => {
  it("按案例去重，不按图表实例计数", () => {
    expect(countChartTemplateUsage(data(), "weight")).toBe(2);
  });
});

describe("removeChartTemplateFromData", () => {
  it("删除模板并清空所有案例中的对应图表", () => {
    const next = removeChartTemplateFromData(data(), "weight");

    expect(next.templates).toHaveLength(0);
    expect(
      next.cases.flatMap((chartCase) =>
        chartCase.rows.flatMap((row) => row.slots),
      ),
    ).toEqual([null, null, null, null, null]);
  });
});