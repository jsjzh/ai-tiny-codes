import { CalendarHeader } from "./components/CalendarHeader";
import { MonthGrid } from "./components/MonthGrid";
import { WeekdayHeader } from "./components/WeekdayHeader";
import { useMonthView } from "./hooks/useMonthView";

export function CalendarView() {
  const { year, month, weeks, setYear, setMonth, goPrev, goNext, goToday } =
    useMonthView();

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-paper">
      <CalendarHeader
        year={year}
        month={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
      />
      <WeekdayHeader />
      <MonthGrid weeks={weeks} year={year} month={month} />
    </main>
  );
}
