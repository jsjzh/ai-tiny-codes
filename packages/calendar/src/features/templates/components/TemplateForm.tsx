import { useState } from "react";
import { Download, FileUp, Trash2 } from "lucide-react";

import {
  getNumericFields,
  type CalendarEventValue,
  type CalendarTemplate,
} from "@/features/calendar/data/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { downloadTemplateEvents } from "../lib/exportEvents";
import type { EventImportRow } from "../lib/importEvents";
import { ImportEventsDialog } from "./ImportEventsDialog";
import { NumericFieldsEditor } from "./NumericFieldsEditor";
import { TemplateColorPicker } from "./TemplateColorPicker";

type TemplateFormProps = {
  template: CalendarTemplate;
  usage: number;
  errors: string[];
  existingValues: Record<string, CalendarEventValue>;
  onUpdate: (patch: Partial<CalendarTemplate>) => void;
  onImport: (rows: EventImportRow[]) => void;
  onDelete: () => void;
};

const inputClass =
  "h-9 w-full border border-rule bg-sheet px-2.5 text-sm text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted-foreground";

export function TemplateForm({
  template,
  usage,
  errors,
  existingValues,
  onUpdate,
  onImport,
  onDelete,
}: TemplateFormProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const typeLocked = usage > 0;
  const titleError = errors.find((message) => message.includes("标题")) ?? null;
  const codeError = errors.find((message) => message.includes("code")) ?? null;
  const fieldErrors = errors.filter(
    (message) =>
      message.includes("字段") ||
      message.includes("公式") ||
      message.includes("输入"),
  );
  const fields = template.kind === "number" ? getNumericFields(template) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">标题</span>
          <input
            value={template.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
            className={cn(
              inputClass,
              titleError && "border-destructive focus-visible:outline-destructive",
            )}
            aria-invalid={Boolean(titleError)}
            placeholder="例如：体重"
          />
          <span className="min-h-4 text-[11px] leading-4">
            {titleError ? (
              <span className="text-destructive">{titleError}</span>
            ) : (
              <span className="text-muted-foreground">必填</span>
            )}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">标识 code</span>
          <input
            value={template.code}
            readOnly
            className={cn(
              inputClass,
              "bg-paper font-mono text-xs text-muted-foreground",
              codeError && "border-destructive",
            )}
            aria-invalid={Boolean(codeError)}
          />
          <span className="min-h-4 text-[11px] leading-4">
            {codeError ? (
              <span className="text-destructive">{codeError}</span>
            ) : (
              <span className="text-muted-foreground">自动生成，创建后不可修改</span>
            )}
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">类型</span>
          <div className="grid grid-cols-2 divide-x divide-rule border border-rule">
            {(["number", "text"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={typeLocked}
                onClick={() =>
                  onUpdate({
                    kind,
                    unit: kind === "text" ? "" : template.unit,
                  })
                }
                className={cn(
                  "h-9 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  template.kind === kind
                    ? "bg-blueprint text-white"
                    : "bg-sheet text-ink hover:bg-blueprint-soft",
                )}
              >
                {kind === "number" ? "数值" : "文本"}
              </button>
            ))}
          </div>
          <span className="text-[11px] leading-4 text-muted-foreground">
            {typeLocked
              ? `已有 ${usage} 条记录，不能修改类型`
              : "数值用于图表，文本用对照表展示"}
          </span>
        </div>

        {template.kind === "number" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">单位</span>
            <input
              value={template.unit}
              onChange={(event) => onUpdate({ unit: event.target.value })}
              className={inputClass}
              placeholder="例如：kg / kcal"
            />
          </label>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">单位</span>
            <div className="flex h-9 items-center border border-rule bg-paper px-2.5 text-sm text-muted-foreground">
              文本类型不需要单位
            </div>
          </div>
        )}
      </div>

      {template.kind === "number" ? (
        <NumericFieldsEditor
          fields={fields}
          errors={fieldErrors}
          unit={template.unit}
          color={template.color}
          onChange={(nextFields) => onUpdate({ fields: nextFields })}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">颜色</span>
        <TemplateColorPicker
          value={template.color}
          onChange={(color) => onUpdate({ color })}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">描述</span>
        <textarea
          value={template.desc}
          onChange={(event) => onUpdate({ desc: event.target.value })}
          className={cn(inputClass, "min-h-24 resize-y py-2 leading-6")}
          placeholder="补充说明，会展示在模板列表和图表里"
        />
      </label>

      <div className="border border-rule bg-paper p-3">
        <div className="text-[11px] font-medium text-muted-foreground">日历预览</div>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 border border-black/10"
            style={{ backgroundColor: template.color }}
          />
          <span className="truncate text-sm font-medium">
            {template.title || "事项名称"}
          </span>
          <span className="truncate font-mono text-xs text-ink/80">
            {template.kind === "number"
              ? (() => {
                  const visibleFields = fields.filter(
                    (field) => field.showInCalendar,
                  );
                  const previewFields =
                    visibleFields.length > 0 ? visibleFields : fields;

                  if (previewFields.length <= 1) {
                    return `${previewFields[0]?.label ?? "数值"} 75.2${
                      previewFields[0]?.unit
                        ? ` ${previewFields[0].unit}`
                        : ""
                    }`;
                  }

                  return previewFields
                    .map(
                      (field) =>
                        `${field.label} --${
                          field.unit ? ` ${field.unit}` : ""
                        }`,
                    )
                    .join(" · ");
                })()
              : "平静"}
          </span>
        </div>
      </div>

      <div className="border border-rule bg-paper p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground">
              事项数据
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              已有 {usage} 条记录；支持 JSON / CSV，按日期覆盖当前模板。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={usage === 0}
              onClick={() => downloadTemplateEvents(template, existingValues)}
            >
              <Download aria-hidden="true" className="size-3.5" />
              导出数据
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <FileUp aria-hidden="true" className="size-3.5" />
              导入数据
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-rule pt-4">
        {deleteConfirm ? (
          <div className="motion-fade-in border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {usage > 0
                ? `该模板已被 ${usage} 条记录使用，删除会一并删除这些记录。`
                : "确定删除这个模板？"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirm(false)}
              >
                取消
              </Button>
              <Button type="button" variant="destructive" onClick={onDelete}>
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
            删除模板
          </Button>
        )}
      </div>

      <ImportEventsDialog
        open={importOpen}
        template={template}
        existingValues={existingValues}
        onOpenChange={setImportOpen}
        onImport={onImport}
      />
    </div>
  );
}
