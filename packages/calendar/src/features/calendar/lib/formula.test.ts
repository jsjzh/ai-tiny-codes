import { describe, expect, it } from "vitest";

import {
  evaluateFormula,
  parseFormula,
  validateFormula,
} from "./formula";

describe("formula", () => {
  it("计算四则运算和字段引用", () => {
    expect(
      evaluateFormula("carbs * 4 + protein * 4 + fat * 9", {
        carbs: 180,
        protein: 120,
        fat: 60,
      }),
    ).toBe(1740);
  });

  it("支持括号和一元负号", () => {
    expect(evaluateFormula("(weight - 70) * -1", { weight: 68 })).toBe(2);
  });

  it("除零返回 null", () => {
    expect(evaluateFormula("weight / 0", { weight: 70 })).toBeNull();
  });

  it("校验未知字段和语法错误", () => {
    expect(validateFormula("weight / (1.79 * 1.79)", new Set(["weight"]))).toBeNull();
    expect(validateFormula("missing + 1", new Set(["weight"]))).toBe(
      "未知字段：missing",
    );
    expect(parseFormula("weight +")).toMatchObject({ ok: false });
  });
});
