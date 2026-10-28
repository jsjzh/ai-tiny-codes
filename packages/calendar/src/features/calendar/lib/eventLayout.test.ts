import { describe, expect, it } from "vitest";

import { getDayCellLayout } from "./eventLayout";

describe("getDayCellLayout", () => {
  it("1440x900 下两列各 4 条", () => {
    expect(getDayCellLayout(205, 132, true)).toMatchObject({
      columns: 2,
      rows: 4,
      maxVisible: 8,
    });
  });

  it("1920x1080 下两列各 5 条", () => {
    expect(getDayCellLayout(274, 162, true)).toMatchObject({
      columns: 2,
      rows: 5,
      maxVisible: 10,
    });
  });

  it("窄屏 PC 退回单列", () => {
    expect(getDayCellLayout(146, 132, true)).toMatchObject({
      columns: 1,
      rows: 4,
      maxVisible: 4,
    });
  });

  it("390x844 移动端 5 条", () => {
    expect(getDayCellLayout(55, 124, false)).toMatchObject({
      columns: 1,
      rows: 5,
      maxVisible: 5,
    });
  });

  it("320x700 移动端按高度降到 3 条", () => {
    expect(getDayCellLayout(45, 92, false)).toMatchObject({
      columns: 1,
      rows: 3,
      maxVisible: 3,
    });
  });
});
