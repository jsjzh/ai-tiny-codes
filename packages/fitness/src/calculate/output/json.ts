import { CalculateReport } from "../types";
import { OutputPort } from "../../core/types";

export function renderJson(result: CalculateReport): string {
  return JSON.stringify(result, null, 2);
}

export class CalculateJsonOutput implements OutputPort<CalculateReport> {
  write(result: CalculateReport): void {
    console.log("");
    console.log(renderJson(result));
  }
}
