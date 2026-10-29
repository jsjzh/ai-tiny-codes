import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME,
  getChartTheme,
  isThemeId,
  resolveChartColor,
  THEME_DEFINITIONS,
} from "./theme";

describe("theme", () => {
  it("定义了 5 套唯一主题", () => {
    const ids = THEME_DEFINITIONS.map((theme) => theme.id);

    expect(new Set(ids).size).toBe(5);
    expect(ids).toContain(DEFAULT_THEME);
    expect(isThemeId("night")).toBe(true);
    expect(isThemeId("unknown")).toBe(false);
  });

  it("Night 使用深色图表色板", () => {
    expect(getChartTheme("night").isDark).toBe(true);
    expect(getChartTheme("blueprint").isDark).toBe(false);
  });

  it("深色主题提亮事件颜色，浅色主题保持原色", () => {
    const original = "#1d4ed8";

    expect(resolveChartColor("blueprint", original)).toBe(original);
    expect(resolveChartColor("night", original)).not.toBe(original);
    expect(resolveChartColor("night", original)).toMatch(/^#[0-9a-f]{6}$/);
  });
});