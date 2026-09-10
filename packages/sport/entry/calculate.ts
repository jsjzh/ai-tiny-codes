import { createRunner } from "../src/core/runner";
import { CalculateCli } from "../src/calculate/input/cli";
import { CalculateJsonOutput } from "../src/calculate/output/json";
import { CalculateTableOutput } from "../src/calculate/output/table";
import { calculate } from "../src/calculate";
import { CalculateInput, CalculateReport } from "../src/calculate/types";
import { InputPort, OutputPort } from "../src/core/types";

const runner = createRunner<CalculateInput, CalculateReport>(calculate);
const input: InputPort<CalculateInput> = new CalculateCli();
const output: OutputPort<CalculateReport> = process.argv.includes("--json")
  ? new CalculateJsonOutput()
  : new CalculateTableOutput();

runner.use(input, output);
