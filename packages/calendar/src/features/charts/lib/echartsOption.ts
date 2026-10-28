import type { EChartsCoreOption } from "echarts/core";

import type { NumericMetricCode } from "../data/types";
import type { NumericChartData } from "./chartData";
import { METRIC_LABELS } from "./widgetLayout";

export type NumericViewType = "line" | "bar" | "area";

type NumericChartOptionInput = {
  data: NumericChartData;
  chartType: NumericViewType;
  color: string;
};

type TooltipItem = {
  axisValueLabel?: string;
  seriesName?: string;
  marker?: string;
  value?: unknown;
};

const FONT_SANS =
  '"IBM Plex Sans Variable", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const FONT_MONO =
  '"IBM Plex Mono", "SFMono-Regular", "SF Mono", ui-monospace, monospace';
const INK = "#101828";
const MUTED = "#667085";
const RULE = "#d5dae3";
const BLUEPRINT = "#1d3a8a";

const SERIES_STYLE: Record<
  NumericMetricCode,
  { opacity: number; dash?: "solid" | "dashed" | "dotted" }
> = {
  daily: { opacity: 1 },
  avg7: { opacity: 0.72, dash: "dashed" },
  avg30: { opacity: 0.5, dash: "dotted" },
  changeRate: { opacity: 1 },
};

function formatAxisValue(value: number): string {
  const absolute = Math.abs(value);

  if (absolute >= 1000) {
    return `${Number((value / 1000).toFixed(1))}k`;
  }

  if (absolute >= 100) {
    return String(Math.round(value));
  }

  if (absolute >= 10) {
    return String(Number(value.toFixed(1)));
  }

  return String(Number(value.toFixed(2)));
}

function formatTooltipValue(value: unknown, unit: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return `${formatAxisValue(value)}${unit ? ` ${unit}` : ""}`;
}

function formatTooltip(
  params: TooltipItem | TooltipItem[],
  unit: string,
): string {
  const items = Array.isArray(params) ? params : [params];
  const date = items[0]?.axisValueLabel ?? "";
  const rows = items
    .map(
      (item) => `<div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
        <span>${item.marker ?? ""}${item.seriesName ?? ""}</span>
        <strong style="font-family:${FONT_MONO};font-weight:600">${formatTooltipValue(item.value, unit)}</strong>
      </div>`,
    )
    .join("");

  return `<div style="min-width:148px;padding:8px 10px;font-family:${FONT_SANS};font-size:12px;color:${INK}">
    <div style="margin-bottom:6px;color:${MUTED};font-family:${FONT_MONO};font-size:11px">${date}</div>
    ${rows}
  </div>`;
}

function formatDateLabel(value: string, longRange: boolean): string {
  if (longRange) {
    return `${value.slice(2, 4)}/${value.slice(5, 7)}`;
  }

  return value.slice(5);
}

export function buildNumericChartOption({
  data,
  chartType,
  color,
}: NumericChartOptionInput): EChartsCoreOption {
  const firstDate = data.dates[0] ?? "";
  const lastDate = data.dates[data.dates.length - 1] ?? "";
  const longRange = Boolean(
    firstDate &&
      lastDate &&
      firstDate.slice(0, 4) !== lastDate.slice(0, 4),
  );
  const axisInterval = Math.max(
    0,
    Math.ceil(data.dates.length / 7) - 1,
  );
  const isBar = chartType === "bar";
  const min = isBar ? Math.min(0, data.min) : data.min;
  const max = isBar ? Math.max(0, data.max) : data.max;

  const series = data.series.map((item) => {
    const style = SERIES_STYLE[item.metric];
    const base = {
      name: METRIC_LABELS[item.metric],
      data: item.points.map((point) => point.value),
      color,
      itemStyle: {
        color,
        opacity: style.opacity,
      },
      emphasis: {
        focus: "series" as const,
      },
    };

    if (isBar) {
      return {
        ...base,
        type: "bar" as const,
        barMaxWidth: 10,
        barGap: "12%",
        itemStyle: {
          color,
          opacity: style.opacity,
        },
      };
    }

    return {
      ...base,
      type: "line" as const,
      smooth: false,
      showSymbol: item.points.length <= 120,
      symbol: "circle",
      symbolSize: 3,
      connectNulls: item.metric !== "changeRate",
      lineStyle: {
        color,
        width: 1.6,
        type: style.dash ?? "solid",
        opacity: style.opacity,
      },
      areaStyle:
        chartType === "area"
          ? {
              color,
              opacity: 0.1,
            }
          : undefined,
    };
  });

  return {
    animation: false,
    textStyle: {
      fontFamily: FONT_SANS,
      color: INK,
    },
    grid: {
      left: 42,
      right: 16,
      top: data.series.length > 1 ? 32 : 20,
      bottom: 42,
    },
    legend: {
      show: data.series.length > 1,
      top: 0,
      left: 0,
      itemWidth: 14,
      itemHeight: 2,
      itemGap: 12,
      icon: "roundRect",
      textStyle: {
        color: MUTED,
        fontSize: 10,
        fontFamily: FONT_SANS,
      },
    },
    tooltip: {
      trigger: "axis",
      appendToBody: true,
      axisPointer: {
        type: "cross",
        lineStyle: {
          color: RULE,
          width: 1,
        },
        crossStyle: {
          color: RULE,
          width: 1,
        },
        label: {
          show: false,
        },
      },
      backgroundColor: "#ffffff",
      borderColor: RULE,
      borderWidth: 1,
      padding: 0,
      textStyle: {
        color: INK,
        fontFamily: FONT_SANS,
        fontSize: 12,
      },
      extraCssText: "border-radius:0;box-shadow:none;",
      formatter: (params: unknown) =>
        formatTooltip(params as TooltipItem | TooltipItem[], data.unit),
    },
    xAxis: {
      type: "category",
      data: data.dates,
      boundaryGap: isBar,
      axisLine: {
        lineStyle: {
          color: RULE,
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: MUTED,
        fontFamily: FONT_MONO,
        fontSize: 10,
        hideOverlap: true,
        interval: axisInterval,
        formatter: (value: string) => formatDateLabel(value, longRange),
      },
    },
    yAxis: {
      type: "value",
      name: data.unit,
      nameLocation: "end",
      nameGap: 8,
      nameTextStyle: {
        color: MUTED,
        fontFamily: FONT_MONO,
        fontSize: 10,
        align: "left",
      },
      min,
      max,
      splitNumber: 4,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: MUTED,
        fontFamily: FONT_MONO,
        fontSize: 10,
        formatter: (value: number) => formatAxisValue(value),
      },
      splitLine: {
        lineStyle: {
          color: RULE,
          width: 1,
        },
      },
    },
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        minValueSpan: 3,
      },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 14,
        bottom: 4,
        borderColor: RULE,
        backgroundColor: "#f7f8fa",
        fillerColor: "rgba(29, 58, 138, 0.12)",
        handleStyle: {
          color: BLUEPRINT,
        },
        moveHandleStyle: {
          color: BLUEPRINT,
          opacity: 0.7,
        },
        textStyle: {
          color: MUTED,
          fontFamily: FONT_MONO,
          fontSize: 9,
        },
        showDetail: false,
        brushSelect: false,
        dataBackground: {
          lineStyle: {
            color: RULE,
            width: 1,
          },
          areaStyle: {
            color: "#eef1f9",
          },
        },
        selectedDataBackground: {
          lineStyle: {
            color,
            width: 1,
          },
          areaStyle: {
            color,
            opacity: 0.12,
          },
        },
      },
    ],
    series,
  };
}
