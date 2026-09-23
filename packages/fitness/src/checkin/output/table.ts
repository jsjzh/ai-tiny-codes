import { newTable, printSection } from "@ai-tiny-codes/utils";
import { OutputPort } from "../../core/types";
import { TrackReport, TrackSection } from "../types";

export class TrackTableOutput implements OutputPort<TrackReport> {
  write(report: TrackReport): void {
    renderTrack(report);
  }
}

export function renderTrack(report: TrackReport): void {
  console.log("");
  console.log("==================== 减脂打卡复盘 ====================");
  console.log(`计划：${report.planName}`);
  for (const s of report.sections) renderSection(s);
  console.log("");
  console.log("=====================================================");
}

function renderSection(s: TrackSection): void {
  const prefix = s.level === "error" ? "✗ " : s.level === "warn" ? "⚠ " : "";
  if (s.rows && s.head) {
    const t = newTable(s.head, s.colAligns);
    for (const r of s.rows) t.push(r);
    printSection(prefix + s.title, t);
  } else if (s.lines) {
    console.log("");
    console.log(`■ ${prefix}${s.title}`);
    for (const l of s.lines) console.log(`  ${l}`);
  }
}
