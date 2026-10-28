import { CalendarDataProvider } from "@/features/calendar/data/CalendarDataProvider";
import { CalendarView } from "@/features/calendar/CalendarView";
import { ChartsDataProvider } from "@/features/charts/data/ChartsDataProvider";
import { ChartsSection } from "@/features/charts/ChartsSection";

export function App() {
  return (
    <CalendarDataProvider>
      <ChartsDataProvider>
        <main className="min-h-dvh bg-paper">
          <CalendarView />
          <ChartsSection />
        </main>
      </ChartsDataProvider>
    </CalendarDataProvider>
  );
}
