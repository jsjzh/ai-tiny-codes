import { describe, expect, it } from "vitest";

import { PRESET_COLORS } from "./colors";
import { nextNewTemplateTitle, randomPresetColor } from "./defaults";

describe("template defaults", () => {
  it("increments new template titles", () => {
    expect(nextNewTemplateTitle([])).toBe("新事项 1");
    expect(
      nextNewTemplateTitle([
        { title: "体重" },
        { title: "新事项 2" },
        { title: "新事项 5" },
      ]),
    ).toBe("新事项 6");
  });

  it("returns a preset color", () => {
    expect(PRESET_COLORS).toContain(randomPresetColor());
  });
});
