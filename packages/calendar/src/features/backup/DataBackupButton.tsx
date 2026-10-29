import { useEffect, useRef, useState } from "react";
import { AlertCircle, DatabaseBackup, Download, FileJson, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarData } from "@/features/calendar/data/CalendarDataProvider";
import { useChartsData } from "@/features/charts/data/ChartsDataProvider";
import {
  downloadBackup,
  parseBackup,
  type ParsedBackup,
} from "./backup";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function DataBackupButton() {
  const {
    data: calendarData,
    isLoading: calendarLoading,
    commitData: commitCalendar,
  } = useCalendarData();
  const {
    data: chartsData,
    isLoading: chartsLoading,
    commitData: commitCharts,
  } = useChartsData();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFileName("");
    setParsed(null);
    setError(null);
    setMessage(null);
    setIsImporting(false);
  }, [open]);

  useEffect(() => {
    if (parsed) {
      previewRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [parsed]);

  const calendarEvents = Object.keys(calendarData.events).length;
  const backupEvents = parsed ? Object.keys(parsed.calendar.events).length : 0;

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError("文件不能超过 20MB");
      return;
    }

    setFileName(file.name);
    setParsed(null);
    setError(null);
    setMessage(null);

    try {
      setParsed(parseBackup(await file.text()));
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : "备份解析失败",
      );
    }
  }

  async function handleImport() {
    if (!parsed) {
      return;
    }

    setIsImporting(true);
    setError(null);

    const previousCalendar = calendarData;
    const previousCharts = chartsData;

    try {
      await commitCalendar(parsed.calendar);
      await commitCharts(parsed.charts);
      setOpen(false);
    } catch (importError) {
      try {
        await commitCalendar(previousCalendar);
        await commitCharts(previousCharts);
      } catch {}

      setError(
        importError instanceof Error ? importError.message : "导入失败",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <div data-ignore-selection>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="数据备份"
          className="h-8 px-2.5 max-[359px]:h-7 max-[359px]:w-7 max-[359px]:px-0 sm:h-9 sm:px-3"
          onClick={() => setOpen(true)}
        >
          <DatabaseBackup aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">数据</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          scrollable={false}
          className="max-w-2xl p-0"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
            <header className="shrink-0 border-b border-rule px-6 py-4 pr-14">
              <DialogHeader className="mb-0 pr-0">
                <DialogTitle className="text-xl">数据备份</DialogTitle>
                <DialogDescription>
                  导出或导入整个日历与图表数据；导入会直接覆盖当前数据。
                </DialogDescription>
              </DialogHeader>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="border border-rule bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">导出备份</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      日历 {calendarData.templates.length} 个事项模板 ·{" "}
                      {calendarEvents} 天记录 · 图表 {chartsData.templates.length}{" "}
                      个模板 / {chartsData.cases.length} 个案例
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={calendarLoading || chartsLoading}
                    onClick={() => {
                      downloadBackup(calendarData, chartsData);
                      setMessage("备份已下载");
                    }}
                  >
                    <Download aria-hidden="true" className="size-4" />
                    导出 JSON
                  </Button>
                </div>
              </div>

              <div className="mt-4 border border-rule bg-paper p-4">
                <p className="text-sm font-medium text-ink">导入备份</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  支持本应用导出的 JSON 备份；导入后当前事项、模板、图表和案例都会被覆盖。
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";

                    if (file) {
                      void handleFile(file);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];

                    if (file) {
                      void handleFile(file);
                    }
                  }}
                  className="mt-3 flex w-full flex-col items-center justify-center gap-2 border border-dashed border-rule bg-sheet px-4 py-6 text-center transition-colors hover:border-blueprint hover:bg-blueprint-soft/40"
                >
                  <Upload aria-hidden="true" className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-ink">
                    选择或拖入 JSON 备份
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    选择文件后会先预览覆盖后的数据量
                  </span>
                </button>

                {fileName ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <FileJson aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-3 flex items-start gap-2 border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                {parsed ? (
                  <div
                    ref={previewRef}
                    className="mt-4 border border-rule bg-sheet p-3"
                  >
                    <p className="text-xs font-medium text-ink">覆盖预览</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <p className="font-mono text-lg font-semibold text-ink">
                          {parsed.calendar.templates.length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">事项模板</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-semibold text-ink">
                          {backupEvents}
                        </p>
                        <p className="text-[10px] text-muted-foreground">记录天数</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-semibold text-ink">
                          {parsed.charts.templates.length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">图表模板</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-semibold text-ink">
                          {parsed.charts.cases.length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">图表案例</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {message ? (
                  <p className="mt-3 text-xs text-blueprint">{message}</p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-rule px-6 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isImporting}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!parsed || isImporting}
                onClick={() => void handleImport()}
              >
                {isImporting ? "导入中…" : "覆盖并导入"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
