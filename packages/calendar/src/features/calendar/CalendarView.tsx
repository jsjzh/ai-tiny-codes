import { useEffect, useState, type MouseEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CalendarHeader } from "./components/CalendarHeader";
import { MonthGrid } from "./components/MonthGrid";
import { WeekdayHeader } from "./components/WeekdayHeader";
import { useCalendarSelection } from "./hooks/useCalendarSelection";
import { useMonthView } from "./hooks/useMonthView";

type CalendarDialog =
  { type: "edit"; dates: string[] } | { type: "clear"; dates: string[] } | null;

export function CalendarView() {
  const { year, month, weeks, setYear, setMonth, goPrev, goNext, goToday } =
    useMonthView();
  const {
    selectedDates,
    clearSelection,
    handlePointerDown,
    handlePointerEnter,
    handleClick,
    ensureDateSelected,
  } = useCalendarSelection();
  const [dialog, setDialog] = useState<CalendarDialog>(null);

  useEffect(() => {
    clearSelection();
  }, [year, month, clearSelection]);

  useEffect(() => {
    function handleDocumentPointerDown(event: PointerEvent) {
      if (event.button !== 0) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest(
          '[role="grid"], [role="menu"], [role="dialog"], [data-slot="dialog-overlay"]',
        )
      ) {
        return;
      }

      clearSelection();
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [clearSelection]);

  function openDialog(type: "edit" | "clear") {
    setDialog({
      type,
      dates: Array.from(selectedDates).sort(),
    });
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    if (!(target instanceof Element)) {
      event.preventDefault();
      return;
    }

    const date = target.closest<HTMLElement>("[data-date]")?.dataset.date;

    if (!date) {
      event.preventDefault();
      return;
    }

    ensureDateSelected(date);
  }

  function handleDayDoubleClick(date: string) {
    ensureDateSelected(date);
    setDialog({ type: "edit", dates: [date] });
  }

  function handleConfirmClear() {
    clearSelection();
    setDialog(null);
  }

  const dialogDates = dialog?.dates ?? [];
  const isClearDialog = dialog?.type === "clear";

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-paper">
      <CalendarHeader
        year={year}
        month={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
      />
      <WeekdayHeader />
      <ContextMenu>
        <ContextMenuTrigger
          className="flex min-h-0 flex-1 flex-col"
          onContextMenu={handleContextMenu}
        >
          <MonthGrid
            weeks={weeks}
            year={year}
            month={month}
            selectedDates={selectedDates}
            onDayPointerDown={handlePointerDown}
            onDayPointerEnter={handlePointerEnter}
            onDayClick={handleClick}
            onDayDoubleClick={handleDayDoubleClick}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>已选 {selectedDates.size} 天</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={selectedDates.size === 0}
            onSelect={() => openDialog("edit")}
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            编辑
          </ContextMenuItem>
          <ContextMenuItem
            disabled={selectedDates.size === 0}
            onSelect={() => openDialog("clear")}
            className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            清空
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isClearDialog ? "清空选中日期？" : "编辑事项"}</DialogTitle>
            <DialogDescription>
              {isClearDialog
                ? `将清空这 ${dialogDates.length} 天的所有事项，此操作不可撤销。事项数据将在阶段 3 接入。`
                : `编辑弹窗将在阶段 3 实现。当前已选 ${dialogDates.length} 天。`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto border border-rule bg-paper p-3">
            {dialogDates.map((date) => (
              <span
                key={date}
                className="border border-rule bg-sheet px-1.5 py-0.5 font-mono text-[11px] text-ink/80"
              >
                {date}
              </span>
            ))}
          </div>
          <DialogFooter>
            {isClearDialog ? (
              <>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                  取消
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmClear}
                >
                  清空
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setDialog(null)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
