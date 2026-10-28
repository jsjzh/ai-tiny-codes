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
import { EventEditModal } from "@/features/events/EventEditModal";
import { TemplateModal } from "@/features/templates/TemplateModal";
import { useCalendarData } from "@/features/calendar/data/CalendarDataProvider";
import {
  countEventsOnDates,
  deleteAllEventsOnDates,
} from "@/features/calendar/data/events";

import { CalendarHeader } from "./components/CalendarHeader";
import { MonthGrid } from "./components/MonthGrid";
import { WeekdayHeader } from "./components/WeekdayHeader";
import { useCalendarSelection } from "./hooks/useCalendarSelection";
import { useMonthView } from "./hooks/useMonthView";

export function CalendarView() {
  const { data, commitData } = useCalendarData();
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
  const [editDates, setEditDates] = useState<string[] | null>(null);
  const [clearDates, setClearDates] = useState<string[] | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

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

  const selectedDateList = Array.from(selectedDates).sort();
  const selectedEventCount = countEventsOnDates(data, selectedDateList);
  const clearEventCount = clearDates ? countEventsOnDates(data, clearDates) : 0;

  function openEdit(dates: string[]) {
    setEditDates(Array.from(new Set(dates)).sort());
  }

  function openClear(dates: string[]) {
    setClearError(null);
    setClearDates(Array.from(new Set(dates)).sort());
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
    openEdit([date]);
  }

  async function handleConfirmClear() {
    if (!clearDates || isClearing) {
      return;
    }

    setIsClearing(true);
    setClearError(null);

    try {
      await commitData(deleteAllEventsOnDates(data, clearDates));
      setClearDates(null);
      clearSelection();
    } catch (error) {
      setClearError(error instanceof Error ? error.message : "清空失败");
    } finally {
      setIsClearing(false);
    }
  }

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
        onOpenTemplates={() => setTemplateModalOpen(true)}
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
            templates={data.templates}
            events={data.events}
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
            onSelect={() => openEdit(selectedDateList)}
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            编辑
          </ContextMenuItem>
          <ContextMenuItem
            disabled={selectedDates.size === 0 || selectedEventCount === 0}
            onSelect={() => openClear(selectedDateList)}
            className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            清空
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog
        open={clearDates !== null}
        onOpenChange={(open) => {
          if (!open && !isClearing) {
            setClearDates(null);
          }
        }}
      >
        <DialogContent
          scrollable={false}
          className="max-w-md p-6"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>清空选中日期？</DialogTitle>
            <DialogDescription>
              将清空这些日期的全部事项，共 {clearEventCount} 条记录，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto border border-rule bg-paper p-3">
            {(clearDates ?? []).map((date) => (
              <span
                key={date}
                className="border border-rule bg-sheet px-1.5 py-0.5 font-mono text-[11px] text-ink/80"
              >
                {date}
              </span>
            ))}
          </div>

          {clearError ? (
            <p className="mt-3 text-xs text-destructive">{clearError}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isClearing}
              onClick={() => setClearDates(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isClearing}
              onClick={() => void handleConfirmClear()}
            >
              {isClearing ? "清空中…" : "清空"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventEditModal
        open={editDates !== null}
        dates={editDates ?? []}
        onOpenChange={(open) => {
          if (!open) {
            setEditDates(null);
          }
        }}
        onOpenTemplates={() => {
          setEditDates(null);
          setTemplateModalOpen(true);
        }}
      />

      <TemplateModal open={templateModalOpen} onOpenChange={setTemplateModalOpen} />
    </main>
  );
}
