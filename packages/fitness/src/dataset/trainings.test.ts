import { describe, expect, it } from "vitest";

import {
  countRemovedTrainingRecords,
  mergeTrainingRecords,
} from "./trainings";
import type { SyncedTrainingFile, SyncedTrainingRecord } from "./types";

function record(id: string, dayStr: string): SyncedTrainingRecord {
  return {
    id,
    recordType: "strength",
    source: "lianlian",
    status: "completed",
    trainingType: "template",
    dayStr,
    name: id,
    durationSeconds: 60,
    capacity: 0,
    calorie: 1,
    statsCount: 0,
    statsDistance: 0,
    actions: [],
  };
}

function previous(): SyncedTrainingFile {
  return {
    kind: "training",
    source: "keepstrong",
    syncedAt: "2026-01-01T00:00:00.000Z",
    range: { from: "20260501", to: "20260531" },
    records: [record("old", "20260510"), record("outside", "20260401")],
  };
}

describe("mergeTrainingRecords", () => {
  it("窗口内以源端为准，窗口外保留", () => {
    const next = mergeTrainingRecords(
      previous(),
      [record("new", "20260511"), record("old", "20260512")],
      { from: "20260501", to: "20260531" }
    );

    expect(next.records.map((item) => item.id)).toEqual([
      "outside",
      "new",
      "old",
    ]);
  });
});

describe("countRemovedTrainingRecords", () => {
  it("统计窗口内被源端删除的记录", () => {
    expect(
      countRemovedTrainingRecords(
        previous(),
        [record("new", "20260511")],
        { from: "20260501", to: "20260531" }
      )
    ).toBe(1);
  });
});
