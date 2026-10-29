import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  generateNumericFieldCode,
  type NumericField,
} from "@/features/calendar/data/types";
import { cn } from "@/lib/utils";

type NumericFieldsEditorProps = {
  fields: NumericField[];
  errors: string[];
  unit: string;
  color: string;
  onChange: (fields: NumericField[]) => void;
};

const inputClass =
  "h-8 w-full border border-rule bg-sheet px-2 text-xs text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

export function NumericFieldsEditor({
  fields,
  errors,
  unit,
  color,
  onChange,
}: NumericFieldsEditorProps) {
  const inputCount = fields.filter((field) => field.kind === "input").length;

  function updateField(code: string, patch: Partial<NumericField>) {
    onChange(
      fields.map((field) =>
        field.code === code ? { ...field, ...patch } : field,
      ),
    );
  }

  function removeField(field: NumericField) {
    if (field.kind === "input" && inputCount <= 1) {
      return;
    }

    onChange(fields.filter((item) => item.code !== field.code));
  }

  function addField() {
    onChange([
      ...fields,
      {
        code: generateNumericFieldCode(fields),
        label: `字段 ${fields.length + 1}`,
        unit,
        color,
        kind: "input",
        showInCalendar: true,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          数值字段
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={addField}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          添加字段
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {fields.map((field, index) => {
          const formulaField = field.kind === "formula";
          const onlyInput = !formulaField && inputCount <= 1;

          return (
            <div key={field.code} className="border border-rule bg-paper p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_72px_auto] gap-2">
                <input
                  value={field.label}
                  onChange={(event) =>
                    updateField(field.code, { label: event.target.value })
                  }
                  className={inputClass}
                  placeholder={`字段 ${index + 1}`}
                />
                <input
                  value={field.unit}
                  onChange={(event) =>
                    updateField(field.code, { unit: event.target.value })
                  }
                  className={inputClass}
                  placeholder="单位"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={field.color}
                    aria-label={`${field.label || "字段"}颜色`}
                    onChange={(event) =>
                      updateField(field.code, { color: event.target.value })
                    }
                    className="size-8 cursor-pointer border border-rule bg-sheet p-0.5"
                  />
                  <button
                    type="button"
                    aria-label={`删除字段 ${field.label || field.code}`}
                    disabled={onlyInput}
                    onClick={() => removeField(field)}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
                <code className="font-mono text-[10px]">{field.code}</code>
                <select
                  value={field.kind}
                  onChange={(event) =>
                    updateField(field.code, {
                      kind: event.target.value as NumericField["kind"],
                      formula:
                        event.target.value === "formula"
                          ? field.formula ?? ""
                          : undefined,
                    })
                  }
                  className="h-6 border border-rule bg-sheet px-1 text-[10px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  <option value="input">
                    手动输入
                  </option>
                  <option value="formula" disabled={onlyInput}>
                    公式字段
                  </option>
                </select>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={field.showInCalendar}
                    onChange={(event) =>
                      updateField(field.code, {
                        showInCalendar: event.target.checked,
                      })
                    }
                    className="size-3 accent-[var(--color-blueprint)]"
                  />
                  日历显示
                </label>
              </div>

              {formulaField ? (
                <input
                  value={field.formula ?? ""}
                  onChange={(event) =>
                    updateField(field.code, { formula: event.target.value })
                  }
                  className={cn(inputClass, "mt-2 font-mono")}
                  placeholder="例如：carbs * 4 + protein * 4 + fat * 9"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {errors.length > 0 ? (
        <div className="text-[11px] leading-4 text-destructive">
          {errors.slice(0, 4).map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
