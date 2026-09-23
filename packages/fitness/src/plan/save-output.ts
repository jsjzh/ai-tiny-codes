import { CalculateReport } from "../calculate/types";
import { OutputPort } from "../core/types";
import { datasRelative } from "../utils/project";
import { savePlan } from "./store";

/**
 * 输出装饰器：先落盘计划 JSON，再交给内层输出。
 * 保持端口模式，calculate 的 table/json 输出都不受影响。
 */
export class SavePlanOutput implements OutputPort<CalculateReport> {
  constructor(private readonly inner: OutputPort<CalculateReport>) {}

  write(result: CalculateReport): void {
    this.inner.write(result);
    const name = savePlan(result);
    if (!process.argv.includes("--json")) {
      console.log("");
      console.log(`✓ 计划已保存：${datasRelative("fitness", "plans", `${name}.json`)}`);
    }
  }
}
