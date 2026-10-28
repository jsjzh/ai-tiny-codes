import type { NumericMetricCode } from "../../data/types";
import type {
  NumericChartData,
  NumericSeries,
} from "../../lib/chartData";
import { useElementSize } from "../../lib/useElementSize";
import { METRIC_LABELS } from "../../lib/widgetLayout";

type NumericChartProps = {
  data: NumericChartData;
  chartType: "line" | "bar" | "area";
  color: string;
  title: string;
};

const SERIES_STYLE: Record<
  NumericMetricCode,
  { opacity: number; dash?: string }
> = {
  daily: { opacity: 1 },
  avg7: { opacity: 0.72, dash: "5 3" },
  avg30: { opacity: 0.5, dash: "2 3" },
  changeRate: { opacity: 1 },
};

function formatTick(value: number): string {
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

function validPoints(series: NumericSeries) {
  return series.points
    .map((point, index) => ({ ...point, index }))
    .filter(
      (point): point is { date: string; value: number; index: number } =>
        point.value !== null,
    );
}

export function NumericChart({
  data,
  chartType,
  color,
  title,
}: NumericChartProps) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const firstDate = data.dates[0] ?? "";
  const lastDate = data.dates[data.dates.length - 1] ?? "";
  const metricsLabel = data.series
    .map((series) => METRIC_LABELS[series.metric])
    .join("、");

  if (data.valueCount === 0 || data.dates.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-dashed border-rule bg-paper text-xs text-muted-foreground">
        区间内暂无数据
      </div>
    );
  }

  const margin = { top: 14, right: 10, bottom: 24, left: 36 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  const domainMin =
    chartType === "bar" ? Math.min(0, data.min) : data.min;
  const domainMax =
    chartType === "bar" ? Math.max(0, data.max) : data.max;
  const span = Math.max(1, domainMax - domainMin);
  const xFor = (index: number) =>
    data.dates.length <= 1
      ? margin.left + plotWidth / 2
      : margin.left + (index / (data.dates.length - 1)) * plotWidth;
  const yFor = (value: number) =>
    margin.top + (1 - (value - domainMin) / span) * plotHeight;
  const tickIndices = Array.from(
    new Set(
      Array.from({ length: Math.min(5, data.dates.length) }, (_, index) =>
        Math.round(
          (index * (data.dates.length - 1)) /
            Math.max(1, Math.min(5, data.dates.length) - 1),
        ),
      ),
    ),
  );
  const dateLabelFormat =
    firstDate && lastDate && firstDate.slice(0, 4) !== lastDate.slice(0, 4)
      ? "YY/MM"
      : "MM-DD";
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return {
      value: domainMax - span * ratio,
      y: margin.top + plotHeight * ratio,
    };
  });
  const zeroInDomain = domainMin <= 0 && domainMax >= 0;
  const baselineValue = chartType === "bar" ? 0 : domainMin;
  const baselineY = yFor(baselineValue);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {data.series.length > 1 ? (
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {data.series.map((series) => (
            <span key={series.metric} className="inline-flex items-center gap-1">
              <svg width="16" height="6" aria-hidden="true">
                <line
                  x1="0"
                  y1="3"
                  x2="16"
                  y2="3"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity={SERIES_STYLE[series.metric].opacity}
                  strokeDasharray={SERIES_STYLE[series.metric].dash}
                />
              </svg>
              {METRIC_LABELS[series.metric]}
            </span>
          ))}
        </div>
      ) : null}

      <div ref={ref} className="relative min-h-0 flex-1">
        {width > 0 && height > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}，${firstDate} 至 ${lastDate}，${metricsLabel}${data.unit ? `，单位 ${data.unit}` : ""}`}
            className="block"
          >
            <title>{`${title} ${firstDate} ~ ${lastDate}`}</title>

            {data.unit ? (
              <text
                x={margin.left}
                y={10}
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {data.unit}
              </text>
            ) : null}

            {yTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="var(--color-rule)"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 6}
                  y={tick.y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground font-mono text-[10px]"
                >
                  {formatTick(tick.value)}
                </text>
              </g>
            ))}

            {zeroInDomain ? (
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={yFor(0)}
                y2={yFor(0)}
                stroke="var(--color-muted-foreground)"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
            ) : null}

            {tickIndices.map((index) => (
              <text
                key={index}
                x={xFor(index)}
                y={height - 6}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === data.dates.length - 1
                      ? "end"
                      : "middle"
                }
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {data.dates[index]
                  ? dateLabelFormat === "YY/MM"
                    ? `${data.dates[index].slice(2, 4)}/${data.dates[index].slice(5, 7)}`
                    : data.dates[index].slice(5)
                  : ""}
              </text>
            ))}

            {chartType === "bar"
              ? data.series.map((series, seriesIndex) => {
                  const points = validPoints(series);
                  const step =
                    plotWidth / Math.max(1, data.dates.length);
                  const groupWidth = Math.max(1, step * 0.72);
                  const barWidth = Math.max(
                    1,
                    groupWidth / data.series.length,
                  );

                  return (
                    <g key={series.metric}>
                      {points.map((point) => {
                        const x =
                          margin.left +
                          point.index * step +
                          (step - groupWidth) / 2 +
                          seriesIndex * barWidth;
                        const valueY = yFor(point.value);
                        const top = Math.min(valueY, baselineY);
                        const barHeight = Math.max(
                          1,
                          Math.abs(valueY - baselineY),
                        );

                        return (
                          <rect
                            key={point.date}
                            x={x}
                            y={top}
                            width={Math.max(1, barWidth - 0.5)}
                            height={barHeight}
                            fill={color}
                            fillOpacity={SERIES_STYLE[series.metric].opacity}
                          >
                            <title>{`${point.date} ${formatTick(point.value)}${data.unit}`}</title>
                          </rect>
                        );
                      })}
                    </g>
                  );
                })
              : data.series.map((series) => {
                  const points = validPoints(series);

                  if (points.length === 0) {
                    return null;
                  }

                  const linePath = points
                    .map(
                      (point, index) =>
                        `${index === 0 ? "M" : "L"}${xFor(point.index)},${yFor(point.value)}`,
                    )
                    .join(" ");
                  const areaPath =
                    points.length > 1
                      ? `${linePath} L${xFor(points[points.length - 1].index)},${margin.top + plotHeight} L${xFor(points[0].index)},${margin.top + plotHeight} Z`
                      : "";

                  return (
                    <g key={series.metric}>
                      {chartType === "area" && areaPath ? (
                        <path
                          d={areaPath}
                          fill={color}
                          fillOpacity={0.12}
                        />
                      ) : null}
                      <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.6"
                        strokeOpacity={SERIES_STYLE[series.metric].opacity}
                        strokeDasharray={SERIES_STYLE[series.metric].dash}
                      />
                      {points.length <= 120
                        ? points.map((point) => (
                            <circle
                              key={point.date}
                              cx={xFor(point.index)}
                              cy={yFor(point.value)}
                              r="2"
                              fill={color}
                              fillOpacity={SERIES_STYLE[series.metric].opacity}
                            >
                              <title>{`${point.date} ${formatTick(point.value)}${data.unit}`}</title>
                            </circle>
                          ))
                        : null}
                    </g>
                  );
                })}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
