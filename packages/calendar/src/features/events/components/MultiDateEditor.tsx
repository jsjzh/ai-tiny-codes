import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteEventKeys,
  formatEventInputValue,
  formatEventValue,
  getEventsForDates,
  parseEventInput,
  upsertEvents,
  type CalendarEventDisplay,
} from "@/features/calendar/data/events";
import { sortTemplates, type CalendarData } from "@/features/calendar/data/types";
import { formatDateChip, sortUniqueDates } from "@/features/calendar/lib/dateRange";
import { TemplateSelect } from "@/features/events/components/TemplateSelect";
import { cn } from "@/lib/utils";

type MultiDateEditorProps = {
  dates: string[];
  draft: CalendarData;
  onDraftChange: (next: CalendarData) => void;
  onOpenTemplates: () => void;
};

const inputClass =
  "h-8 w-full border border-rule bg-sheet px-2.5 text-xs text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function eventKey(event: CalendarEventDisplay) {
  return `${event.date ?? ""}::${event.code}`;
}

export function MultiDateEditor({
  dates,
  draft,
  onDraftChange,
  onOpenTemplates,
}: MultiDateEditorProps) {
  const sortedDates = useMemo(() => sortUniqueDates(dates), [dates]);
  const templates = useMemo(() => sortTemplates(draft.templates), [draft.templates]);
  const [selectedCode, setSelectedCode] = useState<string | null>(
    () => templates[0]?.code ?? null,
  );
  const [batchValuesByCode, setBatchValuesByCode] = useState<
    Record<string, Record<string, string>>
  >({});
  const [fillValue, setFillValue] = useState("");
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedTemplate =
    templates.find((template) => template.code === selectedCode) ?? null;
  const currentValues = selectedCode ? (batchValuesByCode[selectedCode] ?? {}) : {};

  useEffect(() => {
    if (!selectedCode) {
      return;
    }

    setBatchValuesByCode((previous) => {
      if (previous[selectedCode]) {
        return previous;
      }

      const values: Record<string, string> = {};

      for (const date of sortedDates) {
        const value = draft.events[date]?.[selectedCode];
        values[date] = value !== undefined ? formatEventInputValue(value) : "";
      }

      return { ...previous, [selectedCode]: values };
    });
  }, [selectedCode, draft.events, sortedDates]);

  const rows = useMemo(
    () => getEventsForDates(draft, sortedDates),
    [draft, sortedDates],
  );
  const selectedRows = rows.filter((row) => selectedKeys.has(eventKey(row)));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const existingCount = selectedCode
    ? sortedDates.filter((date) => draft.events[date]?.[selectedCode] !== undefined)
        .length
    : 0;

  function handleTemplateChange(code: string) {
    setSelectedCode(code);
    setFillValue("");
    setBatchError(null);
    setBatchStatus(null);
  }

  function handleValueChange(date: string, value: string) {
    if (!selectedCode) {
      return;
    }

    setBatchValuesByCode((previous) => ({
      ...previous,
      [selectedCode]: {
        ...(previous[selectedCode] ?? {}),
        [date]: value,
      },
    }));
    setBatchError(null);
    setBatchStatus(null);
  }

  function handleFillAll() {
    if (!selectedCode || !fillValue.trim()) {
      return;
    }

    setBatchValuesByCode((previous) => ({
      ...previous,
      [selectedCode]: Object.fromEntries(sortedDates.map((date) => [date, fillValue])),
    }));
    setBatchError(null);
    setBatchStatus(`已填入 ${sortedDates.length} 行`);
  }

  function handleApply() {
    if (!selectedTemplate || !selectedCode) {
      return;
    }

    const updates: Array<{
      date: string;
      code: string;
      value: number | string;
    }> = [];

    for (const date of sortedDates) {
      const raw = (currentValues[date] ?? "").trim();

      if (!raw) {
        continue;
      }

      const value = parseEventInput(selectedTemplate, raw);

      if (value === null) {
        setBatchError(`${formatDateChip(date)} 的值无效，请检查后再保存`);
        return;
      }

      updates.push({ date, code: selectedCode, value });
    }

    if (updates.length === 0) {
      setBatchStatus("没有可保存的值");
      return;
    }

    try {
      onDraftChange(upsertEvents(draft, updates));
      setBatchError(null);
      setBatchStatus(`已保存 ${updates.length} 天`);
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : "保存失败");
    }
  }

  function toggleRow(row: CalendarEventDisplay) {
    const key = eventKey(row);
    setSelectedKeys((previous) => {
      const next = new Set(previous);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
    setConfirmDelete(false);
  }

  function toggleAll() {
    setSelectedKeys(
      allSelected ? new Set() : new Set(rows.map((row) => eventKey(row))),
    );
    setConfirmDelete(false);
  }

  function handleDeleteSelected() {
    if (selectedRows.length === 0) {
      return;
    }

    const next = deleteEventKeys(
      draft,
      selectedRows.map((row) => ({
        date: row.date ?? "",
        code: row.code,
      })),
    );

    onDraftChange(next);
    setBatchValuesByCode((previous) => {
      const nextValues = { ...previous };

      for (const row of selectedRows) {
        if (!row.date || !nextValues[row.code]) {
          continue;
        }

        nextValues[row.code] = {
          ...nextValues[row.code],
          [row.date]: "",
        };
      }

      return nextValues;
    });
    setSelectedKeys(new Set());
    setConfirmDelete(false);
    setBatchStatus(`已删除 ${selectedRows.length} 条`);
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
          还没有事项模板。先建一个模板，才能批量填写事项。
        </p>
        <Button type="button" onClick={onOpenTemplates}>
          去新建模板
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <section className="border-b border-rule p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            批量填写
          </span>
          <div className="min-w-48 flex-1">
            <TemplateSelect
              templates={templates}
              value={selectedCode}
              onChange={handleTemplateChange}
              placeholder="选择要批量填写的事项"
            />
          </div>
        </div>

        {selectedTemplate ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">统一填充</span>
              <input
                type={selectedTemplate.kind === "number" ? "number" : "text"}
                step={selectedTemplate.kind === "number" ? "any" : undefined}
                inputMode={selectedTemplate.kind === "number" ? "decimal" : undefined}
                value={fillValue}
                onChange={(event) => setFillValue(event.target.value)}
                className={cn(inputClass, "w-32 font-mono tabular-nums")}
                placeholder="输入一个值"
              />
              {selectedTemplate.kind === "number" && selectedTemplate.unit ? (
                <span className="text-muted-foreground">{selectedTemplate.unit}</span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!fillValue.trim()}
                onClick={handleFillAll}
              >
                填到全部行
              </Button>
              {fillValue.trim() && existingCount > 0 ? (
                <span className="text-[11px] text-muted-foreground">
                  将覆盖 {existingCount} 天已有值
                </span>
              ) : null}
            </div>

            <div className="mt-3 border border-rule">
              {sortedDates.map((date) => (
                <label
                  key={date}
                  className="flex items-center gap-2 border-b border-rule/60 px-3 py-1.5 last:border-b-0"
                >
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {formatDateChip(date)}
                  </span>
                  <input
                    type={selectedTemplate.kind === "number" ? "number" : "text"}
                    step={selectedTemplate.kind === "number" ? "any" : undefined}
                    inputMode={
                      selectedTemplate.kind === "number" ? "decimal" : undefined
                    }
                    aria-label={`${formatDateChip(date)} ${selectedTemplate.title}`}
                    value={currentValues[date] ?? ""}
                    onChange={(event) => handleValueChange(date, event.target.value)}
                    className={cn(
                      inputClass,
                      selectedTemplate.kind === "number" && "font-mono tabular-nums",
                    )}
                    placeholder="留空则不修改"
                  />
                  {selectedTemplate.kind === "number" && selectedTemplate.unit ? (
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">
                      {selectedTemplate.unit}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="min-h-4 text-[11px] leading-4">
                {batchError ? (
                  <span className="text-destructive">{batchError}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {batchStatus ?? "空值不修改；删除请用下方勾选"}
                  </span>
                )}
              </span>
              <Button type="button" size="sm" onClick={handleApply}>
                保存这些值
              </Button>
            </div>
          </>
        ) : null}
      </section>

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-y border-rule bg-paper px-4 py-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            aria-label="全选事项"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 accent-blueprint"
          />
          全选
        </label>
        <span className="text-xs text-muted-foreground">
          共 {rows.length} 条 · 已选 {selectedRows.length} 条
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedRows.length === 0}
          onClick={() => setConfirmDelete(true)}
        >
          删除选中
        </Button>
      </div>

      {confirmDelete ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-2">
          <span className="text-sm text-destructive">
            确认删除 {selectedRows.length} 条？
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              删除
            </Button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          选中日期还没有事项
        </div>
      ) : (
        <div>
          {rows.map((row) => {
            const key = eventKey(row);
            const checked = selectedKeys.has(key);

            return (
              <div
                key={key}
                onClick={() => toggleRow(row)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 border-b border-rule/60 px-4 py-2 text-sm hover:bg-blueprint-soft/30",
                  checked && "bg-blueprint-soft/30",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRow(row)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`选择 ${row.date ?? ""} ${row.title}`}
                  className="size-4 shrink-0 accent-blueprint"
                />
                <span className="w-20 shrink-0 text-xs text-muted-foreground">
                  {row.date ? formatDateChip(row.date) : ""}
                </span>
                <span
                  className="size-2 shrink-0 border border-black/10"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{row.title}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink/80">
                  {formatEventValue(row, row.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
