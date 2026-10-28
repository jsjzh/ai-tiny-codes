import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarData } from "@/features/calendar/data/CalendarDataProvider";
import {
  cloneCalendarData,
  countTemplateUsage,
  generateTemplateCode,
  nextTemplateSortOrder,
  normalizeCalendarData,
  removeTemplateFromData,
  sortTemplates,
  validateTemplateDraft,
  type CalendarData,
  type CalendarTemplate,
} from "@/features/calendar/data/types";

import { TemplateForm } from "./components/TemplateForm";
import { TemplateList } from "./components/TemplateList";
import { nextNewTemplateTitle, randomPresetColor } from "./lib/defaults";

type TemplateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TemplateModal({ open, onOpenChange }: TemplateModalProps) {
  const { data, isLoading, commitData } = useCalendarData();
  const [draft, setDraft] = useState<CalendarData | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || isLoading) {
      return;
    }

    const next = cloneCalendarData(data);
    setDraft(next);
    setSelectedCode(sortTemplates(next.templates)[0]?.code ?? null);
    setDirty(false);
    setConfirmDiscard(false);
    setIsSaving(false);
    setSaveError(null);
  }, [open, isLoading, data]);

  const sortedTemplates = useMemo(
    () => (draft ? sortTemplates(draft.templates) : []),
    [draft],
  );

  const selectedTemplate =
    draft?.templates.find((template) => template.code === selectedCode) ?? null;

  const validationErrors = useMemo(
    () => (draft ? validateTemplateDraft(draft) : new Map<string, string[]>()),
    [draft],
  );

  const usageByCode = useMemo(() => {
    const map = new Map<string, number>();

    if (draft) {
      for (const template of draft.templates) {
        map.set(template.code, countTemplateUsage(draft, template.code));
      }
    }

    return map;
  }, [draft]);

  const canComplete = Boolean(draft) && !isSaving && validationErrors.size === 0;

  function handleAdd() {
    if (!draft) {
      return;
    }

    const template: CalendarTemplate = {
      code: generateTemplateCode(draft.templates),
      title: nextNewTemplateTitle(draft.templates),
      kind: "number",
      unit: "",
      color: randomPresetColor(),
      desc: "",
      sortOrder: nextTemplateSortOrder(draft.templates),
    };

    setDraft({
      ...draft,
      templates: [...draft.templates, template],
    });
    setSelectedCode(template.code);
    setDirty(true);
    setConfirmDiscard(false);
    setSaveError(null);
  }

  function handleUpdate(patch: Partial<CalendarTemplate>) {
    if (!draft || !selectedCode) {
      return;
    }

    setDraft({
      ...draft,
      templates: draft.templates.map((template) =>
        template.code === selectedCode ? { ...template, ...patch } : template,
      ),
    });
    setDirty(true);
    setSaveError(null);
  }

  function handleDelete() {
    if (!draft || !selectedCode) {
      return;
    }

    const next = removeTemplateFromData(draft, selectedCode);
    setDraft(next);
    setSelectedCode(sortTemplates(next.templates)[0]?.code ?? null);
    setDirty(true);
    setConfirmDiscard(false);
    setSaveError(null);
  }

  function handleReorder(activeCode: string, overCode: string) {
    if (!draft) {
      return;
    }

    const sorted = sortTemplates(draft.templates);
    const oldIndex = sorted.findIndex((template) => template.code === activeCode);
    const newIndex = sorted.findIndex((template) => template.code === overCode);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }

    const templates = arrayMove(sorted, oldIndex, newIndex).map((template, index) => ({
      ...template,
      sortOrder: index,
    }));

    setDraft({ ...draft, templates });
    setDirty(true);
    setSaveError(null);
  }

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

  function handleDiscard() {
    closeModal();
  }

  async function handleComplete() {
    if (!draft || !canComplete) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const next = normalizeCalendarData(draft);
      await commitData(next);
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
            <DialogTitle>事项模板</DialogTitle>
            <DialogDescription>
              {isLoading ? "正在加载模板…" : "模板数据还没有准备好"}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

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
              <DialogTitle className="text-xl">事项模板</DialogTitle>
              <DialogDescription>
                模板决定日历上显示什么，以及图表如何统计。
              </DialogDescription>
            </DialogHeader>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[280px_1fr] md:overflow-hidden">
            <aside className="border-b border-rule md:flex md:min-h-0 md:flex-col md:border-b-0 md:border-r">
              <div className="max-h-64 overflow-y-auto md:max-h-none md:min-h-0 md:flex-1">
                <TemplateList
                  templates={sortedTemplates}
                  selectedCode={selectedCode}
                  errors={validationErrors}
                  usageByCode={usageByCode}
                  onSelect={setSelectedCode}
                  onReorder={handleReorder}
                />
              </div>
              <div className="shrink-0 border-t border-rule p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full justify-start px-2 text-sm"
                  onClick={handleAdd}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  新建模板
                </Button>
              </div>
            </aside>

            <section className="p-6 md:min-h-0 md:overflow-y-auto">
              {selectedTemplate ? (
                <TemplateForm
                  key={selectedTemplate.code}
                  template={selectedTemplate}
                  usage={usageByCode.get(selectedTemplate.code) ?? 0}
                  errors={validationErrors.get(selectedTemplate.code) ?? []}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                    还没有模板。点“新建模板”开始，比如「体重 ·
                    kg」，之后在日历里就能快速记录。
                  </p>
                </div>
              )}
            </section>
          </div>

          <footer className="shrink-0 border-t border-rule px-6 py-3">
            {confirmDiscard ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-ink">有未提交修改，确定放弃？</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDiscard(false)}
                  >
                    继续编辑
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleDiscard}>
                    放弃
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs">
                  {saveError ? (
                    <span className="block truncate text-destructive">{saveError}</span>
                  ) : validationErrors.size > 0 ? (
                    <span className="block truncate text-destructive">
                      有模板信息未完善
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
