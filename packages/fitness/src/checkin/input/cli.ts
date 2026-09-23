import { select } from "@inquirer/prompts";
import { InputPort } from "../../core/types";
import { listPlans, loadPlan } from "../../plan/store";

function describe(name: string): string {
  const plan = loadPlan(name);
  if (!plan) return name;
  const { weightKg, targetWeightKg, startDate, pace } = plan.input;
  return `${weightKg}→${targetWeightKg}kg ｜ ${startDate} ｜ ${pace} ｜ ${name}`;
}

export class CheckinCli implements InputPort<string> {
  async read(argv: string[] = process.argv.slice(2)): Promise<string> {
    const names = listPlans();
    if (names.length === 0) {
      console.log("");
      console.log("没有找到任何计划，请先运行：pnpm fitness:calculate");
      process.exit(0);
    }

    const idx = argv.indexOf("--plan");
    const chosen = idx !== -1 ? argv[idx + 1] : undefined;
    if (chosen) {
      if (!names.includes(chosen)) {
        throw new Error(`计划不存在：${chosen}\n可选：${names.join("、")}`);
      }
      return chosen;
    }

    if (names.length === 1) {
      console.log("");
      console.log(`使用计划：${describe(names[0])}`);
      return names[0];
    }

    return select<string>({
      message: "选择要 checkin 的计划",
      choices: names.map((n) => ({ name: describe(n), value: n })),
    });
  }
}
