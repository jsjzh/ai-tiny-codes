import { describe, expect, it } from "vitest";

import { parseEventImport } from "./importEvents";

const weightTemplate = {
  code: "weight",
  title: "体重",
  kind: "number" as const,
};

const moodTemplate = {
  code: "mood",
  title: "心情",
  kind: "text" as const,
};

describe("parseEventImport", () => {
  it("解析 keepstrong weights.json 的 logs", () => {
    const result = parseEventImport(
      JSON.stringify({
        kind: "weight",
        logs: [
          {
            dayStr: "20261026",
            value: 73.2,
            unit: "kg",
          },
          {
            dayStr: "20261028",
            value: 72.8,
            unit: "kg",
          },
        ],
      }),
      weightTemplate,
      "weights.json",
    );

    expect(result.format).toBe("json");
    expect(result.sourceUnit).toBe("kg");
    expect(result.rows).toEqual([
      { date: "2026-10-26", value: 73.2 },
      { date: "2026-10-28", value: 72.8 },
    ]);
  });

  it("解析对象数组、日期映射和模板 code", () => {
    const fromArray = parseEventImport(
      JSON.stringify([{ date: "2026/10/27", value: "73.5" }]),
      weightTemplate,
    );
    const fromMap = parseEventImport(
      JSON.stringify({ "2026-10-28": { weight: 73.1 } }),
      weightTemplate,
    );

    expect(fromArray.rows).toEqual([
      { date: "2026-10-27", value: 73.5 },
    ]);
    expect(fromMap.rows).toEqual([
      { date: "2026-10-28", value: 73.1 },
    ]);
  });

  it("解析 CSV 并按日期去重", () => {
    const result = parseEventImport(
      [
        "date,value",
        "2026-10-27,73.4",
        "2026-10-28,73.0",
        "2026-10-28,72.9",
        "bad-date,70",
      ].join("\n"),
      weightTemplate,
      "weight.csv",
    );

    expect(result.format).toBe("csv");
    expect(result.rows).toEqual([
      { date: "2026-10-27", value: 73.4 },
      { date: "2026-10-28", value: 72.9 },
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(1);
  });

  it("读取单事项导出文件", () => {
    const result = parseEventImport(
      JSON.stringify({
        app: "ai-tiny-codes/calendar-events",
        version: 1,
        template: { code: "weight", title: "体重", kind: "number", unit: "kg" },
        events: {
          "2026-10-27": 73.5,
          "2026-10-28": 73.1,
        },
      }),
      weightTemplate,
      "体重.json",
    );

    expect(result.rows).toEqual([
      { date: "2026-10-27", value: 73.5 },
      { date: "2026-10-28", value: 73.1 },
    ]);
  });

  it("文本模板保留文本值", () => {
    const result = parseEventImport(
      JSON.stringify([
        { date: "2026-10-27", value: "平静" },
        { date: "2026-10-28", value: " " },
      ]),
      moodTemplate,
    );

    expect(result.rows).toEqual([
      { date: "2026-10-27", value: "平静" },
    ]);
    expect(result.invalidCount).toBe(1);
  });
});