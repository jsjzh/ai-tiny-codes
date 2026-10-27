import { afterEach, describe, expect, it, vi } from "vitest";

import { buildMonthMatrix } from "./monthGrid";

afterEach(() => {
  vi.useRealTimers();
});

describe("buildMonthMatrix", () => {
  it("从周日起始、到周六结束，并补齐整周", () => {
    const weeks = buildMonthMatrix(2026, 9);

    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe("2026-09-27");
    expect(weeks[0][0].weekday).toBe(0);
    expect(weeks[4][6].date).toBe("2026-10-31");
    expect(weeks[4][6].weekday).toBe(6);
  });

  it("2 月从周日开始且正好 28 天时只占 4 行", () => {
    const weeks = buildMonthMatrix(2026, 1);

    expect(weeks).toHaveLength(4);
    expect(weeks[0][0].date).toBe("2026-02-01");
    expect(weeks[3][6].date).toBe("2026-02-28");
  });

  it("闰年 2 月补齐 5 行", () => {
    const weeks = buildMonthMatrix(2028, 1);
    const dates = weeks.flat().map((day) => day.date);

    expect(weeks).toHaveLength(5);
    expect(dates).toContain("2028-02-29");
    expect(weeks[0][0].date).toBe("2028-01-30");
    expect(weeks[4][6].date).toBe("2028-03-04");
  });

  it("月初是周六时向前补 6 天，共 6 行", () => {
    const weeks = buildMonthMatrix(2026, 7);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][0].date).toBe("2026-07-26");
    expect(weeks[0][6].date).toBe("2026-08-01");
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
  });
});
