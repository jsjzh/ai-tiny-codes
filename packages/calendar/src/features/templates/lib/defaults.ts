import type { CalendarTemplate } from "@/features/calendar/data/types";

import { PRESET_COLORS } from "./colors";

export function nextNewTemplateTitle(
  templates: Array<Pick<CalendarTemplate, "title">>,
): string {
  const numbers = templates
    .map((template) => /^新事项\s*(\d+)$/.exec(template.title)?.[1])
    .filter((value): value is string => Boolean(value))
    .map(Number);
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  return `新事项 ${next}`;
}

const RANDOM_COLORS = PRESET_COLORS.slice(0, 18);

export function randomPresetColor(): string {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}
