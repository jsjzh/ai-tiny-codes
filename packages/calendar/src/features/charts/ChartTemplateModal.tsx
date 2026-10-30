import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarData } from "@/features/calendar/data/CalendarDataProvider";
import {
  getNumericFields,
  sortTemplates,
  type CalendarTemplate,
} from "@/features/calendar/data/types";
import { useChartsData } from "@/features/charts/data/ChartsDataProvider";
import {
  cloneChartsData,
  countChartTemplateUsage,
  generateChartTemplateCode,
  CHART_ANALYSES,
  CHART_ANALYSIS_LABELS,
  getAnalysisFieldCodes,
  getChartAnalysis,
  getChartSeries,
  NUMERIC_CHART_TYPES,
  NUMERIC_SERIES_OPERATIONS,
  NUMERIC_SERIES_OPERATION_LABELS,
  removeChartTemplateFromData,
  sortChartTemplates,
  TEXT_CHART_TYPES,
  validateChartTemplateDraft,
  type ChartAnalysis,
  type ChartSeriesSpec,
  type ChartTemplate,
  type ChartsData,
  type ChartType,
  type NumericSeriesOperation,
} from "@/features/charts/data/types";
import { cn } from "@/lib/utils";

import { ChartTemplateList } from "./components/ChartTemplateList";

type ChartTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const inputClass =
  "h-9 w-full border border-rule bg-sheet px-2.5 text-sm text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted-foreground";

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: "折线",
  bar: "柱状",
  area: "面积",
  table: "对照表",
  distribution: "分布",
};

function defaultSeries(
  event: CalendarTemplate | undefined,
): ChartSeriesSpec[] {
  if (!event || event.kind === "text") {
    return [];
  }

  const field = getNumericFields(event)[0];

  return field ? [{ fieldCode: field.code, operation: "raw" }] : [];
}

function defaultChartType(kind: "numeric" | "text"): ChartType {
  return kind === "numeric" ? "line" : "table";
}

export function ChartTemplateModal({
  open,
  onOpenChange,
}: ChartTemplateModalProps) {
  const { data: calendarData } = useCalendarData();
  const {
    data: chartsData,
    isLoading,
    commitData,
  } = useChartsData();
  const [draft, setDraft] = useState<ChartsData | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const calendarTemplates = useMemo(
    () => sortTemplates(calendarData.templates),
    [calendarData.templates],
  );
  const sortedTemplates = useMemo(
    () => (draft ? sortChartTemplates(draft.templates) : []),
    [draft],
  );
  const selectedTemplate =
    draft?.templates.find((template) => template.code === selectedCode) ??
    null;
  const selectedEvent = selectedTemplate
    ? calendarTemplates.find(
        (template) => template.code === selectedTemplate.eventCode,
      )
    : null;
  const selectedEventFields =
    selectedEvent?.kind === "number" ? getNumericFields(selectedEvent) : [];
  const selectedAnalysis = selectedTemplate
    ? getChartAnalysis(selectedTemplate)
    : "series";
  const analysisFields = selectedTemplate
    ? getAnalysisFieldCodes(selectedTemplate)
    : [];
  const analysisNeedsFields =
    selectedAnalysis !== "recordQuality" && selectedAnalysis !== "calendar";
  const analysisCanStack =
    analysisFields.length > 1 &&
    (selectedAnalysis === "cumulative" ||
      selectedAnalysis === "monthlyDelta" ||
      selectedAnalysis === "weeklyDelta");
  const analysisHint =
    selectedAnalysis === "cumulative"
      ? "累计变化以区间内首条记录为 0 点；同图只允许同单位字段。"
      : selectedAnalysis === "weekdayAverage"
        ? "按周一至周日分别平均；同图只允许同单位字段。"
        : selectedAnalysis === "distribution"
          ? "按区间内数值分桶统计记录条数。"
          : "月度/周净变化使用区间内最后值减首值；同图只允许同单位字段。";
  const seriesErrors = useMemo(() => {
    if (!selectedTemplate || selectedTemplate.kind !== "numeric") {
      return [];
    }

    const messages: string[] = [];
    const analysis = getChartAnalysis(selectedTemplate);
    const series = getChartSeries(selectedTemplate);
    const fields = selectedEvent ? getNumericFields(selectedEvent) : [];
    const fieldByCode = new Map(fields.map((field) => [field.code, field]));

    if (analysis === "series") {
      if (series.length === 0) {
        messages.push("至少需要一个图表系列");
      }

      for (const spec of series) {
        const field =
          fieldByCode.get(spec.fieldCode || "") ??
          fields.find((item) => item.kind === "input") ??
          fields[0];

        if (!field) {
          messages.push("绑定事项没有数值字段");
        }

        if (
          spec.operation === "rolling" &&
          (!spec.window || spec.window < 2)
        ) {
          messages.push("滚动平均窗口至少为 2");
        }
      }

      const units = new Set(
        series
          .map(
            (spec) =>
              fieldByCode.get(spec.fieldCode || "") ??
              fields.find((item) => item.kind === "input") ??
              fields[0],
          )
          .filter(Boolean)
          .map((field) => field!.unit),
      );
      const hasPercent = series.some(
        (spec) => spec.operation === "percentChange",
      );

      if (hasPercent && series.length > 1) {
        messages.push("百分比变化不能和其他系列混在同一张图");
      } else if (units.size > 1) {
        messages.push("同一张图只能使用同单位字段");
      }
    } else {
      const codes = getAnalysisFieldCodes(selectedTemplate);
      const selectedFields = codes
        .map((code) => fieldByCode.get(code))
        .filter((field): field is NonNullable<typeof field> => Boolean(field));

      if (
        analysis !== "recordQuality" &&
        analysis !== "calendar" &&
        selectedFields.length === 0
      ) {
        messages.push("至少选择一个分析字段");
      }

      if (analysis === "distribution" && selectedFields.length > 1) {
        messages.push("数值分布只能选择一个字段");
      }

      if (
        analysis !== "recordQuality" &&
        analysis !== "distribution" &&
        analysis !== "calendar"
      ) {
        const units = new Set(selectedFields.map((field) => field.unit));

        if (units.size > 1) {
          messages.push("同一张图只能使用同单位字段");
        }
      }
    }

    return Array.from(new Set(messages));
  }, [selectedEvent, selectedTemplate]);
  const validationErrors = useMemo(
    () =>
      draft
        ? validateChartTemplateDraft(draft)
        : new Map<string, string[]>(),
    [draft],
  );
  const usageByCode = useMemo(() => {
    const map = new Map<string, number>();

    if (draft) {
      for (const template of draft.templates) {
        map.set(template.code, countChartTemplateUsage(draft, template.code));
      }
    }

    return map;
  }, [draft]);
  const canComplete =
    Boolean(draft) &&
    !isSaving &&
    validationErrors.size === 0 &&
    seriesErrors.length === 0;

  useEffect(() => {
    if (!open || isLoading) {
      return;
    }

    const next = cloneChartsData(chartsData);
    setDraft(next);
    setSelectedCode(sortChartTemplates(next.templates)[0]?.code ?? null);
    setDirty(false);
    setConfirmDiscard(false);
    setIsSaving(false);
    setSaveError(null);
    setDeleteConfirm(false);
  }, [open, isLoading, chartsData]);

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

  function handleAdd() {
    if (!draft) {
      return;
    }

    const event = calendarTemplates[0] ?? null;
    const kind = event?.kind === "text" ? "text" : "numeric";
    const template: ChartTemplate = {
      code: generateChartTemplateCode(draft.templates),
      title: `图表模板 ${draft.templates.length + 1}`,
      eventCode: event?.code ?? "",
      kind,
      chartType: defaultChartType(kind),
      analysis: "series",
      analysisFields: [],
      series: defaultSeries(event),
      stacked: false,
      desc: "",
      sortOrder: draft.templates.length,
    };

    setDraft({
      ...draft,
      templates: [...draft.templates, template],
    });
    setSelectedCode(template.code);
    setDirty(true);
    setDeleteConfirm(false);
    setSaveError(null);
  }

  function handleUpdate(
    patch: Partial<ChartTemplate>,
    resetEventConfig = false,
  ) {
    if (!draft || !selectedCode) {
      return;
    }

    setDraft({
      ...draft,
      templates: draft.templates.map((template) =>
        template.code === selectedCode
          ? { ...template, ...patch }
          : template,
      ),
    });
    setDirty(true);
    setDeleteConfirm(resetEventConfig ? false : deleteConfirm);
    setSaveError(null);
  }

  function handleEventChange(eventCode: string) {
    const event = calendarTemplates.find(
      (template) => template.code === eventCode,
    );

    if (!event) {
      return;
    }

    const kind = event.kind === "text" ? "text" : "numeric";

    handleUpdate(
      {
        eventCode,
        kind,
        chartType: defaultChartType(kind),
        analysis: "series",
        analysisFields: [],
        series: defaultSeries(event),
        stacked: false,
      },
      true,
    );
  }

  function updateSeries(index: number, patch: Partial<ChartSeriesSpec>) {
    if (!selectedTemplate) {
      return;
    }

    const series = getChartSeries(selectedTemplate).map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );
    handleUpdate({ series });
  }

  function addSeries() {
    if (!selectedTemplate) {
      return;
    }

    const series = getChartSeries(selectedTemplate);
    const field =
      selectedEventFields.find(
        (item) =>
          item.kind === "input" &&
          !series.some((spec) => spec.fieldCode === item.code),
      ) ??
      selectedEventFields.find((item) => item.kind === "input") ??
      selectedEventFields[0];

    if (!field) {
      return;
    }

    handleUpdate({
      series: [...series, { fieldCode: field.code, operation: "raw" }],
    });
  }

  function removeSeries(index: number) {
    if (!selectedTemplate) {
      return;
    }

    const series = getChartSeries(selectedTemplate).filter(
      (_, itemIndex) => itemIndex !== index,
    );
    handleUpdate({ series });
  }

  function handleAnalysisChange(analysis: ChartAnalysis) {
    if (!selectedTemplate) {
      return;
    }

    const currentFields = getAnalysisFieldCodes(selectedTemplate);
    const fallbackField = selectedEventFields[0];
    const nextFields =
      analysis === "recordQuality" || analysis === "calendar"
        ? []
        : currentFields.length > 0
          ? currentFields
          : fallbackField
            ? [fallbackField.code]
            : [];

    handleUpdate({
      analysis,
      analysisFields: nextFields,
      chartType:
        analysis === "series" || analysis === "cumulative"
          ? selectedTemplate.chartType
          : "bar",
    });
  }

  function toggleAnalysisField(code: string) {
    if (!selectedTemplate) {
      return;
    }

    const current = getAnalysisFieldCodes(selectedTemplate);
    const next =
      selectedAnalysis === "distribution"
        ? [code]
        : current.includes(code)
          ? current.filter((item) => item !== code)
          : [...current, code];

    handleUpdate({ analysisFields: next });
  }

  function handleReorder(activeCode: string, overCode: string) {
    if (!draft) {
      return;
    }

    const sorted = sortChartTemplates(draft.templates);
    const oldIndex = sorted.findIndex(
      (template) => template.code === activeCode,
    );
    const newIndex = sorted.findIndex(
      (template) => template.code === overCode,
    );

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }

    const templates = arrayMove(sorted, oldIndex, newIndex).map(
      (template, index) => ({ ...template, sortOrder: index }),
    );

    setDraft({ ...draft, templates });
    setDirty(true);
    setSaveError(null);
  }

  function handleDelete() {
    if (!draft || !selectedCode) {
      return;
    }

    const next = removeChartTemplateFromData(draft, selectedCode);
    setDraft(next);
    setSelectedCode(sortChartTemplates(next.templates)[0]?.code ?? null);
    setDirty(true);
    setDeleteConfirm(false);
    setSaveError(null);
  }

  async function handleComplete() {
    if (!draft || !canComplete) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await commitData(draft);
      setDirty(false);
      closeModal();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) {
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
            <DialogTitle>图表模板</DialogTitle>
            <DialogDescription>
              {isLoading ? "正在加载图表模板…" : "图表模板数据还没有准备好"}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedErrors = selectedTemplate
    ? validationErrors.get(selectedTemplate.code) ?? []
    : [];
  const usage = selectedTemplate
    ? usageByCode.get(selectedTemplate.code) ?? 0
    : 0;

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
        className="max-w-4xl p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="shrink-0 border-b border-rule px-6 py-4 pr-14">
            <DialogHeader className="mb-0 pr-0">
              <DialogTitle className="text-xl">图表模板</DialogTitle>
              <DialogDescription>
                图表模板独立于事项模板，只通过事项 code 读取日历数据。
              </DialogDescription>
            </DialogHeader>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[280px_1fr] md:overflow-hidden">
            <aside className="border-b border-rule md:flex md:min-h-0 md:flex-col md:border-b-0 md:border-r">
              <div className="max-h-64 overflow-y-auto md:max-h-none md:min-h-0 md:flex-1">
                <ChartTemplateList
                  templates={sortedTemplates}
                  calendarTemplates={calendarTemplates}
                  selectedCode={selectedCode}
                  usageByCode={usageByCode}
                  onSelect={(code) => {
                    setSelectedCode(code);
                    setDeleteConfirm(false);
                  }}
                  onReorder={handleReorder}
                />
              </div>
              <div className="shrink-0 border-t border-rule p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full justify-start px-2 text-sm"
                  onClick={handleAdd}
                  disabled={calendarTemplates.length === 0}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  新建图表模板
                </Button>
              </div>
            </aside>

            <section className="p-6 md:min-h-0 md:overflow-y-auto">
              {selectedTemplate ? (
                <div className="flex flex-col gap-5">
                  {selectedErrors.length > 0 ? (
                    <div className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {selectedErrors.join("；")}
                    </div>
                  ) : null}

                  {!selectedEvent ? (
                    <div className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      这个图表模板引用的事项已被删除。请重新选择事项或删除模板。
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        标题
                      </span>
                      <input
                        value={selectedTemplate.title}
                        onChange={(event) =>
                          handleUpdate({ title: event.target.value })
                        }
                        className={inputClass}
                        placeholder="例如：体重趋势"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        标识 code
                      </span>
                      <input
                        value={selectedTemplate.code}
                        readOnly
                        className={cn(
                          inputClass,
                          "bg-paper font-mono text-xs text-muted-foreground",
                        )}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        绑定事项
                      </span>
                      <Select
                        value={selectedTemplate.eventCode}
                        onValueChange={handleEventChange}
                      >
                        <SelectTrigger
                          aria-label="选择绑定事项"
                          className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                        >
                          <SelectValue placeholder="选择事项" />
                        </SelectTrigger>
                        <SelectContent>
                          {calendarTemplates.map((template) => (
                            <SelectItem
                              key={template.code}
                              value={template.code}
                            >
                              {template.title}
                              {template.kind === "number" && template.unit
                                ? ` · ${template.unit}`
                                : template.kind === "text"
                                  ? " · 文本"
                                  : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        图表类型
                      </span>
                      <Select
                        value={selectedTemplate.chartType}
                        onValueChange={(value) =>
                          handleUpdate({
                            chartType: value as ChartType,
                          })
                        }
                      >
                        <SelectTrigger
                          aria-label="选择图表类型"
                          className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectedTemplate.kind === "numeric"
                            ? selectedAnalysis === "series" ||
                              selectedAnalysis === "cumulative"
                              ? NUMERIC_CHART_TYPES
                              : (["bar"] as ChartType[])
                            : TEXT_CHART_TYPES
                          ).map((type) => (
                            <SelectItem key={type} value={type}>
                              {CHART_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  </div>

                  {selectedTemplate.kind === "numeric" ? (
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        分析
                      </span>
                      <Select
                        value={selectedAnalysis}
                        onValueChange={(value) =>
                          handleAnalysisChange(value as ChartAnalysis)
                        }
                      >
                        <SelectTrigger
                          aria-label="选择图表分析"
                          className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHART_ANALYSES.map((analysis) => (
                            <SelectItem key={analysis} value={analysis}>
                              {CHART_ANALYSIS_LABELS[analysis]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  ) : null}

                  {selectedTemplate.kind === "numeric" &&
                  selectedAnalysis !== "series" ? (
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        字段
                      </span>
                      {!analysisNeedsFields ? (
                        <div className="border border-rule bg-paper px-3 py-2 text-xs text-muted-foreground">
                          {selectedAnalysis === "recordQuality"
                            ? "按事项记录日期统计每月记录天数，不需要选择字段。"
                            : "按事项记录日期显示每日是否有记录，不需要选择字段。"}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedEventFields.map((field) => {
                            const active = analysisFields.includes(
                              field.code,
                            );

                            return (
                              <button
                                key={field.code}
                                type="button"
                                onClick={() =>
                                  toggleAnalysisField(field.code)
                                }
                                className={cn(
                                  "border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                  active
                                    ? "border-blueprint bg-blueprint text-white"
                                    : "border-rule bg-sheet text-ink hover:bg-blueprint-soft",
                                )}
                              >
                                {field.label}
                                {field.unit ? ` · ${field.unit}` : ""}
                                {field.kind === "formula" ? " · 公式" : ""}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {analysisCanStack &&
                      (selectedTemplate.chartType === "bar" ||
                        selectedTemplate.chartType === "area") ? (
                        <label className="flex items-center gap-2 text-xs text-ink">
                          <input
                            type="checkbox"
                            checked={selectedTemplate.stacked === true}
                            onChange={(event) =>
                              handleUpdate({ stacked: event.target.checked })
                            }
                            className="size-3.5 accent-[var(--color-blueprint)]"
                          />
                          堆叠系列
                        </label>
                      ) : null}

                      {seriesErrors.length > 0 ? (
                        <div className="text-[11px] leading-4 text-destructive">
                          {seriesErrors.map((error) => (
                            <p key={error}>{error}</p>
                          ))}
                        </div>
                      ) : analysisNeedsFields ? (
                        <span className="text-[11px] leading-4 text-muted-foreground">
                          {analysisHint}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedTemplate.kind === "numeric" &&
                  selectedAnalysis === "series" ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          系列
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSeries}
                          disabled={selectedEventFields.length === 0}
                        >
                          <Plus aria-hidden="true" className="size-3.5" />
                          添加系列
                        </Button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {getChartSeries(selectedTemplate).map(
                          (spec, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px_auto] items-center gap-2 border border-rule bg-paper p-2"
                            >
                              <Select
                                value={
                                  spec.fieldCode ||
                                  selectedEventFields[0]?.code ||
                                  ""
                                }
                                onValueChange={(value) =>
                                  updateSeries(index, { fieldCode: value })
                                }
                              >
                                <SelectTrigger
                                  aria-label="选择图表字段"
                                  className="h-8 w-full border border-rule bg-sheet px-2 text-xs"
                                >
                                  <SelectValue placeholder="字段" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedEventFields.map((field) => (
                                    <SelectItem
                                      key={field.code}
                                      value={field.code}
                                    >
                                      {field.label}
                                      {field.unit ? ` · ${field.unit}` : ""}
                                      {field.kind === "formula"
                                        ? " · 公式"
                                        : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={spec.operation}
                                onValueChange={(value) =>
                                  updateSeries(index, {
                                    operation: value as NumericSeriesOperation,
                                    window:
                                      value === "rolling"
                                        ? (spec.window ?? 7)
                                        : undefined,
                                  })
                                }
                              >
                                <SelectTrigger
                                  aria-label="选择统计方式"
                                  className="h-8 w-full border border-rule bg-sheet px-2 text-xs"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {NUMERIC_SERIES_OPERATIONS.map(
                                    (operation) => (
                                      <SelectItem
                                        key={operation}
                                        value={operation}
                                      >
                                        {
                                          NUMERIC_SERIES_OPERATION_LABELS[
                                            operation
                                          ]
                                        }
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>

                              {spec.operation === "rolling" ? (
                                <input
                                  type="number"
                                  min={2}
                                  value={spec.window ?? 7}
                                  aria-label="滚动窗口"
                                  onChange={(event) =>
                                    updateSeries(index, {
                                      window: Math.max(
                                        2,
                                        Number(event.target.value) || 7,
                                      ),
                                    })
                                  }
                                  className="h-8 w-full border border-rule bg-sheet px-2 text-xs"
                                />
                              ) : (
                                <span className="text-center text-[10px] text-muted-foreground">
                                  —
                                </span>
                              )}

                              <button
                                type="button"
                                aria-label="移除系列"
                                disabled={
                                  getChartSeries(selectedTemplate).length <= 1
                                }
                                onClick={() => removeSeries(index)}
                                className="flex size-8 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                              >
                                <Trash2 aria-hidden="true" className="size-3.5" />
                              </button>
                            </div>
                          ),
                        )}
                      </div>

                      {analysisCanStack &&
                      (selectedTemplate.chartType === "bar" ||
                        selectedTemplate.chartType === "area") ? (
                        <label className="flex items-center gap-2 text-xs text-ink">
                          <input
                            type="checkbox"
                            checked={selectedTemplate.stacked === true}
                            onChange={(event) =>
                              handleUpdate({ stacked: event.target.checked })
                            }
                            className="size-3.5 accent-[var(--color-blueprint)]"
                          />
                          堆叠系列
                        </label>
                      ) : null}

                      {seriesErrors.length > 0 ? (
                        <div className="text-[11px] leading-4 text-destructive">
                          {seriesErrors.map((error) => (
                            <p key={error}>{error}</p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] leading-4 text-muted-foreground">
                          同一张图只能使用同单位字段；百分比变化单独使用。
                        </span>
                      )}
                    </div>
                  ) : null}

                  {selectedTemplate.kind === "text" ? (
                    <div className="border border-rule bg-paper px-3 py-2 text-xs text-muted-foreground">
                      文本事项使用对照表或分布视图，不计算数值指标。
                    </div>
                  ) : null}

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      描述
                    </span>
                    <textarea
                      value={selectedTemplate.desc}
                      onChange={(event) =>
                        handleUpdate({ desc: event.target.value })
                      }
                      className={cn(
                        inputClass,
                        "min-h-24 resize-y py-2 leading-6",
                      )}
                      placeholder="展示在图表卡片里的补充说明"
                    />
                  </label>

                  <div className="border-t border-rule pt-4">
                    {deleteConfirm ? (
                      <div className="motion-fade-in border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-sm text-destructive">
                          {usage > 0
                            ? `该图表模板被 ${usage} 个案例使用，删除后会从这些案例中移除。`
                            : "确定删除这个图表模板？"}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteConfirm(false)}
                          >
                            取消
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                          >
                            确认删除
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setDeleteConfirm(true)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        删除图表模板
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-48 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {calendarTemplates.length === 0
                    ? "还没有事项模板。先到「模板」里创建事项，再回来建图表模板。"
                    : "还没有图表模板。点左下角新建。"}
                </div>
              )}
            </section>
          </div>

          <footer className="shrink-0 border-t border-rule px-6 py-3">
            {confirmDiscard ? (
              <div className="motion-fade-in flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-ink">
                  有未提交修改，确定放弃？
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    继续编辑
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={closeModal}
                  >
                    放弃
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs">
                  {saveError ? (
                    <span className="block truncate text-destructive">
                      {saveError}
                    </span>
                  ) : validationErrors.size > 0 ? (
                    <span className="block truncate text-destructive">
                      有图表模板信息未完善
                    </span>
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
                    disabled={!canComplete}
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