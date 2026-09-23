import { createRunner } from "../src/core/runner";
import { CheckinCli } from "../src/checkin/input/cli";
import { TrackJsonOutput } from "../src/checkin/output/json";
import { TrackTableOutput } from "../src/checkin/output/table";
import { buildTrackReport } from "../src/checkin";
import { TrackReport } from "../src/checkin/types";
import { InputPort, OutputPort } from "../src/core/types";

const runner = createRunner<string, TrackReport>(buildTrackReport);
const input: InputPort<string> = new CheckinCli();
const output: OutputPort<TrackReport> = process.argv.includes("--json")
  ? new TrackJsonOutput()
  : new TrackTableOutput();

runner.use(input, output);
