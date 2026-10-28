import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { loadChartsData, saveChartsData } from "./storage";
import { createDefaultChartsData, type ChartsData } from "./types";

type ChartsDataContextValue = {
  data: ChartsData;
  isLoading: boolean;
  error: string | null;
  commitData: (next: ChartsData) => Promise<void>;
};

const ChartsDataContext = createContext<ChartsDataContextValue | null>(null);

export function ChartsDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ChartsData>(() =>
    createDefaultChartsData(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadChartsData()
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded);
          setIsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "图表数据加载失败",
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const commitData = useCallback(async (next: ChartsData) => {
    await saveChartsData(next);
    setData(next);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ data, isLoading, error, commitData }),
    [data, isLoading, error, commitData],
  );

  return (
    <ChartsDataContext.Provider value={value}>
      {children}
    </ChartsDataContext.Provider>
  );
}

export function useChartsData(): ChartsDataContextValue {
  const context = useContext(ChartsDataContext);

  if (!context) {
    throw new Error("useChartsData 必须在 ChartsDataProvider 内使用");
  }

  return context;
}