import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import type { EChartsCoreOption, EChartsType } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

type EChartProps = {
  option: EChartsCoreOption;
  resetKey: number;
  ariaLabel: string;
};

export default function EChart({
  option,
  resetKey,
  ariaLabel,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = echarts.init(container, undefined, {
      renderer: "canvas",
      useDirtyRect: true,
    });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, {
      notMerge: true,
      lazyUpdate: true,
    });
  }, [option]);

  useEffect(() => {
    if (resetKey === 0) {
      return;
    }

    chartRef.current?.dispatchAction({
      type: "dataZoom",
      start: 0,
      end: 100,
    });
  }, [resetKey]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="img"
      aria-label={ariaLabel}
    />
  );
}
