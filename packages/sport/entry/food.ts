import { createRunner } from "../src/core/runner";
import { FoodCli } from "../src/food/input/cli";
import { FoodJsonOutput } from "../src/food/output/json";
import { FoodTableOutput } from "../src/food/output/table";
import { buildFoodReport } from "../src/food";
import { FoodRequest, FoodReport } from "../src/food/types";
import { InputPort, OutputPort } from "../src/core/types";

const runner = createRunner<FoodRequest, FoodReport>(buildFoodReport);
const input: InputPort<FoodRequest> = new FoodCli();
const output: OutputPort<FoodReport> = process.argv.includes("--json")
  ? new FoodJsonOutput()
  : new FoodTableOutput();

runner.use(input, output);
