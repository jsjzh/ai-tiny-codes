import { TrackSection, ValidationResult } from "../types";

export function validationSection(v: ValidationResult): TrackSection {
  const lines: string[] = [];
  if (v.errors.length === 0 && v.warnings.length === 0) {
    lines.push("✓ 数据校验通过，没有发现问题");
  } else {
    for (const e of v.errors) lines.push(`✗ ${e}`);
    for (const w of v.warnings) lines.push(`⚠ ${w}`);
  }
  return {
    key: "validation",
    title: "数据校验",
    lines,
    level: v.errors.length > 0 ? "error" : v.warnings.length > 0 ? "warn" : "info",
  };
}
