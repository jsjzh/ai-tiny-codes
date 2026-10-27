import { afterEach, describe, expect, it, vi } from "vitest";

import { buildMonthMatrix } from "./monthGrid";

afterEach(() => {
  vi.useRealTimers();
});

describe("buildMonthMatrix", () => {
  it("固定 6 行，从周日起始、到周六结束", () => {
    const weeks = buildMonthMatrix(2026, 9);

    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe("2026-09-27");
    expect(weeks[0][0].weekday).toBe(0);
    expect(weeks.at(-1)?.[6].date).toBe("2026-11-07");
    expect(weeks.at(-1)?.[6].weekday).toBe(6);
  });

  it("2 月从周日开始、到周六结束，前后各补一周", () => {
    const weeks = buildMonthMatrix(2026, 1);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][0].date).toBe("2026-01-25");
    expect(weeks.at(-1)?.[6].date).toBe("2026-03-07");
  });

  it("闰年 2 月也保持 6 行", () => {
    const weeks = buildMonthMatrix(2028, 1);
    const dates = weeks.flat().map((day) => day.date);

    expect(weeks).toHaveLength(6);
    expect(dates).toContain("2028-02-29");
    expect(weeks[0][0].date).toBe("2028-01-30");
    expect(weeks.at(-1)?.[6].date).toBe("2028-03-11");
  });

  it("月初是周六时保留上个月最后一周", () => {
    const weeks = buildMonthMatrix(2026, 7);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][0].date).toBe("2026-07-26");
    expect(weeks[0][6].date).toBe("2026-08-01");
    expect(weeks.at(-1)?.[6].date).toBe("2026-09-05");
  });

  it("自然只有 5 行的月份向后补到 6 行", () => {
    const weeks = buildMonthMatrix(2026, 8);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][0].date).toBe("2026-08-30");
    expect(weeks.at(-1)?.[6].date).toBe("2026-10-10");
  });

  it("2025 年 10 月与 11 月都固定 6 行", () => {
    const october = buildMonthMatrix(2025, 9);
    const november = buildMonthMatrix(2025, 10);

    expect(october).toHaveLength(6);
    expect(november).toHaveLength(6);
    expect(october[0][0].date).toBe("2025-09-28");
    expect(october.at(-1)?.[6].date).toBe("2025-11-08");
    expect(november[0][0].date).toBe("2025-10-26");
    expect(november.at(-1)?.[6].date).toBe("2025-12-06");
  });

  it("每个月都固定 6 行", () => {
    for (const year of [2025, 2026, 2028]) {
      for (let month = 0; month < 12; month += 1) {
        expect(buildMonthMatrix(year, month)).toHaveLength(6);
      }
    }
  });

  it("正确标记本月与今天", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 27, 12));

    const weeks = buildMonthMatrix(2026, 9);
    const days = weeks.flat();
    const today = days.find((day) => day.isToday);

    expect(today?.date).toBe("2026-10-27");
    expect(days.find((day) => day.date === "2026-09-27")?.inCurrentMonth).toBe(false);
    expect(days.find((day) => day.date === "2026-10-01")?.inCurrentMonth).toBe(true);
    expect(days.find((day) => day.date === "2026-11-01")?.inCurrentMonth).toBe(false);
  });
});
