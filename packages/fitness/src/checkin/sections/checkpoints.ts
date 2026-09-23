import { TrackContext, TrackSection } from "../types";

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function checkpointsSection(ctx: TrackContext): TrackSection {
  const prevByKind: Record<"week" | "month", number | null> = { week: null, month: null };

  const rows = ctx.checkpoints.map((c) => {
    const kindLabel = c.kind === "week" ? "周" : "月";
    const base = [kindLabel, String(c.index), c.date, c.planWeightKg.toFixed(2)];

    if (c.actualWeightKg === null || c.actualWeightKg === undefined) {
      return [...base, "—", "—", "—", "—"];
    }

    const actual = c.actualWeightKg;
    const deviation = actual - c.planWeightKg;
    const cumLoss = ctx.startWeightKg - actual;
    const prev = prevByKind[c.kind];
    const delta = prev === null ? "—" : signed(actual - prev);
    prevByKind[c.kind] = actual;

    return [...base, actual.toFixed(2), signed(deviation), cumLoss.toFixed(2), delta];
  });

  return {
    key: "checkpoints",
    title: "计划 vs 实际（周 / 月节点）",
    head: ["类型", "序号", "日期", "计划(kg)", "实际(kg)", "偏差(kg)", "累计减重(kg)", "环比(kg)"],
    colAligns: ["left", "right", "left", "right", "right", "right", "right", "right"],
    rows,
  };
}
