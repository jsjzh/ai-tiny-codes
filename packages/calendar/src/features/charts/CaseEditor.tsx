import { useMemo, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  sortTemplates,
  type CalendarData,
} from "@/features/calendar/data/types";
import { cn } from "@/lib/utils";

import {
  getChartSeries,
  type CalendarBlock,
  type ChartCase,
  type ChartCaseRow,
  type ChartTemplate,
} from "./data/types";
import { BlockEditorDialog } from "./BlockEditorDialog";
import { resolveCaseRange } from "./lib/caseRange";
import { CaseCanvas } from "./components/CaseCanvas";
import {
  CHART_DRAG_TYPE,
  CHART_TYPE_LABELS,
} from "./lib/widgetLayout";

type BlockTarget = {
  rowIndex: number;
  slotIndex: number;
};

type CaseEditorProps = {
  caseData: ChartCase;
  calendarData: CalendarData;
  chartTemplates: ChartTemplate[];
  isNew: boolean;
  isSaving: boolean;
  error: string | null;
  onChange: (next: ChartCase) => void;
  onSave: () => void;
  onCancel: () => void;
  onSaveAs: () => void;
  onDelete?: () => void;
};

const inputClass =
  "h-9 w-full border border-rule bg-sheet px-2.5 text-sm text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

function findFirstEmptySlot(
  rows: ChartCaseRow[],
): { rowIndex: number; slotIndex: number } | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const slotIndex = rows[rowIndex].slots.findIndex(
      (slot) => slot === null,
    );

    if (slotIndex >= 0) {
      return { rowIndex, slotIndex };
    }
  }

  return null;
}

function caseHasEventWidgets(
  caseData: ChartCase,
  eventCode: string,
  chartTemplates: ChartTemplate[],
): boolean {
  return caseData.rows.some((row) =>
    row.slots.some((slot) => {
      if (!slot) {
        return false;
      }

      if (slot.kind === "block") {
        return slot.block.eventCode === eventCode;
      }

      const template = chartTemplates.find(
        (item) => item.code === slot.chartTemplateCode,
      );
      return template?.eventCode === eventCode;
    }),
  );
}

export function CaseEditor({
  caseData,
  calendarData,
  chartTemplates,
  isNew,
  isSaving,
  error,
  onChange,
  onSave,
  onCancel,
  onSaveAs,
  onDelete,
}: CaseEditorProps) {
  const calendarTemplates = useMemo(
    () => sortTemplates(calendarData.templates),
    [calendarData.templates],
  );
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CalendarBlock | null>(
    null,
  );
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(
    null,
  );

  const selectedChartTemplates = chartTemplates.filter((template) =>
    caseData.eventCodes.includes(template.eventCode),
  );
  const effectiveRange = resolveCaseRange(caseData, calendarData);
  const canSave =
    Boolean(caseData.name.trim()) &&
    (caseData.rangeMode === "all" ||
      (Boolean(caseData.startDate) &&
        Boolean(caseData.endDate) &&
        caseData.startDate <= caseData.endDate));

  function updateCase(patch: Partial<ChartCase>) {
    onChange({ ...caseData, ...patch });
    setEditorMessage(null);
  }

  function toggleEvent(code: string) {
    if (caseData.eventCodes.includes(code)) {
      if (caseHasEventWidgets(caseData, code, chartTemplates)) {
        setEditorMessage("该事项还有块或图表在使用，先移除相关内容再取消选择。");
        return;
      }

      updateCase({
        eventCodes: caseData.eventCodes.filter((item) => item !== code),
      });
      return;
    }

    updateCase({ eventCodes: [...caseData.eventCodes, code] });
  }

  function placeWidget(
    rows: ChartCaseRow[],
    target: BlockTarget,
    widget: ChartCaseRow["slots"][number],
  ): ChartCaseRow[] {
    return rows.map((row, rowIndex) => {
      if (rowIndex !== target.rowIndex) {
        return row;
      }

      return {
        slots: row.slots.map((slot, slotIndex) =>
          slotIndex === target.slotIndex ? widget : slot,
        ),
      };
    });
  }

  function openNewBlock() {
    setEditingBlock(null);
    setBlockTarget(null);
    setBlockDialogOpen(true);
  }

  function openEditBlock(
    rowIndex: number,
    slotIndex: number,
    block: CalendarBlock,
  ) {
    setEditingBlock(block);
    setBlockTarget({ rowIndex, slotIndex });
    setBlockDialogOpen(true);
  }

  function handleBlockSave(block: CalendarBlock) {
    let rows = caseData.rows;
    let target = blockTarget;

    if (!target) {
      const empty = findFirstEmptySlot(rows);

      if (empty) {
        target = empty;
      } else {
        rows = [...rows, { slots: [null] }];
        target = { rowIndex: rows.length - 1, slotIndex: 0 };
      }
    }

    if (!target) {
      return;
    }

    const nextRows = editingBlock
      ? rows.map((row, rowIndex) => {
          if (rowIndex !== target.rowIndex) {
            return row;
          }

          return {
            slots: row.slots.map((slot, slotIndex) =>
              slotIndex === target.slotIndex && slot?.kind === "block"
                ? { ...slot, block }
                : slot,
            ),
          };
        })
      : placeWidget(rows, target, {
          kind: "block",
          block,
          height: 1,
        });

    const eventCodes =
      block.eventCode && !caseData.eventCodes.includes(block.eventCode)
        ? [...caseData.eventCodes, block.eventCode]
        : caseData.eventCodes;

    onChange({ ...caseData, eventCodes, rows: nextRows });
    setBlockDialogOpen(false);
    setEditingBlock(null);
    setBlockTarget(null);
  }

  function handleAddChart(code: string) {
    const template = chartTemplates.find((item) => item.code === code);

    if (!template) {
      return;
    }

    const empty = findFirstEmptySlot(caseData.rows);
    let rows = caseData.rows;
    let target = empty;

    if (!target) {
      rows = [...rows, { slots: [null] }];
      target = { rowIndex: rows.length - 1, slotIndex: 0 };
    }

    const nextRows = placeWidget(rows, target, {
      kind: "chart",
      chartTemplateCode: code,
      height: 2,
    });
    const eventCodes = caseData.eventCodes.includes(template.eventCode)
      ? caseData.eventCodes
      : [...caseData.eventCodes, template.eventCode];

    onChange({ ...caseData, eventCodes, rows: nextRows });
    setEditorMessage(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div>
          <h2 className="text-lg font-medium text-ink">
            {isNew ? "新建案例" : "编辑案例"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            案例范围是展示范围；块和图表可以按需要回看或读取全部历史。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveAs}
            disabled={!canSave || isSaving}
          >
            另存为
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? "保存中…" : "保存案例"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <div className="border border-rule bg-sheet p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                案例名称
              </span>
              <input
                value={caseData.name}
                onChange={(event) => updateCase({ name: event.target.value })}
                className={inputClass}
                placeholder="例如：减脂 8.1–27.1.1"
              />
            </label>

            <div className="mt-3 flex border border-rule bg-paper p-0.5">
              {([
                ["custom", "自定义区间"],
                ["all", "全部历史"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={caseData.rangeMode === mode}
                  onClick={() => updateCase({ rangeMode: mode })}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs transition-colors",
                    caseData.rangeMode === mode
                      ? "bg-blueprint text-white"
                      : "text-muted-foreground hover:bg-blueprint-soft hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {caseData.rangeMode === "all" ? (
              <div className="mt-3 border border-rule bg-paper px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">
                  自动跟随所选事项的数据范围
                </p>
                <p className="mt-1 font-mono text-xs text-ink">
                  {effectiveRange.hasData
                    ? `${effectiveRange.startDate} ~ ${effectiveRange.endDate}`
                    : "暂无数据"}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      开始
                    </span>
                    <input
                      type="date"
                      value={caseData.startDate}
                      onChange={(event) =>
                        updateCase({ startDate: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      结束
                    </span>
                    <input
                      type="date"
                      value={caseData.endDate}
                      onChange={(event) =>
                        updateCase({ endDate: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                {caseData.startDate > caseData.endDate ? (
                  <p className="mt-2 text-xs text-destructive">
                    开始日期不能晚于结束日期
                  </p>
                ) : null}
              </>
            )}

            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">
                事项筛选
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {calendarTemplates.map((template) => {
                  const selected = caseData.eventCodes.includes(
                    template.code,
                  );

                  return (
                    <button
                      key={template.code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleEvent(template.code)}
                      className={cn(
                        "flex items-center gap-1.5 border px-2 py-1 text-xs transition-colors",
                        selected
                          ? "border-blueprint bg-blueprint-soft text-blueprint"
                          : "border-rule bg-sheet text-ink hover:bg-blueprint-soft/60",
                      )}
                    >
                      <span
                        className="size-1.5 border border-black/10"
                        style={{ backgroundColor: template.color }}
                      />
                      {template.title}
                    </button>
                  );
                })}
              </div>
              {calendarTemplates.length === 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  还没有事项模板，先到日历顶部创建。
                </p>
              ) : null}
            </div>

            {editorMessage ? (
              <p className="mt-3 text-xs text-destructive">{editorMessage}</p>
            ) : null}
          </div>

          <div className="border border-rule bg-sheet">
            <div className="flex items-center justify-between border-b border-rule px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                组件
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={openNewBlock}
              >
                <Plus aria-hidden="true" className="size-3.5" />
                新建块
              </Button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {selectedChartTemplates.length === 0 ? (
                <p className="px-3 py-5 text-center text-[11px] leading-5 text-muted-foreground">
                  {chartTemplates.length === 0
                    ? "还没有图表模板。点上方「图表模板」创建。"
                    : caseData.eventCodes.length === 0
                      ? "选择事项后，这里会出现可拖拽的图表模板。"
                      : "当前事项还没有图表模板。点上方「图表模板」创建。"}
                </p>
              ) : (
                selectedChartTemplates.map((template) => {
                  const event = calendarTemplates.find(
                    (item) => item.code === template.eventCode,
                  );

                  return (
                    <div
                      key={template.code}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy";
                        event.dataTransfer.setData(
                          CHART_DRAG_TYPE,
                          template.code,
                        );
                      }}
                      className="flex items-center gap-2 border-b border-rule/60 px-2 py-2 hover:bg-blueprint-soft/30"
                    >
                      <GripVertical
                        aria-hidden="true"
                        className="size-3.5 shrink-0 cursor-grab text-muted-foreground"
                      />
                      <span
                        className="size-2 shrink-0 border border-black/10"
                        style={{
                          backgroundColor: event?.color ?? "#94a3b8",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {template.title}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {event?.title ?? "未知事项"} ·{" "}
                          {CHART_TYPE_LABELS[template.chartType]}
                          {getChartSeries(template).length > 0
                            ? ` · ${getChartSeries(template).length} 个系列`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`添加 ${template.title}`}
                        className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:bg-blueprint-soft hover:text-ink"
                        onClick={() => handleAddChart(template.code)}
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <p className="border-t border-rule px-3 py-2 text-[10px] leading-4 text-muted-foreground">
              图表模板拖到画布空槽，或点 + 自动放到第一个空槽。块新建后也会自动放入第一个空槽，再拖动调整。
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <CaseCanvas
            caseData={caseData}
            calendarData={calendarData}
            chartTemplates={chartTemplates}
            caseRange={{
              startDate: effectiveRange.startDate,
              endDate: effectiveRange.endDate,
            }}
            editing
            onChange={(next) => {
              onChange(next);
              setEditorMessage(null);
            }}
            onEditBlock={openEditBlock}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <div className="min-w-0 text-xs">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span className="text-muted-foreground">
              保存后会统一刷新案例视图。
            </span>
          )}
        </div>
        {!isNew && onDelete ? (
          deleteConfirm ? (
            <div className="motion-fade-in flex items-center gap-2">
              <span className="text-xs text-destructive">确认删除这个案例？</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                删除
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              删除案例
            </Button>
          )
        ) : null}
      </div>

      <BlockEditorDialog
        open={blockDialogOpen}
        initialBlock={editingBlock}
        caseRange={{
          startDate: effectiveRange.startDate,
          endDate: effectiveRange.endDate,
        }}
        calendarData={calendarData}
        onOpenChange={(open) => {
          setBlockDialogOpen(open);

          if (!open) {
            setEditingBlock(null);
            setBlockTarget(null);
          }
        }}
        onSave={handleBlockSave}
      />
    </div>
  );
}