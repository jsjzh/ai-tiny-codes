import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarData } from "@/features/calendar/data/CalendarDataProvider";
import {
  cloneCalendarData,
  normalizeCalendarData,
  type CalendarData,
} from "@/features/calendar/data/types";
import {
  formatDateChip,
  formatFullDate,
  sortUniqueDates,
  summarizeDates,
} from "@/features/calendar/lib/dateRange";

import { MultiDateEditor } from "./components/MultiDateEditor";
import { SingleDateEditor } from "./components/SingleDateEditor";

type EventEditModalProps = {
  open: boolean;
  dates: string[];
  onOpenChange: (open: boolean) => void;
  onOpenTemplates: () => void;
};

export function EventEditModal({
  open,
  dates,
  onOpenChange,
  onOpenTemplates,
}: EventEditModalProps) {
  const { data, isLoading, commitData } = useCalendarData();
  const [draft, setDraft] = useState<CalendarData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sortedDates = useMemo(() => sortUniqueDates(dates), [dates]);
  const datesKey = sortedDates.join(",");
  const summary = useMemo(() => summarizeDates(sortedDates), [sortedDates]);
  const isSingle = sortedDates.length === 1;
  const isToday = isSingle && dayjs(sortedDates[0]).isSame(dayjs(), "day");

  useEffect(() => {
    if (!open || isLoading) {
      return;
    }

    setDraft(cloneCalendarData(data));
    setDirty(false);
    setConfirmDiscard(false);
    setIsSaving(false);
    setSaveError(null);
  }, [open, isLoading, data, datesKey]);

  function closeModal() {
    setConfirmDiscard(false);
    onOpenChange(false);
  }

  function handleRequestClose() {
    if (isSaving) {
      return;
    }

    if (dirty) {
      setConfirmDiscard(true);
      return;
    }

    closeModal();
  }

  function handleDraftChange(next: CalendarData) {
    setDraft(next);
    setDirty(true);
    setSaveError(null);
  }

  async function handleComplete() {
    if (!draft) {
      return;
    }

    if (!dirty) {
      closeModal();
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const next = normalizeCalendarData(draft);
      await commitData(next);
      setDirty(false);
      closeModal();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open || sortedDates.length === 0) {
    return null;
  }

  if (!draft) {
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
          className="max-w-md p-6"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>编辑事项</DialogTitle>
            <DialogDescription>
              {isLoading ? "正在加载事项…" : "事项数据还没有准备好"}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleRequestClose();
        }
      }}
    >
      <DialogContent
        scrollable={false}
        className={isSingle ? "max-w-2xl p-0" : "max-w-4xl p-0"}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="shrink-0 border-b border-rule px-6 py-4 pr-14">
            <DialogHeader className="mb-0 pr-0">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
                {isSingle ? formatFullDate(sortedDates[0]) : "批量编辑事项"}
                {isToday ? (
                  <span className="border border-blueprint/30 bg-blueprint-soft px-1.5 py-0.5 text-[10px] font-medium text-blueprint">
                    今天
                  </span>
                ) : null}
              </DialogTitle>
              <DialogDescription>
                {isSingle ? "编辑当天事项" : summary.label}
              </DialogDescription>
              {!isSingle && !summary.isRange ? (
                <div className="mt-2 flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
                  {sortedDates.map((date) => (
                    <span
                      key={date}
                      className="border border-rule bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink/80"
                    >
                      {formatDateChip(date)}
                    </span>
                  ))}
                </div>
              ) : null}
            </DialogHeader>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            {isSingle ? (
              <SingleDateEditor
                date={sortedDates[0]}
                draft={draft}
                onDraftChange={handleDraftChange}
                onOpenTemplates={onOpenTemplates}
              />
            ) : (
              <MultiDateEditor
                dates={sortedDates}
                draft={draft}
                onDraftChange={handleDraftChange}
                onOpenTemplates={onOpenTemplates}
              />
            )}
          </div>

          <footer className="shrink-0 border-t border-rule px-6 py-3">
            {confirmDiscard ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-ink">有未提交修改，确定放弃？</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    继续编辑
                  </Button>
                  <Button type="button" variant="destructive" onClick={closeModal}>
                    放弃
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs">
                  {saveError ? (
                    <span className="block truncate text-destructive">{saveError}</span>
                  ) : (
                    <span className="block truncate text-muted-foreground">
                      {dirty ? "有未提交修改" : "点“完成”保存"}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRequestClose}
                    disabled={isSaving}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleComplete()}
                    disabled={isSaving}
                  >
                    {isSaving ? "保存中…" : "完成"}
                  </Button>
                </div>
              </div>
            )}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
