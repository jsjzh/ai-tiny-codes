import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { loadCalendarData, saveCalendarData } from "./storage";
import { createDefaultCalendarData, type CalendarData } from "./types";

type CalendarDataContextValue = {
  data: CalendarData;
  isLoading: boolean;
  error: string | null;
  commitData: (next: CalendarData) => Promise<void>;
};

const CalendarDataContext = createContext<CalendarDataContextValue | null>(null);

export function CalendarDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CalendarData>(() => createDefaultCalendarData());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadCalendarData()
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded);
          setIsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "日历数据加载失败");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const commitData = useCallback(async (next: CalendarData) => {
    await saveCalendarData(next);
    setData(next);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ data, isLoading, error, commitData }),
    [data, isLoading, error, commitData],
  );

  return (
    <CalendarDataContext.Provider value={value}>
      {children}
    </CalendarDataContext.Provider>
  );
}

export function useCalendarData(): CalendarDataContextValue {
  const context = useContext(CalendarDataContext);

  if (!context) {
    throw new Error("useCalendarData 必须在 CalendarDataProvider 内使用");
  }

  return context;
}
