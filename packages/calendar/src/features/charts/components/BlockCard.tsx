import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { CalendarData } from "@/features/calendar/data/types";
import { useReducedMotion } from "@/lib/useReducedMotion";

import type { CalendarBlock } from "../data/types";
import { resolveBlockResult } from "../lib/blockRules";

type BlockCardProps = {
  block: CalendarBlock;
  calendarData: CalendarData;
  caseRange: { startDate: string; endDate: string };
};

function parseNumericValue(value: string): number | null {
  const numeric = Number(value);
  return value.trim() && Number.isFinite(numeric) ? numeric : null;
}

function formatAnimatedValue(value: number, original: string): string {
  const decimals = original.includes(".")
    ? original.split(".")[1]?.length ?? 0
    : 0;

  return value.toFixed(decimals);
}

function AnimatedValue({ value }: { value: string }) {
  const reducedMotion = useReducedMotion();
  const target = parseNumericValue(value);
  const previousRef = useRef(0);
  const [display, setDisplay] = useState(() =>
    target === null || reducedMotion
      ? value
      : formatAnimatedValue(0, value),
  );

  useEffect(() => {
    if (target === null || reducedMotion) {
      setDisplay(value);
      return;
    }

    const from = previousRef.current;
    const duration = 420;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;

      if (progress < 1) {
        setDisplay(formatAnimatedValue(next, value));
        frame = requestAnimationFrame(tick);
        return;
      }

      previousRef.current = target;
      setDisplay(value);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, value, reducedMotion]);

  return <>{display}</>;
}

export function BlockCard({
  block,
  calendarData,
  caseRange,
}: BlockCardProps) {
  const result = resolveBlockResult(block, calendarData, caseRange);
  const event = block.eventCode
    ? calendarData.templates.find(
        (template) => template.code === block.eventCode,
      )
    : null;
  const isText =
    event?.kind === "text" || (block.rule.type === "fixed" && !result.unit);

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="size-1.5 shrink-0 border border-black/10"
          style={{ backgroundColor: event?.color ?? "#1d3a8a" }}
        />
        <span className="truncate text-xs font-medium text-muted-foreground">
          {block.title}
        </span>
        {result.rangeLabel ? (
          <span className="shrink-0 border border-rule bg-paper px-1 py-0.5 text-[10px] text-muted-foreground">
            {result.rangeLabel}
            {result.exceedsCase ? " · 含回看" : ""}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn(
              "min-w-0 font-mono font-semibold tabular-nums text-ink",
              isText ? "line-clamp-2 text-2xl" : "truncate text-3xl",
              result.status !== "ok" && "text-muted-foreground",
            )}
          >
            <AnimatedValue value={result.value} />
          </span>
          {result.unit ? (
            <span className="shrink-0 text-sm text-muted-foreground">
              {result.unit}
            </span>
          ) : null}
        </div>
        {result.info ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {result.info}
          </p>
        ) : null}
      </div>
    </div>
  );
}