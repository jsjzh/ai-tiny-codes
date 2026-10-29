import { describe, expect, it } from "vitest";

import {
  countEventsOnDates,
  deleteAllEventsOnDates,
  deleteEventKeys,
  formatEventValue,
  getEventsForDate,
  getEventsForDates,
  parseEventInput,
  upsertEvents,
} from "./events";
import type { CalendarData } from "./types";

function sampleData(): CalendarData {
  return {
    version: 1,
    templates: [
      {
        code: "mood",
        title: "心情",
        kind: "text",
        unit: "",
        color: "#ec4899",
        desc: "",
        sortOrder: 1,
      },
      {
        code: "weight",
        title: "体重",
        kind: "number",
        unit: "kg",
        color: "#2563eb",
        desc: "",
        sortOrder: 0,
      },
    ],
    events: {
      "2026-10-27": { weight: 75.2, mood: "平静" },
      "2026-10-28": { weight: 75 },
    },
    chartTemplates: [],
  };
}

describe("calendar events", () => {
  it("reads day events by template sortOrder", () => {
    const events = getEventsForDate(sampleData(), "2026-10-27");

    expect(events.map((event) => event.code)).toEqual(["weight", "mood"]);
    expect(events[0].value).toBe(75.2);
  });

  it("reads events for non-contiguous dates", () => {
    const events = getEventsForDates(sampleData(), ["2026-10-28", "2026-10-27"]);

    expect(events.map((event) => `${event.date}:${event.code}`)).toEqual([
      "2026-10-27:weight",
      "2026-10-27:mood",
      "2026-10-28:weight",
    ]);
  });

  it("upserts events and adds new days", () => {
    const next = upsertEvents(sampleData(), [
      { date: "2026-10-28", code: "mood", value: "开心" },
      { date: "2026-10-29", code: "weight", value: 74.8 },
    ]);

    expect(next.events["2026-10-28"]).toEqual({
      weight: 75,
      mood: "开心",
    });
    expect(next.events["2026-10-29"]).toEqual({ weight: 74.8 });
  });

  it("rejects wrong value types", () => {
    expect(() =>
      upsertEvents(sampleData(), [{ date: "2026-10-28", code: "weight", value: "75" }]),
    ).toThrow("值类型不正确");
  });

  it("deletes keys and removes empty days", () => {
    const next = deleteEventKeys(sampleData(), [
      { date: "2026-10-27", code: "weight" },
      { date: "2026-10-27", code: "mood" },
      { date: "2026-10-28", code: "weight" },
    ]);

    expect(next.events).toEqual({});
  });

  it("deletes all events on selected dates", () => {
    const next = deleteAllEventsOnDates(sampleData(), ["2026-10-27"]);

    expect(next.events["2026-10-27"]).toBeUndefined();
    expect(next.events["2026-10-28"]).toEqual({ weight: 75 });
  });

  it("counts events on dates", () => {
    expect(countEventsOnDates(sampleData(), ["2026-10-27", "2026-10-28"])).toBe(3);
  });

  it("parses number and text input", () => {
    const data = sampleData();
    const weight = data.templates.find((template) => template.code === "weight")!;
    const mood = data.templates.find((template) => template.code === "mood")!;

    expect(parseEventInput(weight, " 75.5 ")).toBe(75.5);
    expect(parseEventInput(weight, "")).toBeNull();
    expect(parseEventInput(weight, "abc")).toBeNull();
    expect(parseEventInput(mood, " 平静 ")).toBe("平静");
    expect(parseEventInput(mood, "  ")).toBeNull();
  });

  it("formats values with units", () => {
    expect(formatEventValue({ kind: "number", title: "体重", unit: "kg", color: "#000", fields: [] }, 75.2)).toBe("75.2 kg");
    expect(formatEventValue({ kind: "text", title: "心情", unit: "", color: "#000", fields: [] }, "平静")).toBe("平静");
  });

  it("紧凑格式化多字段和公式字段", () => {
    const template = {
      kind: "number" as const,
      title: "饮食",
      unit: "kcal",
      color: "#f97316",
      fields: [
        { code: "carbs", label: "碳水", unit: "g", color: "#0f766e", kind: "input" as const, showInCalendar: true },
        { code: "protein", label: "蛋白质", unit: "g", color: "#b45309", kind: "input" as const, showInCalendar: true },
        { code: "fat", label: "脂肪", unit: "g", color: "#7c3aed", kind: "input" as const, showInCalendar: true },
        { code: "calories", label: "热量", unit: "kcal", color: "#c2410c", kind: "formula" as const, formula: "carbs*4+protein*4+fat*9", showInCalendar: true },
      ],
    };

    expect(
      formatEventValue(template, { carbs: 180, protein: 120, fat: 60 }),
    ).toBe("180/120/60g·1740kcal");
  });
});
