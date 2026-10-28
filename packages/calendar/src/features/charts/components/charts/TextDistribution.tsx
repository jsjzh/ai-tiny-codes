import type { TextChartData } from "../../lib/chartData";

type TextDistributionProps = {
  data: TextChartData;
  color: string;
  title: string;
};

export function TextDistribution({
  data,
  color,
  title,
}: TextDistributionProps) {
  if (data.distribution.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-dashed border-rule bg-paper text-xs text-muted-foreground">
        区间内暂无数据
      </div>
    );
  }

  const maxCount = Math.max(
    ...data.distribution.map((item) => item.count),
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto"
      role="img"
      aria-label={`${title} 分布`}
    >
      {data.distribution.map((item) => (
        <div key={item.value} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-[11px] text-ink">
            {item.value}
          </span>
          <div className="h-3 min-w-0 flex-1 border border-rule bg-paper">
            <div
              className="h-full"
              style={{
                width: `${Math.max(3, (item.count / maxCount) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="w-7 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}
