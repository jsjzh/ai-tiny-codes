import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarData } from "@/features/calendar/data/CalendarDataProvider";

import { CaseEditor } from "./CaseEditor";
import { ChartTemplateModal } from "./ChartTemplateModal";
import { CaseCanvas } from "./components/CaseCanvas";
import { useChartsData } from "./data/ChartsDataProvider";
import {
  generateCaseId,
  sortChartTemplates,
  type ChartCase,
} from "./data/types";

function countCaseWidgets(chartCase: ChartCase): {
  charts: number;
  blocks: number;
} {
  let charts = 0;
  let blocks = 0;

  for (const row of chartCase.rows) {
    for (const slot of row.slots) {
      if (slot?.kind === "chart") {
        charts += 1;
      }

      if (slot?.kind === "block") {
        blocks += 1;
      }
    }
  }

  return { charts, blocks };
}

function createCase(
  existingCases: ChartCase[],
): ChartCase {
  const now = dayjs();
  const timestamp = new Date().toISOString();

  return {
    id: generateCaseId(existingCases),
    name: `新案例 ${existingCases.length + 1}`,
    startDate: now.startOf("month").format("YYYY-MM-DD"),
    endDate: now.format("YYYY-MM-DD"),
    eventCodes: [],
    rows: [{ slots: [null, null] }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function ChartsSection() {
  const { data: calendarData } = useCalendarData();
  const {
    data: chartsData,
    isLoading,
    commitData,
    error: loadError,
  } = useChartsData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChartCase | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [chartTemplateModalOpen, setChartTemplateModalOpen] =
    useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);

  const chartTemplates = useMemo(
    () => sortChartTemplates(chartsData.templates),
    [chartsData.templates],
  );
  const activeCase =
    chartsData.cases.find((chartCase) => chartCase.id === activeId) ??
    null;

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setSectionVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSectionVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.06 },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setActiveId((current) =>
      current &&
      chartsData.cases.some((chartCase) => chartCase.id === current)
        ? current
        : (chartsData.cases[0]?.id ?? null),
    );
  }, [chartsData.cases, isEditing]);

  useEffect(() => {
    if (!isEditing || !draft) {
      return;
    }

    const templateCodes = new Set(
      chartsData.templates.map((template) => template.code),
    );
    const rows = draft.rows.map((row) => ({
      slots: row.slots.map((slot) =>
        slot?.kind === "chart" && !templateCodes.has(slot.chartTemplateCode)
          ? null
          : slot,
      ),
    }));
    const changed = rows.some((row, rowIndex) =>
      row.slots.some(
        (slot, slotIndex) => slot !== draft.rows[rowIndex].slots[slotIndex],
      ),
    );

    if (changed) {
      setDraft({ ...draft, rows });
    }
  }, [chartsData.templates, draft, isEditing]);

  function startEdit(chartCase: ChartCase) {
    setDraft(structuredClone(chartCase));
    setIsEditing(true);
    setIsNew(false);
    setSaveError(null);
  }

  function startNewCase() {
    setDraft(createCase(chartsData.cases));
    setActiveId(null);
    setIsEditing(true);
    setIsNew(true);
    setSaveError(null);
  }

  function closeEditor() {
    setDraft(null);
    setIsEditing(false);
    setIsNew(false);
    setSaveError(null);
  }

  async function saveCase(chartCase: ChartCase, closeAfter = true) {
    const updated: ChartCase = {
      ...chartCase,
      updatedAt: new Date().toISOString(),
    };
    const exists = chartsData.cases.some(
      (item) => item.id === updated.id,
    );
    const nextCases = exists
      ? chartsData.cases.map((item) =>
          item.id === updated.id ? updated : item,
        )
      : [...chartsData.cases, updated];

    setIsSaving(true);
    setSaveError(null);

    try {
      await commitData({ ...chartsData, cases: nextCases });
      setActiveId(updated.id);

      if (closeAfter) {
        closeEditor();
      } else {
        setDraft(updated);
        setIsNew(false);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    await saveCase(draft, true);
  }

  async function handleSaveAs() {
    if (!draft) {
      return;
    }

    const timestamp = new Date().toISOString();
    const copy: ChartCase = {
      ...draft,
      id: generateCaseId(chartsData.cases),
      name: `${draft.name} 副本`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      await commitData({
        ...chartsData,
        cases: [...chartsData.cases, copy],
      });
      setActiveId(copy.id);
      closeEditor();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft) {
      return;
    }

    const nextCases = chartsData.cases.filter(
      (item) => item.id !== draft.id,
    );

    setIsSaving(true);
    setSaveError(null);

    try {
      await commitData({ ...chartsData, cases: nextCases });
      setActiveId(nextCases[0]?.id ?? null);
      closeEditor();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  const activeWidgets = activeCase
    ? countCaseWidgets(activeCase)
    : { charts: 0, blocks: 0 };
  const activeEvents = activeCase
    ? activeCase.eventCodes
        .map((code) =>
          calendarData.templates.find(
            (template) => template.code === code,
          ),
        )
        .filter(Boolean)
    : [];

  return (
    <section
      ref={sectionRef}
      id="charts"
      aria-label="图表"
      className={`border-t border-rule bg-paper px-4 py-8 sm:px-6 lg:px-8 ${
        sectionVisible ? "motion-section-in" : ""
      }`}
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium text-ink">图表</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              案例保存查询条件、块和图表布局；图表数据独立存储，只读取日历事项和事件。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#calendar"
              className="mr-1 text-xs font-medium text-blueprint hover:underline"
            >
              回到月历
            </a>

            {chartsData.cases.length > 0 ? (
              <Select
                value={activeId ?? ""}
                onValueChange={setActiveId}
                disabled={isEditing}
              >
                <SelectTrigger
                  aria-label="选择案例"
                  className="h-9 w-[220px] border border-rule bg-sheet px-2.5 text-sm"
                >
                  <SelectValue placeholder="选择案例" />
                </SelectTrigger>
                <SelectContent>
                  {chartsData.cases.map((chartCase) => (
                    <SelectItem key={chartCase.id} value={chartCase.id}>
                      {chartCase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={startNewCase}
              disabled={isEditing || isSaving}
            >
              新建案例
            </Button>

            {activeCase && !isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => startEdit(activeCase)}
              >
                编辑案例
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => setChartTemplateModalOpen(true)}
              disabled={isSaving}
            >
              图表模板
            </Button>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}

        {isLoading ? (
          <div className="mt-8 border border-dashed border-rule bg-sheet p-8 text-center text-sm text-muted-foreground">
            正在加载图表数据…
          </div>
        ) : isEditing && draft ? (
          <div className="mt-6">
            <CaseEditor
              caseData={draft}
              calendarData={calendarData}
              chartTemplates={chartTemplates}
              isNew={isNew}
              isSaving={isSaving}
              error={saveError}
              onChange={setDraft}
              onSave={() => void handleSave()}
              onCancel={closeEditor}
              onSaveAs={() => void handleSaveAs()}
              onDelete={isNew ? undefined : () => void handleDelete()}
            />
          </div>
        ) : activeCase ? (
          <div
            key={activeCase.id}
            className="motion-case-in mt-6 flex flex-col gap-5"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
              <div>
                <h2 className="text-xl font-medium text-ink">
                  {activeCase.name}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {activeCase.startDate} ~ {activeCase.endDate}
                  </span>
                  <span>·</span>
                  <span>
                    {activeEvents.length > 0
                      ? activeEvents
                          .map((template) => template?.title)
                          .join(" / ")
                      : "未选择事项"}
                  </span>
                  <span>·</span>
                  <span>
                    {activeWidgets.charts} 个图表，{activeWidgets.blocks} 个块
                  </span>
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground">
                展示范围以案例区间为准；块可单独设置回看范围。
              </span>
            </div>

            <CaseCanvas
              caseData={activeCase}
              calendarData={calendarData}
              chartTemplates={chartTemplates}
              editing={false}
              onChange={() => undefined}
              onEditBlock={() => undefined}
            />
          </div>
        ) : (
          <div className="mt-8 border border-dashed border-rule bg-sheet px-6 py-14 text-center">
            <p className="text-sm font-medium text-ink">
              还没有图表案例
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              先建一个案例，再选择事项、添加块和图表模板。
            </p>
            <Button type="button" className="mt-4" onClick={startNewCase}>
              新建案例
            </Button>
          </div>
        )}
      </div>

      <ChartTemplateModal
        open={chartTemplateModalOpen}
        onOpenChange={setChartTemplateModalOpen}
      />
    </section>
  );
}