import { loadPlan } from "../plan/store";
import { buildContext } from "./analyze";
import { SECTION_BUILDERS } from "./sections";
import { validationSection } from "./sections/validation";
import { TrackReport, TrackSection } from "./types";
import { validatePlanFile } from "./validate";

export function buildTrackReport(planName: string): TrackReport {
  const plan = loadPlan(planName);
  if (!plan) throw new Error(`读取计划失败：${planName}`);

  const validation = validatePlanFile(plan);
  const sections: TrackSection[] = [validationSection(validation)];

  const ctx = buildContext(planName, plan);
  if (validation.errors.length === 0) {
    if (ctx.daily.length === 0) {
      sections.push({
        key: "empty",
        title: "暂无每日数据",
        lines: ["还没有体重数据：先运行 pnpm fitness:sync 从练练健身同步（或手填计划里的 dailyWeights）"],
        level: "warn",
      });
    }

    for (const build of SECTION_BUILDERS) {
      const s = build(ctx);
      if (s) sections.push(s);
    }
  }

  return { planName, sections };
}

export * from "./types";
