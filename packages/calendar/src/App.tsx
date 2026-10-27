import { CalendarDataProvider } from "@/features/calendar/data/CalendarDataProvider";
import { CalendarView } from "@/features/calendar/CalendarView";

export function App() {
  return (
    <CalendarDataProvider>
      <CalendarView />
    </CalendarDataProvider>
  );
}
