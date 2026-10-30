import type { RecordCalendarData } from "../../lib/chartData";

type RecordHeatmapProps = {
  data: RecordCalendarData;
  color: string;
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function RecordHeatmap({ data, color }: RecordHeatmapProps) {
  if (data.months.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-dashed border-rule bg-paper text-xs text-muted-foreground">
        区间内暂无数据
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`记录日历，${data.recordedDays} / ${data.totalDays} 天有记录`}
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span>{data.recordedDays} / {data.totalDays} 天有记录</span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 border border-rule bg-paper" />
          无记录
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="size-2.5 border border-black/10"
            style={{ backgroundColor: color }}
          />
          有记录
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-wrap gap-3">
          {data.months.map((month) => (
            <div key={month.key} className="w-[132px] shrink-0">
              <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                {month.label}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((weekday) => (
                  <span
                    key={weekday}
                    className="text-center text-[8px] text-muted-foreground"
                  >
                    {weekday}
                  </span>
                ))}
                {Array.from({ length: month.offset }, (_, index) => (
                  <span key={`blank-${index}`} className="size-4" />
                ))}
                {month.days.map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date}${day.hasRecord ? " · 有记录" : " · 无记录"}`}
                    className="size-4 border border-rule/70"
                    style={{
                      backgroundColor: !day.inRange
                        ? "transparent"
                        : day.hasRecord
                          ? color
                          : "var(--color-paper)",
                      opacity: day.inRange ? 1 : 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
