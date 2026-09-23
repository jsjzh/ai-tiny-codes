import { TrackContext, TrackSection } from "../types";
import { buildNodeSection } from "./node-table";

export function weeklyNodesSection(ctx: TrackContext): TrackSection | null {
  return buildNodeSection(ctx, { kind: "week", perDays: 7, key: "weeklyNodes", unitLabel: "周节点" });
}
