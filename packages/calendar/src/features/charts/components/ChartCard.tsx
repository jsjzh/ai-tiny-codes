import { cn } from "@/lib/utils";
import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartTemplate } from "../data/types";
import {
  CHART_TYPE_LABELS,
  METRIC_LABELS,
} from "../lib/widgetLayout";

type ChartCardProps = {
  chartTemplateCode: string;
  chartTemplates: ChartTemplate[];
  calendarData: CalendarData;
};

export function ChartCard({
  chartTemplateCode,
  chartTemplates,
  calendarData,
}: ChartCardProps) {
  const template = chartTemplates.find(
    (item) => item.code === chartTemplateCode,
  );

  if (!template) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <p className="text-sm font-medium text-destructive">图表模板已删除</p>
        <p className="mt-1 text-xs text-muted-foreground">{chartTemplateCode}</p>
      </div>
    );
  }

  const event = calendarData.templates.find(
    (item) => item.code === template.eventCode,
  );

  if (!event) {
    return (
      <div className="flex h-full flex-col p-3">
        <p className="text-sm font-medium text-ink">{template.title}</p>
        <p className="mt-1 text-xs text-destructive">引用的事项已删除</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="size-2 shrink-0 border border-black/10"
          style={{ backgroundColor: event.color }}
        />
        <span className="truncate text-sm font-medium text-ink">
          {template.title}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {event.title}
          {event.unit ? ` · ${event.unit}` : ""}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <span>{CHART_TYPE_LABELS[template.chartType]}</span>
        {template.metrics.map((metric) => (
          <span key={metric}>{METRIC_LABELS[metric]}</span>
        ))}
      </div>

      <div
        className={cn(
          "mt-3 flex min-h-0 flex-1 items-center justify-center border border-dashed border-rule bg-paper",
          "text-center text-xs leading-5 text-muted-foreground",
        )}
      >
        图表渲染将在 5b 完成
      </div>

      {template.desc ? (
        <p className="mt-2 line-clamp-1 text-[10px] text-muted-foreground">
          {template.desc}
        </p>
      ) : null}
    </div>
  );
}