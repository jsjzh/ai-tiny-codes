import { describe, expect, it } from "vitest";

import type { CalendarData } from "../src/features/calendar/data/types";
import {
  publishKeepStrongData,
  summarizeTrainingRecords,
} from "./syncKeepStrong";

function calendar(): CalendarData {
  return {
    version: 1,
    templates: [
      {
        code: "tpl_j2eudg",
        title: "体重",
        kind: "number",
        unit: "kg",
        color: "#1d4ed8",
        desc: "",
        sortOrder: 0,
      },
    ],
    events: {
      "2026-05-01": {
        tpl_training: { sessions: 1 },
        keep: "manual",
      },
      "2026-05-13": {
        tpl_training: { sessions: 1 },
        tpl_training_content: "旧训练",
        tpl_j2eudg: 82,
      },
      "2026-05-14": {
        tpl_training: { sessions: 1 },
        keep: "manual",
      },
    },
    chartTemplates: [],
  };
}

describe("summarizeTrainingRecords", () => {
  it("合并同日多次训练并统计容量、组数、次数和有氧距离", () => {
    const days = summarizeTrainingRecords([
      {
        id: "a",
        dayStr: "20260513",
        name: "腿臀",
        durationSeconds: 1200,
        calorie: 120,
        capacity: 1000,
        statsDistance: 0,
        actions: [
          {
            groups: [
              { weight: "60", reps: "10" },
              { weight: "", reps: "5" },
            ],
          },
        ],
      },
      {
        id: "b",
        dayStr: "20260513",
        name: "散步",
        durationSeconds: 600,
        calorie: 60,
        capacity: 0,
        statsDistance: 2.5,
        actions: [],
      },
    ]);

    expect(days).toEqual([
      {
        dayStr: "20260513",
        sessions: 2,
        minutes: 30,
        calories: 180,
        volume: 1000,
        sets: 2,
        reps: 15,
        distance: 2.5,
        names: ["腿臀", "散步"],
      },
    ]);
  });
});

describe("publishKeepStrongData", () => {
  it("写入训练日汇总、内容并删除同步窗口内失效训练", () => {
    const data = calendar();
    const report = publishKeepStrongData(
      data,
      {
        range: { from: "20260513", to: "20260601" },
        records: [
          {
            id: "a",
            dayStr: "20260513",
            name: "腿臀",
            durationSeconds: 1800,
            calorie: 180,
            capacity: 2500,
            statsDistance: 0,
            actions: [{ groups: [{ weight: "50", reps: "10" }] }],
          },
        ],
      },
      {
        logs: [
          { dayStr: "20260513", value: 82.1 },
          { dayStr: "20260512", value: 82.3 },
        ],
      },
      { dryRun: true },
    );

    expect(report.templatesCreated).toBe(2);
    expect(report.training).toMatchObject({
      records: 1,
      days: 1,
      added: 0,
      updated: 1,
      removed: 1,
    });
    expect(report.weight).toMatchObject({
      logs: 2,
      added: 1,
      updated: 1,
      unchanged: 0,
    });
    expect(data.events["2026-05-01"]).toEqual({
      tpl_training: { sessions: 1 },
      keep: "manual",
    });
    expect(data.events["2026-05-14"]).toEqual({ keep: "manual" });
    expect(data.events["2026-05-13"].tpl_training).toMatchObject({
      sessions: 1,
      minutes: 30,
      calories: 180,
      volume: 2500,
      sets: 1,
      reps: 10,
    });
    expect(data.events["2026-05-13"].tpl_training_content).toBe("腿臀");
    expect(data.events["2026-05-13"].tpl_j2eudg).toBe(82.1);
    expect(data.events["2026-05-12"].tpl_j2eudg).toBe(82.3);
  });
});
