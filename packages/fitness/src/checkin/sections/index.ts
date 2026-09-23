import { TrackContext, TrackSection } from "../types";
import { weeklyNodesSection } from "./weekly-nodes";
import { monthlyNodesSection } from "./monthly-nodes";
import { weightSection } from "./weight";
import { rateSection } from "./rate";
import { progressSection } from "./progress";
import { bmiSection } from "./bmi";
import { trendSection } from "./trend";
import { adviceSection } from "./advice";

export type SectionBuilder = (ctx: TrackContext) => TrackSection | null;

/** 输出插槽注册表：想增删/调整指标，改这里即可 */
export const SECTION_BUILDERS: SectionBuilder[] = [
  weeklyNodesSection,
  monthlyNodesSection,
  weightSection,
  rateSection,
  progressSection,
  bmiSection,
  trendSection,
  adviceSection,
];
