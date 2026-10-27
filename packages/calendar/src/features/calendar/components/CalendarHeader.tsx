import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getYearOptions, MONTH_LABELS } from "../lib/date";

type CalendarHeaderProps = {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function CalendarHeader({
  year,
  month,
  onYearChange,
  onMonthChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  const years = useMemo(() => getYearOptions(year), [year]);

  return (
    <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-rule bg-paper px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex items-end gap-3 sm:gap-4">
        <Select
          value={String(year)}
          onValueChange={(value) => onYearChange(Number(value))}
        >
          <SelectTrigger
            aria-label="选择年份"
            className="font-mono text-4xl font-medium leading-none tracking-tight transition-colors hover:text-blueprint data-[state=open]:text-blueprint sm:text-5xl"
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
            className="pb-0.5 text-xl font-medium leading-none transition-colors hover:text-blueprint data-[state=open]:text-blueprint sm:pb-1 sm:text-2xl"
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
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="上个月"
          onClick={onPrev}
        >
          <ChevronLeft aria-hidden="true" className="size-[18px]" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="下个月"
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" className="size-[18px]" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="ml-2 h-9 px-4 font-medium"
          aria-label="回到今天"
          onClick={onToday}
        >
          今天
        </Button>
      </div>
    </header>
  );
}
