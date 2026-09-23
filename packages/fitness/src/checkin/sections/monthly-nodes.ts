import { TrackContext, TrackSection } from "../types";
import { buildNodeSection } from "./node-table";

export function monthlyNodesSection(ctx: TrackContext): TrackSection | null {
  return buildNodeSection(ctx, { kind: "month", perDays: 30, key: "monthlyNodes", unitLabel: "月节点" });
}
