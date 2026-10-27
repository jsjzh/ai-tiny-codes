import { afterEach, describe, expect, it, vi } from "vitest";

import { buildMonthMatrix } from "./monthGrid";

afterEach(() => {
  vi.useRealTimers();
});

describe("buildMonthMatrix", () => {
  it("前后各保留一周，从周日起始、到周六结束", () => {
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

  it("闰年 2 月补齐 5 行", () => {
    const weeks = buildMonthMatrix(2028, 1);
    const dates = weeks.flat().map((day) => day.date);

    expect(weeks).toHaveLength(5);
    expect(dates).toContain("2028-02-29");
    expect(weeks[0][0].date).toBe("2028-01-30");
    expect(weeks.at(-1)?.[6].date).toBe("2028-03-04");
  });

  it("月初是周六时保留上个月最后一周", () => {
    const weeks = buildMonthMatrix(2026, 7);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][0].date).toBe("2026-07-26");
    expect(weeks[0][6].date).toBe("2026-08-01");
    expect(weeks.at(-1)?.[6].date).toBe("2026-09-05");
  });

  it("两头都已有相邻月日期时保持 5 行", () => {
    const weeks = buildMonthMatrix(2026, 8);

    expect(weeks).toHaveLength(5);
    expect(weeks[0][0].date).toBe("2026-08-30");
    expect(weeks.at(-1)?.[6].date).toBe("2026-10-03");
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
