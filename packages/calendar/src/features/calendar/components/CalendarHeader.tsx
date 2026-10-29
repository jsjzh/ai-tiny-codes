import { useMemo } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataBackupButton } from "@/features/backup/DataBackupButton";
import { ThemeSwitcher } from "@/features/theme/ThemeSwitcher";

import { getYearOptions, MONTH_LABELS } from "../lib/date";

type CalendarHeaderProps = {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenTemplates: () => void;
};

export function CalendarHeader({
  year,
  month,
  onYearChange,
  onMonthChange,
  onPrev,
  onNext,
  onToday,
  onOpenTemplates,
}: CalendarHeaderProps) {
  const years = useMemo(() => getYearOptions(year), [year]);
  const now = dayjs();
  const isCurrentMonth = year === now.year() && month === now.month();

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-rule bg-paper px-2 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
      <div aria-hidden="true" />

      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 max-[359px]:gap-x-0.5 sm:flex-nowrap sm:gap-x-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="上个月"
          className="size-8 max-[359px]:size-7 sm:size-9"
          onClick={onPrev}
        >
          <ChevronLeft
            aria-hidden="true"
            className="size-4 max-[359px]:size-3.5 sm:size-[18px]"
          />
        </Button>

        <Select
          value={String(year)}
          onValueChange={(value) => onYearChange(Number(value))}
        >
          <SelectTrigger
            aria-label="选择年份"
            className="font-mono text-3xl font-medium leading-none tracking-tight transition-colors hover:text-blueprint data-[state=open]:text-blueprint max-[359px]:text-2xl sm:text-5xl"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {years.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(month)}
          onValueChange={(value) => onMonthChange(Number(value))}
        >
          <SelectTrigger
            aria-label="选择月份"
            className="text-lg font-medium leading-none transition-colors hover:text-blueprint data-[state=open]:text-blueprint max-[359px]:text-base sm:text-2xl"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((label, index) => (
              <SelectItem key={label} value={String(index)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="下个月"
          className="size-8 max-[359px]:size-7 sm:size-9"
          onClick={onNext}
        >
          <ChevronRight
            aria-hidden="true"
            className="size-4 max-[359px]:size-3.5 sm:size-[18px]"
          />
        </Button>

        <div aria-hidden="true" className="hidden h-6 w-px bg-rule sm:block" />

        <Button
          type="button"
          variant={isCurrentMonth ? "ghost" : "default"}
          className="whitespace-nowrap h-8 px-2 text-xs font-medium max-[359px]:h-7 max-[359px]:px-1.5 max-[359px]:text-[10px] sm:h-9 sm:px-3 sm:text-sm"
          aria-label="回到今日"
          disabled={isCurrentMonth}
          onClick={onToday}
        >
          回到今日
        </Button>
      </div>

      <div className="flex items-center justify-self-end gap-1">
        <ThemeSwitcher />
        <DataBackupButton />
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="事项模板"
          className="h-8 px-2.5 max-[359px]:h-7 max-[359px]:w-7 max-[359px]:px-0 sm:h-9 sm:px-3"
          onClick={onOpenTemplates}
        >
          <LayoutTemplate aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">模板</span>
        </Button>
      </div>
    </header>
  );
}
