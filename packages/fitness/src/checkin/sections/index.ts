import { TrackContext, TrackSection } from "../types";
import { checkpointsSection } from "./checkpoints";
import { overviewSection } from "./overview";
import { rateSection } from "./rate";
import { progressSection } from "./progress";
import { bmiSection } from "./bmi";
import { trendSection } from "./trend";
import { adviceSection } from "./advice";

export type SectionBuilder = (ctx: TrackContext) => TrackSection | null;

/** 输出插槽注册表：想增删/调整指标，改这里即可 */
export const SECTION_BUILDERS: SectionBuilder[] = [
  checkpointsSection,
  overviewSection,
  rateSection,
  progressSection,
  bmiSection,
  trendSection,
  adviceSection,
];
