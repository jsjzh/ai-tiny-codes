import dayjs from "dayjs";

import type {
  CalendarEventValue,
  CalendarTemplate,
} from "@/features/calendar/data/types";
import { downloadJson } from "@/lib/download";

export function downloadTemplateEvents(
  template: CalendarTemplate,
  events: Record<string, CalendarEventValue>,
): void {
  const safeTitle = template.title.replace(/[\\/:*?"<>|]/g, "-") || "事项";
  const filename = `${safeTitle}-${dayjs().format("YYYY-MM-DD")}.json`;

  downloadJson(filename, {
    app: "ai-tiny-codes/calendar-events",
    version: 1,
    exportedAt: new Date().toISOString(),
    template: {
      code: template.code,
      title: template.title,
      kind: template.kind,
      unit: template.unit,
    },
    events,
  });
}
