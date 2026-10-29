import { describe, expect, it } from "vitest";

import {
  countTemplateUsage,
  createDefaultCalendarData,
  generateTemplateCode,
  normalizeCalendarData,
  removeTemplateFromData,
  validateTemplateDraft,
  type CalendarData,
} from "./types";

function sampleData(): CalendarData {
  return {
    version: 1,
    templates: [
      {
        code: "weight",
        title: "体重",
        kind: "number",
        unit: "kg",
        color: "#0f766e",
        desc: "",
        sortOrder: 0,
      },
      {
        code: "mood",
        title: "心情",
        kind: "text",
        unit: "",
        color: "#be123c",
        desc: "",
        sortOrder: 1,
      },
    ],
    events: {
      "2026-10-27": { weight: 75.2, mood: "平静" },
      "2026-10-28": { weight: 75 },
    },
    chartTemplates: [],
  };
}

describe("calendar data", () => {
  it("normalizes valid templates and events", () => {
    const data = normalizeCalendarData(sampleData());

    expect(data.templates).toHaveLength(2);
    expect(data.events["2026-10-27"]).toEqual({ weight: 75.2, mood: "平静" });
  });

  it("drops invalid templates and events for missing templates", () => {
    const data = normalizeCalendarData({
      version: 1,
      templates: [
        { code: "weight", title: "体重", kind: "number", unit: "kg" },
        { code: "", title: "空 code", kind: "number" },
      ],
      events: {
        "2026-10-27": { weight: 75.2, missing: "x" },
        bad: { weight: 1 },
      },
    });

    expect(data.templates.map((template) => template.code)).toEqual(["weight"]);
    expect(data.events).toEqual({ "2026-10-27": { weight: 75.2 } });
  });

  it("sorts templates by sortOrder", () => {
    const data = normalizeCalendarData({
      templates: [
        { code: "b", title: "B", kind: "text", sortOrder: 2 },
        { code: "a", title: "A", kind: "text", sortOrder: 1 },
      ],
      events: {},
    });

    expect(data.templates.map((template) => template.code)).toEqual(["a", "b"]);
  });

  it("normalizes multi-field values and computed fields", () => {
    const data = normalizeCalendarData({
      version: 1,
      templates: [
        {
          code: "diet",
          title: "饮食",
          kind: "number",
          unit: "kcal",
          fields: [
            { code: "carbs", label: "碳水", unit: "g", kind: "input" },
            { code: "protein", label: "蛋白质", unit: "g", kind: "input" },
            { code: "fat", label: "脂肪", unit: "g", kind: "input" },
            {
              code: "calories",
              label: "热量",
              unit: "kcal",
              kind: "formula",
              formula: "carbs * 4 + protein * 4 + fat * 9",
            },
          ],
        },
      ],
      events: {
        "2026-10-28": {
          diet: { carbs: 180, protein: 120, fat: 60 },
        },
      },
    });

    expect(data.events["2026-10-28"].diet).toEqual({
      carbs: 180,
      protein: 120,
      fat: 60,
    });
    expect(data.templates[0].fields).toHaveLength(4);
  });

  it("generates a unique template code", () => {
    const templates = [{ code: "tpl_abc123" }, { code: "custom" }];
    const code = generateTemplateCode(templates);

    expect(code.startsWith("tpl_")).toBe(true);
    expect(templates.some((template) => template.code === code)).toBe(false);
  });

  it("counts usage and removes a template with its events", () => {
    const data = sampleData();

    expect(countTemplateUsage(data, "weight")).toBe(2);
    expect(countTemplateUsage(data, "mood")).toBe(1);

    const next = removeTemplateFromData(data, "weight");

    expect(next.templates.map((template) => template.code)).toEqual(["mood"]);
    expect(next.templates[0].sortOrder).toBe(0);
    expect(next.events["2026-10-27"]).toEqual({ mood: "平静" });
    expect(next.events["2026-10-28"]).toBeUndefined();
  });

  it("validates empty titles, invalid codes and duplicates", () => {
    const data = createDefaultCalendarData();
    data.templates = [
      {
        code: "dup",
        title: "",
        kind: "number",
        unit: "",
        color: "#000000",
        desc: "",
        sortOrder: 0,
      },
      {
        code: "dup",
        title: "重复",
        kind: "text",
        unit: "",
        color: "#000000",
        desc: "",
        sortOrder: 1,
      },
      {
        code: "中文 code",
        title: "非法",
        kind: "number",
        unit: "",
        color: "#000000",
        desc: "",
        sortOrder: 2,
      },
    ];

    const errors = validateTemplateDraft(data);

    expect(errors.get("dup")).toContain("标题不能为空");
    expect(errors.get("中文 code")).toContain(
      "code 只能包含字母、数字、下划线和短横线",
    );
  });
});
