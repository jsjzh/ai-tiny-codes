import dayjs from "dayjs";

import type { CalendarData } from "@/features/calendar/data/types";

import type { ChartCase } from "../data/types";

export type EffectiveCaseRange = {
  startDate: string;
  endDate: string;
  isAll: boolean;
  hasData: boolean;
};

export function resolveCaseRange(
  chartCase: ChartCase,
  calendar: CalendarData,
): EffectiveCaseRange {
  if (chartCase.rangeMode !== "all") {
    return {
      startDate: chartCase.startDate,
      endDate: chartCase.endDate,
      isAll: false,
      hasData: true,
    };
  }

  const dates: string[] = [];

  for (const [date, day] of Object.entries(calendar.events)) {
    if (
      chartCase.eventCodes.some((code) =>
        Object.prototype.hasOwnProperty.call(day, code),
      )
    ) {
      dates.push(date);
    }
  }

  if (dates.length === 0) {
    const now = dayjs();

    return {
      startDate: chartCase.startDate || now.startOf("month").format("YYYY-MM-DD"),
      endDate: chartCase.endDate || now.format("YYYY-MM-DD"),
      isAll: true,
      hasData: false,
    };
  }

  dates.sort();

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    isAll: true,
    hasData: true,
  };
}
