import { lazy, Suspense, useMemo } from "react";

import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartTemplate } from "../../data/types";
import {
  buildNumericChartData,
  buildTextChartData,
  type ChartRange,
} from "../../lib/chartData";
import { buildNumericChartOption, type NumericViewType } from "../../lib/echartsOption";
import { TextDistribution } from "./TextDistribution";
import { TextTable } from "./TextTable";

const EChart = lazy(() => import("./EChart"));

type ChartRendererProps = {
  template: ChartTemplate;
  calendarData: CalendarData;
  caseRange: ChartRange;
  color: string;
  chartType: NumericViewType;
  resetKey: number;
};

export function ChartRenderer({
  template,
  calendarData,
  caseRange,
  color,
  chartType,
  resetKey,
}: ChartRendererProps) {
  const numericData = useMemo(
    () =>
      template.kind === "numeric"
        ? buildNumericChartData(template, calendarData, caseRange)
        : null,
    [template, calendarData, caseRange],
  );
  const textData = useMemo(
    () =>
      template.kind === "text"
        ? buildTextChartData(template, calendarData, caseRange)
        : null,
    [template, calendarData, caseRange],
  );
  const option = useMemo(
    () =>
      numericData
        ? buildNumericChartOption({
            data: numericData,
            chartType,
            color,
          })
        : null,
    [numericData, chartType, color],
  );

  if (template.kind === "text" && textData) {
    if (template.chartType === "distribution") {
      return (
        <TextDistribution
          data={textData}
          color={color}
          title={template.title}
        />
      );
    }

    return <TextTable data={textData} title={template.title} />;
  }

  if (!numericData || !option) {
    return null;
  }

  if (numericData.valueCount === 0 || numericData.dates.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-dashed border-rule bg-paper text-xs text-muted-foreground">
        区间内暂无数据
      </div>
    );
  }

  const ariaLabel = `${template.title}，${numericData.dates[0]} 至 ${
    numericData.dates[numericData.dates.length - 1]
  }，${chartType === "bar" ? "柱状图" : chartType === "area" ? "面积图" : "折线图"}`;

  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center border border-dashed border-rule bg-paper text-xs text-muted-foreground">
          图表加载中…
        </div>
      }
    >
      <EChart option={option} resetKey={resetKey} ariaLabel={ariaLabel} />
    </Suspense>
  );
}
