import { OutputPort } from "../../core/types";
import { stripAnsi } from "../style";
import { TrackReport } from "../types";

function deepStrip<T>(value: T): T {
  if (typeof value === "string") return stripAnsi(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepStrip(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepStrip(v);
    return out as unknown as T;
  }
  return value;
}

export class TrackJsonOutput implements OutputPort<TrackReport> {
  write(report: TrackReport): void {
    console.log(JSON.stringify(deepStrip(report), null, 2));
  }
}
