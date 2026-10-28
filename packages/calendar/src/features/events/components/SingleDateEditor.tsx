import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteEventKeys,
  formatEventInputValue,
  formatEventValue,
  getEventsForDate,
  parseEventInput,
  upsertEvents,
  type CalendarEventDisplay,
} from "@/features/calendar/data/events";
import { sortTemplates, type CalendarData } from "@/features/calendar/data/types";
import { TemplateSelect } from "@/features/events/components/TemplateSelect";
import { cn } from "@/lib/utils";

type SingleDateEditorProps = {
  date: string;
  draft: CalendarData;
  onDraftChange: (next: CalendarData) => void;
  onOpenTemplates: () => void;
};

const inputClass =
  "h-9 w-full border border-rule bg-sheet px-2.5 text-sm text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function SingleDateEditor({
  date,
  draft,
  onDraftChange,
  onOpenTemplates,
}: SingleDateEditorProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);

  const templates = sortTemplates(draft.templates);
  const events = getEventsForDate(draft, date);
  const selectedTemplate =
    templates.find((template) => template.code === selectedCode) ?? null;

  function resetForm() {
    setSelectedCode(null);
    setValueInput("");
    setFormError(null);
  }

  function handleSelectTemplate(code: string) {
    const template = templates.find((item) => item.code === code);
    const existing = draft.events[date]?.[code];

    setSelectedCode(code);
    setValueInput(existing !== undefined ? formatEventInputValue(existing) : "");
    setFormError(null);
    setFormStatus(template ? `已选择「${template.title}」` : null);
    setDeleteConfirmCode(null);
  }

  function handleSelectEvent(event: CalendarEventDisplay) {
    setSelectedCode(event.code);
    setValueInput(formatEventInputValue(event.value));
    setFormError(null);
    setFormStatus(`正在编辑「${event.title}」`);
    setDeleteConfirmCode(null);
  }

  function handleSave() {
    if (!selectedTemplate || !selectedCode) {
      setFormError("请选择事项");
      return;
    }

    const value = parseEventInput(selectedTemplate, valueInput);

    if (value === null) {
      setFormError(
        selectedTemplate.kind === "number" ? "请输入有效的数值" : "内容不能为空",
      );
      return;
    }

    onDraftChange(upsertEvents(draft, [{ date, code: selectedCode, value }]));
    setFormError(null);
    resetForm();
    setFormStatus(`已保存「${selectedTemplate.title}」`);
  }

  function handleDelete(event: CalendarEventDisplay) {
    onDraftChange(deleteEventKeys(draft, [{ date, code: event.code }]));
    setDeleteConfirmCode(null);
    setFormStatus(`已删除「${event.title}」`);

    if (selectedCode === event.code) {
      resetForm();
    }
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
          还没有事项模板。先建一个模板，才能在这一天记录事项。
        </p>
        <Button type="button" onClick={onOpenTemplates}>
          去新建模板
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>当天事项</span>
          <span>{events.length} 条</span>
        </div>

        {events.length === 0 ? (
          <div className="border border-dashed border-rule px-4 py-8 text-center text-sm text-muted-foreground">
            这一天还没有事项
          </div>
        ) : (
          <div className="border-t border-rule">
            {events.map((event) =>
              deleteConfirmCode === event.code ? (
                <div
                  key={event.code}
                  className="border-b border-rule/60 bg-destructive/5 px-3 py-3"
                >
                  <p className="text-sm text-destructive">删除「{event.title}」？</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmCode(null)}
                    >
                      取消
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(event)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={event.code}
                  className={cn(
                    "flex items-stretch border-b border-rule/60",
                    selectedCode === event.code && "bg-blueprint-soft/40",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(event)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left hover:bg-blueprint-soft/30"
                  >
                    <span
                      className="size-2 shrink-0 border border-black/10"
                      style={{ backgroundColor: event.color }}
                    />
                    <span className="shrink-0 text-sm font-medium">{event.title}</span>
                    <span className="min-w-0 truncate font-mono text-xs text-ink/80">
                      {formatEventValue(event, event.value)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${event.title}`}
                    className="flex w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteConfirmCode(event.code)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-rule p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
              事项
            </span>
            <div className="min-w-0 flex-1">
              <TemplateSelect
                templates={templates}
                value={selectedCode}
                onChange={handleSelectTemplate}
                placeholder="选择要添加 / 更新的事项"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              {selectedTemplate?.kind === "number" ? (
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={valueInput}
                    onChange={(event) => {
                      setValueInput(event.target.value);
                      setFormError(null);
                      setFormStatus(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleSave();
                      }
                    }}
                    className={cn(inputClass, "pr-14 font-mono tabular-nums")}
                    placeholder="输入数值"
                    disabled={!selectedTemplate}
                  />
                  {selectedTemplate.unit ? (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {selectedTemplate.unit}
                    </span>
                  ) : null}
                </div>
              ) : (
                <textarea
                  value={valueInput}
                  onChange={(event) => {
                    setValueInput(event.target.value);
                    setFormError(null);
                    setFormStatus(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      handleSave();
                    }
                  }}
                  disabled={!selectedTemplate}
                  className={cn(inputClass, "min-h-16 resize-y py-2 leading-6")}
                  placeholder={selectedTemplate ? "输入内容" : "先选择事项，再输入内容"}
                />
              )}
            </div>

            <Button
              type="button"
              className="h-9 shrink-0"
              disabled={!selectedCode || !valueInput.trim()}
              onClick={handleSave}
            >
              保存
            </Button>
          </div>

          <div className="min-h-4 text-[11px] leading-4">
            {formError ? (
              <span className="text-destructive">{formError}</span>
            ) : (
              <span className="text-muted-foreground">
                {formStatus ?? "保存后留在弹窗，可继续添加"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
