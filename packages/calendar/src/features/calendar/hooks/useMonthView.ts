import { useMemo, useState } from "react";
import dayjs from "dayjs";

import { buildMonthMatrix } from "../lib/monthGrid";
import type { MonthView } from "../types";

function shiftMonth(view: MonthView, amount: number): MonthView {
  const shifted = dayjs(new Date(view.year, view.month, 1)).add(amount, "month");

  return { year: shifted.year(), month: shifted.month() };
}

export function useMonthView() {
  const [view, setView] = useState<MonthView>(() => {
    const now = dayjs();
    return { year: now.year(), month: now.month() };
  });

  const weeks = useMemo(
    () => buildMonthMatrix(view.year, view.month),
    [view.year, view.month],
  );

  function setYear(year: number) {
    setView((current) => ({ ...current, year }));
  }

  function setMonth(month: number) {
    setView((current) => ({ ...current, month }));
  }

  function goPrev() {
    setView((current) => shiftMonth(current, -1));
  }

  function goNext() {
    setView((current) => shiftMonth(current, 1));
  }

  function goToday() {
    const now = dayjs();
    setView({ year: now.year(), month: now.month() });
  }

  return {
    year: view.year,
    month: view.month,
    weeks,
    setYear,
    setMonth,
    goPrev,
    goNext,
    goToday,
  };
}
