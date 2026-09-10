import { FoodReport } from "../types";
import { OutputPort } from "../../core/types";

export function renderJson(result: FoodReport): string {
  return JSON.stringify(result, null, 2);
}

export class FoodJsonOutput implements OutputPort<FoodReport> {
  write(result: FoodReport): void {
    console.log("");
    console.log(renderJson(result));
  }
}
