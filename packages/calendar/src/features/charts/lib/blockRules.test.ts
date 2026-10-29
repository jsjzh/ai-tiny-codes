import { describe, expect, it } from "vitest";

import type { CalendarData } from "@/features/calendar/data/types";

import type { CalendarBlock } from "../data/types";
import { resolveBlockResult } from "./blockRules";

const caseRange = { startDate: "2026-08-01", endDate: "2026-09-01" };

function calendar(): CalendarData {
  return {
    version: 1,
    templates: [
      {
        code: "weight",
        title: "体重",
        kind: "number",
        unit: "kg",
        color: "#2563eb",
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
      "2026-07-20": { weight: 78 },
      "2026-08-01": { weight: 76 },
      "2026-08-05": { mood: "平静" },
      "2026-08-10": { weight: 75 },
      "2026-08-20": { weight: 74 },
      "2026-08-25": { mood: "开心" },
      "2026-09-10": { weight: 73 },
    },
    chartTemplates: [],
  };
}

function block(
  rule: CalendarBlock["rule"],
  eventCode: string | null = "weight",
  info = "",
): CalendarBlock {
  return {
    id: "b1",
    title: "测试块",
    info,
    eventCode,
    rule,
  };
}

describe("resolveBlockResult", () => {
  it("latest 默认跟随案例范围", () => {
    const result = resolveBlockResult(
      block({ type: "latest", range: { type: "case" } }),
      calendar(),
      caseRange,
    );

    expect(result).toMatchObject({
      status: "ok",
      value: "74",
      unit: "kg",
      date: "2026-08-20",
    });
  });

  it("all 可以读取案例外数据", () => {
    const result = resolveBlockResult(
      block({ type: "latest", range: { type: "all" } }),
      calendar(),
      caseRange,
    );

    expect(result).toMatchObject({
      status: "ok",
      value: "73",
      rangeLabel: "全部历史",
      exceedsCase: true,
    });
  });

  it("lastDays 以案例内最新数据为终点，并允许回看案例前", () => {
    const result = resolveBlockResult(
      block({
        type: "latest",
        range: { type: "lastDays", days: 30 },
      }),
      calendar(),
      caseRange,
    );

    expect(result).toMatchObject({
      status: "ok",
      value: "74",
      rangeLabel: "近 30 天",
      exceedsCase: true,
    });
  });

  it("计算最大、最小、累计减重和变化", () => {
    const max = resolveBlockResult(
      block({ type: "max", range: { type: "case" } }),
      calendar(),
      caseRange,
    );
    const min = resolveBlockResult(
      block({ type: "min", range: { type: "case" } }),
      calendar(),
      caseRange,
    );
    const loss = resolveBlockResult(
      block({ type: "loss", range: { type: "case" } }),
      calendar(),
      caseRange,
    );
    const change = resolveBlockResult(
      block({ type: "change", range: { type: "case" } }),
      calendar(),
      caseRange,
    );

    expect(max.value).toBe("76");
    expect(min.value).toBe("74");
    expect(loss.value).toBe("2");
    expect(change.value).toBe("-2");
  });

  it("计算 BMI 和距离目标", () => {
    const bmi = resolveBlockResult(
      block({ type: "bmi", range: { type: "case" }, heightCm: 175 }),
      calendar(),
      caseRange,
    );
    const distance = resolveBlockResult(
      block({
        type: "distanceToTarget",
        range: { type: "case" },
        target: 70,
      }),
      calendar(),
      caseRange,
    );

    expect(bmi).toMatchObject({ status: "ok", value: "24.16", unit: "" });
    expect(distance).toMatchObject({ status: "ok", value: "4", unit: "kg" });
  });

  it("文本事项支持最新值", () => {
    const result = resolveBlockResult(
      block(
        { type: "latest", range: { type: "case" } },
        "mood",
      ),
      calendar(),
      caseRange,
    );

    expect(result).toMatchObject({
      status: "ok",
      value: "开心",
      unit: "",
      date: "2026-08-25",
    });
  });

  it("固定值不依赖事件", () => {
    const result = resolveBlockResult(
      block(
        { type: "fixed", value: "100", unit: "kcal" },
        null,
        "固定目标",
      ),
      calendar(),
      caseRange,
    );

    expect(result).toMatchObject({
      status: "ok",
      value: "100",
      unit: "kcal",
      info: "固定目标",
    });
  });

  it("事项删除后软失效", () => {
    const result = resolveBlockResult(
      block({ type: "latest", range: { type: "case" } }, "missing"),
      calendar(),
      caseRange,
    );

    expect(result).toMatchObject({
      status: "invalid",
      value: "--",
      info: "引用的事项已删除",
    });
  });

  it("BMI 缺少身高时提示参数错误", () => {
    const result = resolveBlockResult(
      block({ type: "bmi", range: { type: "case" } }),
      calendar(),
      caseRange,
    );

    expect(result.status).toBe("missing-params");
  });
});
describe("generic block rules", () => {
  function dietCalendar(): CalendarData {
    const data = calendar();
    data.templates.push({
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
    data.events["2026-08-01"] = { diet: { carbs: 180, protein: 120, fat: 60 } };
    data.events["2026-08-02"] = { diet: { carbs: 160, protein: 110, fat: 50 } };
    data.events["2026-08-03"] = { diet: { carbs: 200, protein: 130, fat: 70 } };
    return data;
  }

  it("按字段计算合计、平均和连续记录", () => {
    const sum = resolveBlockResult(
      block(
        { type: "sum", fieldCode: "calories", range: { type: "case" } },
        "diet",
      ),
      dietCalendar(),
      caseRange,
    );
    const average = resolveBlockResult(
      block(
        { type: "average", fieldCode: "carbs", range: { type: "case" } },
        "diet",
      ),
      dietCalendar(),
      caseRange,
    );
    const streak = resolveBlockResult(
      block(
        { type: "streak", fieldCode: "carbs", range: { type: "case" } },
        "diet",
      ),
      dietCalendar(),
      caseRange,
    );

    expect(sum).toMatchObject({ status: "ok", value: "5220" });
    expect(average).toMatchObject({ status: "ok", value: "180" });
    expect(streak).toMatchObject({ status: "ok", value: "3", unit: "天" });
  });
});
