import { useMemo } from "react";

import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartTemplate } from "../../data/types";
import {
  buildNumericChartData,
  buildTextChartData,
  type ChartRange,
} from "../../lib/chartData";
import { NumericChart } from "./NumericChart";
import { TextDistribution } from "./TextDistribution";
import { TextTable } from "./TextTable";

type ChartRendererProps = {
  template: ChartTemplate;
  calendarData: CalendarData;
  caseRange: ChartRange;
  color: string;
};

export function ChartRenderer({
  template,
  calendarData,
  caseRange,
  color,
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

  if (!numericData) {
    return null;
  }

  const chartType =
    template.chartType === "bar" || template.chartType === "area"
      ? template.chartType
      : "line";

  return (
    <NumericChart
      data={numericData}
      chartType={chartType}
      color={color}
      title={template.title}
    />
  );
}
