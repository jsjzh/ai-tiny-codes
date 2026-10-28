import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { CSSProperties, DragEvent } from "react";
import type { CalendarData } from "@/features/calendar/data/types";
import { cn } from "@/lib/utils";

import type {
  CaseWidget,
  ChartCase,
  ChartCaseRow,
  ChartTemplate,
} from "../data/types";
import {
  BLOCK_HEIGHT_OPTIONS,
  CHART_DRAG_TYPE,
  CHART_HEIGHT_OPTIONS,
  WIDGET_DRAG_TYPE,
  widgetHeightPx,
} from "../lib/widgetLayout";
import { BlockCard } from "./BlockCard";
import { ChartCard } from "./ChartCard";

type SlotAddress = { rowIndex: number; slotIndex: number };

type WidgetFrameProps = {
  widget: CaseWidget;
  address: SlotAddress;
  caseData: ChartCase;
  calendarData: CalendarData;
  chartTemplates: ChartTemplate[];
  editing: boolean;
  onRemove: () => void;
  onHeightChange: (height: number) => void;
  onEditBlock: () => void;
};

function WidgetFrame({
  widget,
  address,
  caseData,
  calendarData,
  chartTemplates,
  editing,
  onRemove,
  onHeightChange,
  onEditBlock,
}: WidgetFrameProps) {
  const heightOptions =
    widget.kind === "block" ? BLOCK_HEIGHT_OPTIONS : CHART_HEIGHT_OPTIONS;

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden border border-rule bg-sheet"
      style={{ height: widgetHeightPx(widget), alignSelf: "start" }}
    >
      {editing ? (
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-rule bg-paper px-2 py-1">
          <button
            type="button"
            draggable
            aria-label="拖动内容"
            className="flex size-6 cursor-grab items-center justify-center text-muted-foreground hover:text-ink active:cursor-grabbing"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(
                WIDGET_DRAG_TYPE,
                JSON.stringify(address),
              );
            }}
          >
            <GripVertical aria-hidden="true" className="size-3.5" />
          </button>

          <div className="flex items-center gap-1">
            <select
              aria-label="内容高度"
              value={widget.height}
              onChange={(event) =>
                onHeightChange(Number(event.target.value))
              }
              className="h-7 border border-rule bg-sheet px-1.5 text-[10px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {heightOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {widget.kind === "block" ? (
              <button
                type="button"
                aria-label="编辑块"
                className="flex size-7 items-center justify-center text-muted-foreground hover:bg-blueprint-soft hover:text-ink"
                onClick={onEditBlock}
              >
                <Pencil aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}

            <button
              type="button"
              aria-label="移除内容"
              className="flex size-7 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {widget.kind === "block" ? (
          <BlockCard
            block={widget.block}
            calendarData={calendarData}
            caseRange={caseData}
          />
        ) : (
          <ChartCard
            chartTemplateCode={widget.chartTemplateCode}
            chartTemplates={chartTemplates}
            calendarData={calendarData}
          />
        )}
      </div>
    </div>
  );
}

type CaseCanvasProps = {
  caseData: ChartCase;
  calendarData: CalendarData;
  chartTemplates: ChartTemplate[];
  editing: boolean;
  onChange: (next: ChartCase) => void;
  onEditBlock: (
    rowIndex: number,
    slotIndex: number,
    block: Extract<CaseWidget, { kind: "block" }>["block"],
  ) => void;
};

function lastOccupiedSlot(slots: Array<CaseWidget | null>): number {
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (slots[index]) {
      return index;
    }
  }

  return -1;
}

export function CaseCanvas({
  caseData,
  calendarData,
  chartTemplates,
  editing,
  onChange,
  onEditBlock,
}: CaseCanvasProps) {
  function updateRows(rows: ChartCaseRow[]) {
    onChange({ ...caseData, rows });
  }

  function addEventCode(eventCode: string | null) {
    if (!eventCode || caseData.eventCodes.includes(eventCode)) {
      return caseData.eventCodes;
    }

    return [...caseData.eventCodes, eventCode];
  }

  function placeChart(
    rowIndex: number,
    slotIndex: number,
    chartTemplateCode: string,
  ) {
    const template = chartTemplates.find(
      (item) => item.code === chartTemplateCode,
    );

    if (!template) {
      return;
    }

    const rows = caseData.rows.map((row) => ({
      slots: [...row.slots],
    }));

    if (rows[rowIndex]?.slots[slotIndex]) {
      return;
    }

    rows[rowIndex].slots[slotIndex] = {
      kind: "chart",
      chartTemplateCode,
      height: 2,
    };

    onChange({
      ...caseData,
      eventCodes: addEventCode(template.eventCode),
      rows,
    });
  }

  function moveWidget(from: SlotAddress, to: SlotAddress) {
    if (from.rowIndex === to.rowIndex && from.slotIndex === to.slotIndex) {
      return;
    }

    const rows = caseData.rows.map((row) => ({
      slots: [...row.slots],
    }));
    const source = rows[from.rowIndex]?.slots[from.slotIndex];
    const target = rows[to.rowIndex]?.slots[to.slotIndex];

    if (!source) {
      return;
    }

    rows[to.rowIndex].slots[to.slotIndex] = source;
    rows[from.rowIndex].slots[from.slotIndex] = target ?? null;
    updateRows(rows);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, target: SlotAddress) {
    event.preventDefault();

    const widgetData = event.dataTransfer.getData(WIDGET_DRAG_TYPE);

    if (widgetData) {
      try {
        const source = JSON.parse(widgetData) as SlotAddress;
        moveWidget(source, target);
      } catch {}
      return;
    }

    const chartTemplateCode = event.dataTransfer.getData(CHART_DRAG_TYPE);

    if (chartTemplateCode) {
      placeChart(target.rowIndex, target.slotIndex, chartTemplateCode);
    }
  }

  function removeWidget(rowIndex: number, slotIndex: number) {
    const rows = caseData.rows.map((row) => ({
      slots: [...row.slots],
    }));
    rows[rowIndex].slots[slotIndex] = null;
    updateRows(rows);
  }

  function changeHeight(
    rowIndex: number,
    slotIndex: number,
    height: number,
  ) {
    const rows = caseData.rows.map((row) => ({
      slots: [...row.slots],
    }));
    const widget = rows[rowIndex].slots[slotIndex];

    if (!widget) {
      return;
    }

    if (widget.kind === "block") {
      rows[rowIndex].slots[slotIndex] = {
        ...widget,
        height: height as 1 | 2,
      };
    } else {
      rows[rowIndex].slots[slotIndex] = {
        ...widget,
        height: height as 1 | 2 | 3 | 4,
      };
    }

    updateRows(rows);
  }

  function changeSlotCount(rowIndex: number, requested: number) {
    const row = caseData.rows[rowIndex];
    const minCount = Math.max(1, lastOccupiedSlot(row.slots) + 1);
    const count = Math.min(4, Math.max(minCount, requested));
    const rows = caseData.rows.map((item, index) => {
      if (index !== rowIndex) {
        return item;
      }

      const slots = [...item.slots];

      while (slots.length < count) {
        slots.push(null);
      }

      return { slots: slots.slice(0, count) };
    });

    updateRows(rows);
  }

  function addRow() {
    updateRows([...caseData.rows, { slots: [null, null] }]);
  }

  function removeRow(rowIndex: number) {
    const row = caseData.rows[rowIndex];

    if (lastOccupiedSlot(row.slots) >= 0) {
      return;
    }

    updateRows(caseData.rows.filter((_, index) => index !== rowIndex));
  }

  function moveRow(rowIndex: number, direction: -1 | 1) {
    const target = rowIndex + direction;

    if (target < 0 || target >= caseData.rows.length) {
      return;
    }

    const rows = [...caseData.rows];
    [rows[rowIndex], rows[target]] = [rows[target], rows[rowIndex]];
    updateRows(rows);
  }

  return (
    <div className="flex flex-col gap-4">
      {caseData.rows.length === 0 ? (
        <div className="border border-dashed border-rule p-8 text-center text-sm text-muted-foreground">
          还没有内容行。点下方“添加一行”开始布局。
        </div>
      ) : null}

      {caseData.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="border border-rule bg-paper">
          {editing ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-sheet px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>行 {rowIndex + 1}</span>
                <select
                  aria-label={`第 ${rowIndex + 1} 行槽位数`}
                  value={row.slots.length}
                  onChange={(event) =>
                    changeSlotCount(rowIndex, Number(event.target.value))
                  }
                  className="h-7 border border-rule bg-sheet px-1.5 text-[11px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count} 个槽位
                    </option>
                  ))}
                </select>
                <span>
                  {row.slots.filter(Boolean).length} 个内容
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="上移一行"
                  disabled={rowIndex === 0}
                  className="flex size-7 items-center justify-center text-muted-foreground hover:bg-blueprint-soft hover:text-ink disabled:opacity-30"
                  onClick={() => moveRow(rowIndex, -1)}
                >
                  <ChevronUp aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="下移一行"
                  disabled={rowIndex === caseData.rows.length - 1}
                  className="flex size-7 items-center justify-center text-muted-foreground hover:bg-blueprint-soft hover:text-ink disabled:opacity-30"
                  onClick={() => moveRow(rowIndex, 1)}
                >
                  <ChevronDown aria-hidden="true" className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="删除空行"
                  disabled={lastOccupiedSlot(row.slots) >= 0}
                  className="flex size-7 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  onClick={() => removeRow(rowIndex)}
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <div
            className="chart-slot-grid p-2"
            style={
              {
                "--slot-count": row.slots.length,
              } as CSSProperties
            }
          >
            {row.slots.map((widget, slotIndex) => (
              <div
                key={slotIndex}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) =>
                  handleDrop(event, { rowIndex, slotIndex })
                }
                className={cn(
                  "min-h-0",
                  !widget && editing &&
                    "flex min-h-32 items-center justify-center border border-dashed border-rule bg-sheet/60 text-center text-[11px] text-muted-foreground",
                  !widget && !editing && "min-h-6",
                )}
              >
                {widget ? (
                  <div className="w-full self-start">
                    <WidgetFrame
                      widget={widget}
                      address={{ rowIndex, slotIndex }}
                      caseData={caseData}
                      calendarData={calendarData}
                      chartTemplates={chartTemplates}
                      editing={editing}
                      onRemove={() => removeWidget(rowIndex, slotIndex)}
                      onHeightChange={(height) =>
                        changeHeight(rowIndex, slotIndex, height)
                      }
                      onEditBlock={() => {
                        if (widget.kind === "block") {
                          onEditBlock(
                            rowIndex,
                            slotIndex,
                            widget.block,
                          );
                        }
                      }}
                    />
                  </div>
                ) : editing ? (
                  <span>
                    拖入图表或块
                    <br />
                    空槽会保留
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}

      {editing ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addRow}
        >
          <Plus aria-hidden="true" className="size-4" />
          添加一行
        </Button>
      ) : null}
    </div>
  );
}