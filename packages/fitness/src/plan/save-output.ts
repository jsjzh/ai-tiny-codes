import { confirm } from "@inquirer/prompts";
import { CalculateReport } from "../calculate/types";
import { OutputPort } from "../core/types";
import { datasRelative } from "../utils/project";
import { countFilledDaily, loadPlan, planName, savePlan } from "./store";

/**
 * 输出装饰器：先交给内层输出（表格/JSON），再落盘计划 JSON。
 * 若同名计划已存在且已填每日数据，默认不覆盖（避免辛苦记录的 daily 丢失），需 --force 或交互确认。
 */
export class SavePlanOutput implements OutputPort<CalculateReport> {
  constructor(private readonly inner: OutputPort<CalculateReport>) {}

  async write(result: CalculateReport): Promise<void> {
    await this.inner.write(result);

    const name = planName(result);
    const existing = loadPlan(name);
    const filled = countFilledDaily(existing);
    const json = process.argv.includes("--json");

    if (existing && filled > 0 && !process.argv.includes("--force")) {
      let overwrite = false;
      if (process.argv.includes("--input")) {
        overwrite = false; // 非交互场景不能提问，默认不覆盖
      } else {
        overwrite = await confirm({
          message: `计划 ${name} 已存在且已填 ${filled} 天每日数据，覆盖会丢失这些数据，是否覆盖？`,
          default: false,
        });
      }
      if (!overwrite) {
        if (!json) {
          console.log("");
          console.log("⚠ 已存在含每日数据的计划，未覆盖（保留原有 dailyWeights）。如需覆盖请加 --force");
        }
        return;
      }
    }

    savePlan(result);
    if (!json) {
      console.log("");
      console.log(`✓ 计划已保存：${datasRelative("fitness", "plans", `${name}.json`)}`);
    }
  }
}
