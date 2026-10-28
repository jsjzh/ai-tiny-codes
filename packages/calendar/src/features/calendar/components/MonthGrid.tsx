import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

import type { CalendarEventDisplay } from "../data/events";
import type { CalendarEventValue, CalendarTemplate } from "../data/types";
import { sortTemplates } from "../data/types";
import { getDayCellLayout, type DayCellLayout } from "../lib/eventLayout";
import type { CalendarWeek } from "../types";
import { DayCell } from "./DayCell";

type MonthGridProps = {
  weeks: CalendarWeek[];
  year: number;
  month: number;
  templates: CalendarTemplate[];
  events: Record<string, Record<string, CalendarEventValue>>;
  selectedDates: ReadonlySet<string>;
  onDayPointerDown: (date: string, event: PointerEvent<HTMLElement>) => void;
  onDayPointerEnter: (date: string, event: PointerEvent<HTMLElement>) => void;
  onDayClick: (date: string, event: MouseEvent<HTMLElement>) => void;
  onDayDoubleClick: (date: string) => void;
};

export function MonthGrid({
  weeks,
  year,
  month,
  templates,
  events,
  selectedDates,
  onDayPointerDown,
  onDayPointerEnter,
  onDayClick,
  onDayDoubleClick,
}: MonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<DayCellLayout>(() =>
    getDayCellLayout(0, 0, false),
  );
  const sortedTemplates = useMemo(() => sortTemplates(templates), [templates]);

  useLayoutEffect(() => {
    const element = gridRef.current;

    if (!element) {
      return;
    }

    function update() {
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const isDesktop = window.matchMedia("(min-width: 640px)").matches;
      const next = getDayCellLayout(
        rect.width / 7,
        rect.height / Math.max(1, weeks.length),
        isDesktop,
      );

      setLayout((previous) =>
        previous.columns === next.columns && previous.rows === next.rows
          ? previous
          : next,
      );
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [weeks.length]);

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={`${year}年${month + 1}月`}
      aria-multiselectable="true"
      aria-rowcount={weeks.length}
      aria-colcount={7}
      className="flex min-h-0 flex-1 select-none flex-col gap-px bg-rule"
    >
      {weeks.map((week) => (
        <div
          key={week[0].date}
          role="row"
          className="grid min-h-0 flex-1 grid-cols-7 gap-px bg-rule"
        >
          {week.map((day) => {
            const dayEvents = events[day.date] ?? {};
            const eventItems: CalendarEventDisplay[] = sortedTemplates
              .filter((template) =>
                Object.prototype.hasOwnProperty.call(dayEvents, template.code),
              )
              .map((template) => ({
                code: template.code,
                title: template.title,
                kind: template.kind,
                unit: template.unit,
                color: template.color,
                sortOrder: template.sortOrder,
                value: dayEvents[template.code],
              }));

            return (
              <DayCell
                key={day.date}
                day={day}
                eventItems={eventItems}
                layout={layout}
                isSelected={selectedDates.has(day.date)}
                onPointerDown={onDayPointerDown}
                onPointerEnter={onDayPointerEnter}
                onClick={onDayClick}
                onDoubleClick={onDayDoubleClick}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
