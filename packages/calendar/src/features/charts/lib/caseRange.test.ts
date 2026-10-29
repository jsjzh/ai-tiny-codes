import { describe, expect, it } from "vitest";

import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartCase } from "../data/types";
import { resolveCaseRange } from "./caseRange";

function chartCase(rangeMode: ChartCase["rangeMode"]): ChartCase {
  return {
    id: "c1",
    name: "案例",
    startDate: "2020-01-01",
    endDate: "2030-12-31",
    rangeMode,
    eventCodes: ["weight"],
    rows: [{ slots: [null] }],
    createdAt: "",
    updatedAt: "",
  };
}

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
    ],
    events: {
      "2023-10-19": { weight: 87.8 },
      "2026-10-29": { weight: 82.3 },
    },
    chartTemplates: [],
  };
}

describe("resolveCaseRange", () => {
  it("全部历史取所选事项的实际数据范围", () => {
    expect(resolveCaseRange(chartCase("all"), calendar())).toMatchObject({
      startDate: "2023-10-19",
      endDate: "2026-10-29",
      isAll: true,
      hasData: true,
    });
  });

  it("自定义范围保留输入值", () => {
    expect(resolveCaseRange(chartCase("custom"), calendar())).toMatchObject({
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      isAll: false,
    });
  });

  it("无数据时回退到原日期", () => {
    const empty = calendar();
    empty.events = {};

    expect(resolveCaseRange(chartCase("all"), empty)).toMatchObject({
      startDate: "2020-01-01",
      endDate: "2030-12-31",
      isAll: true,
      hasData: false,
    });
  });
});
