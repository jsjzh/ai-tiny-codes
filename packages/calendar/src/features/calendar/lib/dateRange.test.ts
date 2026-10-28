import { describe, expect, it } from "vitest";

import { formatDateChip, isContiguousDates, summarizeDates } from "./dateRange";

describe("date range", () => {
  it("detects contiguous dates", () => {
    expect(
      isContiguousDates(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"]),
    ).toBe(true);
    expect(isContiguousDates(["2026-10-06", "2026-10-08", "2026-10-10"])).toBe(false);
  });

  it("summarizes a single date", () => {
    const summary = summarizeDates(["2026-10-06"]);

    expect(summary.label).toBe("2026年10月6日，周二");
    expect(summary.isRange).toBe(false);
  });

  it("summarizes a contiguous range", () => {
    const summary = summarizeDates([
      "2026-10-08",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);

    expect(summary.label).toBe("2026-10-05 ~ 2026-10-08 · 4 天");
    expect(summary.dates).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
    ]);
    expect(summary.isRange).toBe(true);
  });

  it("summarizes non-contiguous dates", () => {
    const summary = summarizeDates(["2026-10-10", "2026-10-06", "2026-10-08"]);

    expect(summary.label).toBe("已选 3 天");
    expect(summary.dates).toEqual(["2026-10-06", "2026-10-08", "2026-10-10"]);
    expect(summary.isRange).toBe(false);
  });

  it("formats date chips", () => {
    expect(formatDateChip("2026-10-06")).toBe("10-06 周二");
  });
});
