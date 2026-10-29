import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CalendarEventValue,
  CalendarTemplate,
} from "@/features/calendar/data/types";
import { formatEventValue } from "@/features/calendar/data/events";

import {
  parseEventImport,
  type EventImportParseResult,
  type EventImportRow,
} from "../lib/importEvents";

type ImportEventsDialogProps = {
  open: boolean;
  template: CalendarTemplate;
  existingValues: Record<string, CalendarEventValue>;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: EventImportRow[]) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function ImportEventsDialog({
  open,
  template,
  existingValues,
  onOpenChange,
  onImport,
}: ImportEventsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<EventImportParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFileName("");
    setResult(null);
    setError(null);
    setIsReading(false);
  }, [open, template.code]);

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError("文件不能超过 10MB");
      return;
    }

    setFileName(file.name);
    setResult(null);
    setError(null);
    setIsReading(true);

    try {
      const text = await file.text();
      setResult(parseEventImport(text, template, file.name));
    } catch (parseError) {
      setError(
        parseError instanceof Error ? parseError.message : "文件解析失败",
      );
    } finally {
      setIsReading(false);
    }
  }

  const addedCount = result
    ? result.rows.filter((row) => !(row.date in existingValues)).length
    : 0;
  const replacedCount = result ? result.rows.length - addedCount : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        scrollable={false}
        className="max-w-xl p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="shrink-0 border-b border-rule px-6 py-4 pr-14">
            <DialogHeader className="mb-0 pr-0">
              <DialogTitle className="text-xl">导入事项数据</DialogTitle>
              <DialogDescription>
                导入到「{template.title}」；按日期覆盖当前模板的值，不影响其他事项。
              </DialogDescription>
            </DialogHeader>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <input
              ref={inputRef}
              type="file"
              accept=".json,.csv,.tsv,application/json,text/csv,text/tab-separated-values"
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
              className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-rule bg-paper px-4 py-7 text-center transition-colors hover:border-blueprint hover:bg-blueprint-soft/40"
            >
              <Upload
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
              <span className="text-sm font-medium text-ink">
                选择或拖入 JSON / CSV 文件
              </span>
              <span className="text-[11px] leading-5 text-muted-foreground">
                JSON 支持 logs、对象数组、日期→值；CSV 支持 date,value 或
                日期,值
              </span>
            </button>

            {fileName ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <FileText aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{fileName}</span>
                {isReading ? <span>读取中…</span> : null}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 flex items-start gap-2 border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0"
                />
                <span>{error}</span>
              </div>
            ) : null}

            {result ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2 border border-rule bg-paper p-3 text-center">
                  <div>
                    <p className="font-mono text-lg font-semibold text-ink">
                      {result.rows.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">可导入</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold text-ink">
                      {addedCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">新增</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-semibold text-ink">
                      {replacedCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">覆盖</p>
                  </div>
                </div>

                {result.rows.length === 0 ? (
                  <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    没有解析到可导入的记录，请检查日期和值。
                  </p>
                ) : (
                  <div className="border border-rule">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-rule bg-paper text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">日期</th>
                          <th className="px-3 py-2 font-medium">值</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, 5).map((row) => (
                          <tr
                            key={row.date}
                            className="border-b border-rule/60 last:border-b-0"
                          >
                            <td className="px-3 py-2 font-mono">
                              {row.date}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {formatEventValue(template, row.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.rows.length > 5 ? (
                      <p className="border-t border-rule px-3 py-2 text-[10px] text-muted-foreground">
                        仅预览前 5 条，共 {result.rows.length} 条。
                      </p>
                    ) : null}
                  </div>
                )}

                {result.sourceUnit && !template.unit ? (
                  <p className="text-[11px] leading-5 text-destructive">
                    文件值的单位是「{result.sourceUnit}」，当前模板单位为空；请在导入后到模板表单补上单位。
                  </p>
                ) : null}

                {result.invalidCount > 0 || result.duplicateCount > 0 ? (
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    {result.invalidCount > 0
                      ? `${result.invalidCount} 条无效或缺少日期/值，已跳过。`
                      : ""}
                    {result.duplicateCount > 0
                      ? ` ${result.duplicateCount} 条日期重复，保留最后一条。`
                      : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-rule px-6 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={!result || result.rows.length === 0}
              onClick={() => {
                if (!result) {
                  return;
                }

                onImport(result.rows);
                onOpenChange(false);
              }}
            >
              导入 {result?.rows.length ?? 0} 条
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}