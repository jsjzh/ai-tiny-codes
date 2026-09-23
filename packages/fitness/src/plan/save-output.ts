import { CalculateReport } from "../calculate/types";
import { OutputPort } from "../core/types";
import { datasRelative } from "../utils/project";
import { planName, savePlan } from "./store";

/**
 * 输出装饰器：先交给内层输出（表格/JSON），再落盘计划 JSON。
 * 体重数据不在计划里，直接覆盖同名计划即可。
 */
export class SavePlanOutput implements OutputPort<CalculateReport> {
  constructor(private readonly inner: OutputPort<CalculateReport>) {}

  async write(result: CalculateReport): Promise<void> {
    await this.inner.write(result);

    const name = savePlan(result);
    if (!process.argv.includes("--json")) {
      console.log("");
      console.log(`✓ 计划已保存：${datasRelative("fitness", "plans", `${name}.json`)}`);
    }
  }
}