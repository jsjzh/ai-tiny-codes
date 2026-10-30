import type { EChartsCoreOption } from "echarts/core";

import {
  DEFAULT_CHART_THEME,
  resolveThemeColor,
  type ChartTheme,
} from "@/features/theme/theme";

import type {
  NumericSeriesOperation,
} from "../data/types";
import type { NumericChartData } from "./chartData";


export type NumericViewType = "line" | "bar" | "area";

type NumericChartOptionInput = {
  data: NumericChartData;
  chartType: NumericViewType;
  color: string;
  theme?: ChartTheme;
  animate?: boolean;
  stacked?: boolean;
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

const SERIES_STYLE: Record<
  NumericSeriesOperation,
  { opacity: number; dash?: "solid" | "dashed" | "dotted" }
> = {
  raw: { opacity: 1 },
  rolling: { opacity: 1, dash: "dashed" },
  cumulative: { opacity: 1, dash: "dotted" },
  deltaFromStart: { opacity: 1, dash: "dashed" },
  percentChange: { opacity: 1 },
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
  theme: ChartTheme,
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

  return `<div style="min-width:148px;padding:8px 10px;font-family:${FONT_SANS};font-size:12px;color:${theme.ink}">
    <div style="margin-bottom:6px;color:${theme.muted};font-family:${FONT_MONO};font-size:11px">${date}</div>
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
  theme = DEFAULT_CHART_THEME,
  animate = true,
  stacked = false,
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

  const fieldCounts = new Map<string, number>();

  for (const item of data.series) {
    fieldCounts.set(
      item.fieldCode,
      (fieldCounts.get(item.fieldCode) ?? 0) + 1,
    );
  }

  const series = data.series.map((item) => {
    const style = SERIES_STYLE[item.operation];
    const multipleForField =
      (fieldCounts.get(item.fieldCode) ?? 0) > 1;
    const baseColor = resolveThemeColor(theme, item.color || color);
    const seriesColor =
      multipleForField && item.operation !== "raw"
        ? item.operation === "rolling"
          ? (item.window ?? 7) <= 7
            ? theme.avg7
            : theme.avg30
          : item.operation === "percentChange"
            ? theme.changeRate
            : theme.avg30
        : baseColor;
    const base = {
      name: item.label,
      data: item.points.map((point) => point.value),
      color: seriesColor,
      itemStyle: {
        color: seriesColor,
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
        ...(stacked ? { stack: "total" } : {}),
        itemStyle: {
          color: seriesColor,
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
      connectNulls: item.operation !== "percentChange",
      ...(stacked && chartType === "area" ? { stack: "total" } : {}),
      lineStyle: {
        color: seriesColor,
        width: 1.6,
        type: style.dash ?? "solid",
        opacity: style.opacity,
      },
      areaStyle:
        chartType === "area"
          ? {
              color: seriesColor,
              opacity: 0.1,
            }
          : undefined,
    };
  });

  return {
    animation: animate,
    animationDuration: 500,
    animationDurationUpdate: 220,
    animationEasing: "cubicOut",
    animationEasingUpdate: "cubicOut",
    textStyle: {
      fontFamily: FONT_SANS,
      color: theme.ink,
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
        color: theme.muted,
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
          color: theme.rule,
          width: 1,
        },
        crossStyle: {
          color: theme.rule,
          width: 1,
        },
        label: {
          show: false,
        },
      },
      backgroundColor: theme.sheet,
      borderColor: theme.rule,
      borderWidth: 1,
      padding: 0,
      textStyle: {
        color: theme.ink,
        fontFamily: FONT_SANS,
        fontSize: 12,
      },
      extraCssText:
        "border-radius:var(--radius-control);box-shadow:var(--shadow-panel);",
      formatter: (params: unknown) =>
        formatTooltip(
          params as TooltipItem | TooltipItem[],
          data.unit,
          theme,
        ),
    },
    xAxis: {
      type: "category",
      data: data.dates,
      boundaryGap: isBar,
      axisLine: {
        lineStyle: {
          color: theme.rule,
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: theme.muted,
        fontFamily: FONT_MONO,
        fontSize: 10,
        hideOverlap: true,
        interval: axisInterval,
        formatter: (value: string) =>
          data.xMode === "text"
            ? value
            : formatDateLabel(value, longRange),
      },
    },
    yAxis: {
      type: "value",
      name: data.unit,
      nameLocation: "end",
      nameGap: 8,
      nameTextStyle: {
        color: theme.muted,
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
        color: theme.muted,
        fontFamily: FONT_MONO,
        fontSize: 10,
        formatter: (value: number) => formatAxisValue(value),
      },
      splitLine: {
        lineStyle: {
          color: theme.rule,
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
        borderColor: theme.rule,
        backgroundColor: theme.paper,
        fillerColor: theme.primarySoft,
        handleStyle: {
          color: theme.primary,
        },
        moveHandleStyle: {
          color: theme.primary,
          opacity: 0.7,
        },
        textStyle: {
          color: theme.muted,
          fontFamily: FONT_MONO,
          fontSize: 9,
        },
        showDetail: false,
        brushSelect: false,
        dataBackground: {
          lineStyle: {
            color: theme.rule,
            width: 1,
          },
          areaStyle: {
            color: theme.primarySoft,
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
