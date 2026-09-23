import { OutputPort } from "../../core/types";
import { TrackReport } from "../types";

export class TrackJsonOutput implements OutputPort<TrackReport> {
  write(report: TrackReport): void {
    console.log(JSON.stringify(report, null, 2));
  }
}
