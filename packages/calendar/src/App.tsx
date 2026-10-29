import { CalendarDataProvider } from "@/features/calendar/data/CalendarDataProvider";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { CalendarView } from "@/features/calendar/CalendarView";
import { ChartsDataProvider } from "@/features/charts/data/ChartsDataProvider";
import { ChartsSection } from "@/features/charts/ChartsSection";

export function App() {
  return (
    <ThemeProvider>
      <CalendarDataProvider>
        <ChartsDataProvider>
          <main className="min-h-dvh bg-paper">
            <CalendarView />
            <ChartsSection />
          </main>
        </ChartsDataProvider>
      </CalendarDataProvider>
    </ThemeProvider>
  );
}
