import { useEffect, useState } from "react";
import {
  ChartArea,
  ChartColumn,
  ChartLine,
  Layers,
  RotateCcw,
} from "lucide-react";

import {
  getNumericFields,
  type CalendarData,
} from "@/features/calendar/data/types";
import {
  getChartTheme,
  resolveChartColor,
} from "@/features/theme/theme";
import { useTheme } from "@/features/theme/ThemeProvider";
import { cn } from "@/lib/utils";

import {
  CHART_ANALYSIS_LABELS,
  getAnalysisFieldCodes,
  getChartAnalysis,
  getChartSeries,
  type ChartTemplate,
} from "../data/types";
import type { ChartRange } from "../lib/chartData";
import type { NumericViewType } from "../lib/echartsOption";
import { CHART_TYPE_LABELS } from "../lib/widgetLayout";
import { ChartRenderer } from "./charts/ChartRenderer";

type ChartCardProps = {
  chartTemplateCode: string;
  chartTemplates: ChartTemplate[];
  calendarData: CalendarData;
  caseRange: ChartRange;
};

const VIEW_OPTIONS = [
  { value: "line" as const, label: "折线图", icon: ChartLine },
  { value: "bar" as const, label: "柱状图", icon: ChartColumn },
  { value: "area" as const, label: "面积图", icon: ChartArea },
];

function templateViewType(template: ChartTemplate): NumericViewType {
  if (
    template.chartType === "bar" ||
    template.chartType === "area"
  ) {
    return template.chartType;
  }

  return "line";
}

export function ChartCard({
  chartTemplateCode,
  chartTemplates,
  calendarData,
  caseRange,
}: ChartCardProps) {
  const { theme } = useTheme();
  const chartTheme = getChartTheme(theme);
  const template = chartTemplates.find(
    (item) => item.code === chartTemplateCode,
  );
  const [viewTypeOverride, setViewTypeOverride] =
    useState<NumericViewType | null>(null);
  const [stackedOverride, setStackedOverride] = useState<boolean | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const defaultViewType = template ? templateViewType(template) : "line";
  const viewType = viewTypeOverride ?? defaultViewType;
  const series = template ? getChartSeries(template) : [];
  const analysis = template ? getChartAnalysis(template) : "series";
  const analysisFields = template ? getAnalysisFieldCodes(template) : [];
  const seriesCount =
    analysis === "series"
      ? series.length
      : analysis === "recordQuality" || analysis === "calendar"
        ? 1
        : analysisFields.length;
  const fixedBarAnalysis =
    analysis === "monthlyDelta" ||
    analysis === "weeklyDelta" ||
    analysis === "weekdayAverage" ||
    analysis === "distribution" ||
    analysis === "recordQuality" ||
    analysis === "calendar";
  const effectiveViewType = fixedBarAnalysis ? "bar" : viewType;
  const stacked = stackedOverride ?? template?.stacked ?? false;
  const canChangeType =
    analysis === "series" || analysis === "cumulative";
  const canStack =
    seriesCount > 1 &&
    (effectiveViewType === "bar" || effectiveViewType === "area") &&
    analysis !== "weekdayAverage";

  useEffect(() => {
    setViewTypeOverride(null);
    setStackedOverride(null);
    setResetKey(0);
  }, [template?.code]);

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

  const eventColor = resolveChartColor(theme, event.color);
  const eventFieldUnits = (() => {
    if (event.kind !== "number") {
      return [];
    }

    if (analysis === "recordQuality") {
      return ["天"];
    }

    if (analysis === "calendar") {
      return [];
    }

    const fields = getNumericFields(event);
    const fieldByCode = new Map(fields.map((field) => [field.code, field]));
    const fallback = fields.find((field) => field.kind === "input") ?? fields[0];
    const codes =
      analysis === "series"
        ? series.map((spec) => spec.fieldCode)
        : analysisFields;

    return Array.from(
      new Set(
        codes
          .map((code) => fieldByCode.get(code || "") ?? fallback)
          .filter(Boolean)
          .map((field) => field!.unit),
      ),
    );
  })();
  const eventUnit =
    analysis === "distribution"
      ? "条"
      : eventFieldUnits.length === 1
        ? eventFieldUnits[0]
        : "";

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span
          className="size-2 shrink-0 border border-black/10"
          style={{ backgroundColor: eventColor }}
        />
        <span className="truncate text-sm font-medium text-ink">
          {template.title}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {event.title}
          {eventUnit ? ` · ${eventUnit}` : ""}
        </span>

        {template.kind === "numeric" ? (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {canChangeType ? (
              <div
                className="flex border border-rule bg-sheet"
                role="group"
                aria-label="切换图表类型"
              >
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = effectiveViewType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={active}
                    title={option.label}
                    onClick={() => {
                      setViewTypeOverride(option.value);
                      setResetKey((value) => value + 1);
                    }}
                    className={cn(
                      "flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-blueprint-soft hover:text-ink",
                      active &&
                        "bg-blueprint text-white hover:bg-blueprint hover:text-white",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                  </button>
                );
              })}
              </div>
            ) : null}
            {analysis !== "calendar" ? (
              <button
                type="button"
                aria-label="重置缩放"
                title="重置缩放"
                onClick={() => setResetKey((value) => value + 1)}
                className="flex size-7 items-center justify-center border border-rule bg-sheet text-muted-foreground transition-colors hover:bg-blueprint-soft hover:text-ink"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
            {canStack ? (
              <button
                type="button"
                aria-label={stacked ? "取消堆叠" : "堆叠系列"}
                aria-pressed={stacked}
                title={stacked ? "取消堆叠" : "堆叠系列"}
                onClick={() => setStackedOverride(!stacked)}
                className={cn(
                  "flex size-7 items-center justify-center border border-rule bg-sheet text-muted-foreground transition-colors hover:bg-blueprint-soft hover:text-ink",
                  stacked && "bg-blueprint text-white hover:bg-blueprint hover:text-white",
                )}
              >
                <Layers aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex shrink-0 flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        {analysis !== "calendar" ? (
          <span>
            {CHART_TYPE_LABELS[
              template.kind === "numeric" ? effectiveViewType : template.chartType
            ]}
          </span>
        ) : null}
        {analysis !== "series" ? (
          <span>{CHART_ANALYSIS_LABELS[analysis]}</span>
        ) : null}
        {template.kind === "numeric" &&
        seriesCount > 0 &&
        analysis !== "calendar" ? (
          <span>{seriesCount} 个系列</span>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <ChartRenderer
          template={template}
          calendarData={calendarData}
          caseRange={caseRange}
          color={eventColor}
          chartTheme={chartTheme}
          chartType={effectiveViewType}
          stacked={stacked}
          resetKey={resetKey}
        />
      </div>

      {template.desc ? (
        <p className="mt-2 line-clamp-1 shrink-0 text-[10px] text-muted-foreground">
          {template.desc}
        </p>
      ) : null}
    </div>
  );
}
