import type { CaseWidget, ChartType } from "../data/types";

export const CHART_HEIGHT_OPTIONS = [
  { value: 1, label: "紧凑", px: 220 },
  { value: 2, label: "标准", px: 300 },
  { value: 3, label: "高", px: 400 },
  { value: 4, label: "超高", px: 520 },
] as const;

export const BLOCK_HEIGHT_OPTIONS = [
  { value: 1, label: "紧凑", px: 140 },
  { value: 2, label: "标准", px: 200 },
] as const;

export const CHART_DRAG_TYPE = "application/x-calendar-chart";
export const WIDGET_DRAG_TYPE = "application/x-calendar-widget";

export function widgetHeightPx(widget: CaseWidget): number {
  if (widget.kind === "block") {
    return (
      BLOCK_HEIGHT_OPTIONS.find((option) => option.value === widget.height)
        ?.px ?? 140
    );
  }

  return (
    CHART_HEIGHT_OPTIONS.find((option) => option.value === widget.height)?.px ??
    300
  );
}

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: "折线",
  bar: "柱状",
  area: "面积",
  table: "对照表",
  distribution: "分布",
};

export const METRIC_LABELS = {
  daily: "每日",
  avg7: "7 日均",
  avg30: "30 日均",
  changeRate: "变化率",
} as const;