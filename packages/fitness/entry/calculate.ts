import { createRunner } from "../src/core/runner";
import { CalculateCli } from "../src/calculate/input/cli";
import { CalculateJsonOutput } from "../src/calculate/output/json";
import { CalculateTableOutput } from "../src/calculate/output/table";
import { calculate } from "../src/calculate";
import { CalculateInput, CalculateReport } from "../src/calculate/types";
import { InputPort, OutputPort } from "../src/core/types";
import { SavePlanOutput } from "../src/plan/save-output";

const runner = createRunner<CalculateInput, CalculateReport>(calculate);
const input: InputPort<CalculateInput> = new CalculateCli();
const inner: OutputPort<CalculateReport> = process.argv.includes("--json")
  ? new CalculateJsonOutput()
  : new CalculateTableOutput();
const output: OutputPort<CalculateReport> = process.argv.includes("--no-save")
  ? inner
  : new SavePlanOutput(inner);

runner.use(input, output);
