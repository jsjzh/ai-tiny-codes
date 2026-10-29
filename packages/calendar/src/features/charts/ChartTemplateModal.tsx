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
import { sortTemplates } from "@/features/calendar/data/types";
import { useChartsData } from "@/features/charts/data/ChartsDataProvider";
import {
  cloneChartsData,
  countChartTemplateUsage,
  generateChartTemplateCode,
  NUMERIC_CHART_TYPES,
  NUMERIC_METRICS,
  removeChartTemplateFromData,
  sortChartTemplates,
  TEXT_CHART_TYPES,
  validateChartTemplateDraft,
  type ChartTemplate,
  type ChartsData,
  type ChartType,
  type NumericMetricCode,
} from "@/features/charts/data/types";
import { cn } from "@/lib/utils";

import { ChartTemplateList } from "./components/ChartTemplateList";

type ChartTemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const inputClass =
  "h-9 w-full border border-rule bg-sheet px-2.5 text-sm text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted-foreground";

const METRIC_LABELS: Record<NumericMetricCode, string> = {
  daily: "每日",
  avg7: "7 日均",
  avg30: "30 日均",
  changeRate: "变化率",
};

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  line: "折线",
  bar: "柱状",
  area: "面积",
  table: "对照表",
  distribution: "分布",
};

function defaultMetrics(kind: "numeric" | "text"): NumericMetricCode[] {
  return kind === "numeric" ? ["daily"] : [];
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
    Boolean(draft) && !isSaving && validationErrors.size === 0;

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
      metrics: defaultMetrics(kind),
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
        metrics: defaultMetrics(kind),
      },
      true,
    );
  }

  function handleMetricToggle(metric: NumericMetricCode) {
    if (!selectedTemplate) {
      return;
    }

    if (metric === "changeRate") {
      handleUpdate({
        metrics: selectedTemplate.metrics.includes("changeRate")
          ? []
          : ["changeRate"],
      });
      return;
    }

    const current = selectedTemplate.metrics.filter(
      (item) => item !== "changeRate",
    );
    const next = current.includes(metric)
      ? current.filter((item) => item !== metric)
      : [...current, metric];
    handleUpdate({ metrics: next });
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

  const selectedEvent = selectedTemplate
    ? calendarTemplates.find(
        (template) => template.code === selectedTemplate.eventCode,
      )
    : null;
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
                            ? NUMERIC_CHART_TYPES
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
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        指标
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {NUMERIC_METRICS.map((metric) => {
                          const active =
                            selectedTemplate.metrics.includes(metric);

                          return (
                            <button
                              key={metric}
                              type="button"
                              onClick={() => handleMetricToggle(metric)}
                              className={cn(
                                "border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                active
                                  ? "border-blueprint bg-blueprint text-white"
                                  : "border-rule bg-sheet text-ink hover:bg-blueprint-soft",
                              )}
                            >
                              {METRIC_LABELS[metric]}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[11px] leading-4 text-muted-foreground">
                        同单位指标可以合并；变化率是百分比，只能单独使用。
                      </span>
                    </div>
                  ) : (
                    <div className="border border-rule bg-paper px-3 py-2 text-xs text-muted-foreground">
                      文本事项使用对照表或分布视图，不计算数值指标。
                    </div>
                  )}

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