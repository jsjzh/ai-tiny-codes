import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  getNumericFields,
  type CalendarData,
  type CalendarTemplate,
} from "@/features/calendar/data/types";

import {
  blockRangeDescription,
  resolveBlockResult,
} from "./lib/blockRules";
import {
  generateBlockId,
  type BlockRange,
  type BlockRule,
  type BlockRuleType,
  type CalendarBlock,
} from "./data/types";

type BlockEditorDialogProps = {
  open: boolean;
  initialBlock: CalendarBlock | null;
  caseRange: { startDate: string; endDate: string };
  calendarData: CalendarData;
  onOpenChange: (open: boolean) => void;
  onSave: (block: CalendarBlock) => void;
};

const inputClass =
  "h-9 w-full border border-rule bg-sheet px-2.5 text-sm text-ink outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted-foreground";

const RULE_LABELS: Record<BlockRuleType, string> = {
  fixed: "固定值",
  latest: "最新值",
  first: "最早值",
  sum: "合计",
  average: "平均值",
  max: "最大值",
  min: "最小值",
  count: "记录数",
  streak: "连续记录",
  delta: "区间变化",
  loss: "累计减重（旧）",
  change: "区间变化（旧）",
  bmi: "BMI（旧）",
  distanceToTarget: "距离目标（旧）",
};

const GENERIC_NUMERIC_RULES: BlockRuleType[] = [
  "latest",
  "first",
  "sum",
  "average",
  "max",
  "min",
  "count",
  "streak",
  "delta",
];

const LEGACY_RULES: BlockRuleType[] = [
  "loss",
  "change",
  "bmi",
  "distanceToTarget",
];

function findEvent(
  templates: CalendarTemplate[],
  code: string | null,
): CalendarTemplate | null {
  return code
    ? (templates.find((template) => template.code === code) ?? null)
    : null;
}

export function BlockEditorDialog({
  open,
  initialBlock,
  caseRange,
  calendarData,
  onOpenChange,
  onSave,
}: BlockEditorDialogProps) {
  const templates = calendarData.templates;
  const initialEventCode =
    initialBlock?.eventCode ?? templates[0]?.code ?? "";
  const [title, setTitle] = useState(initialBlock?.title ?? "新块");
  const [info, setInfo] = useState(initialBlock?.info ?? "");
  const [ruleType, setRuleType] = useState<BlockRuleType>(
    initialBlock?.rule.type ?? "latest",
  );
  const [eventCode, setEventCode] = useState(initialEventCode);
  const initialEvent = templates.find(
    (template) => template.code === initialEventCode,
  );
  const initialFields = initialEvent
    ? getNumericFields(initialEvent)
    : [];
  const [fieldCode, setFieldCode] = useState(
    initialBlock?.rule.fieldCode ?? initialFields[0]?.code ?? "",
  );
  const [deltaDirection, setDeltaDirection] = useState<
    "last-first" | "first-last"
  >(initialBlock?.rule.direction ?? "last-first");
  const [rangeType, setRangeType] = useState<
    BlockRange["type"]
  >(initialBlock?.rule.range?.type ?? "case");
  const [days, setDays] = useState(
    initialBlock?.rule.range?.type === "lastDays"
      ? String(initialBlock.rule.range.days)
      : "30",
  );  const [fixedValue, setFixedValue] = useState(
    initialBlock?.rule.type === "fixed"
      ? initialBlock.rule.value ?? ""
      : "",
  );
  const [fixedUnit, setFixedUnit] = useState(
    initialBlock?.rule.type === "fixed"
      ? initialBlock.rule.unit ?? ""
      : "",
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(initialBlock?.title ?? "新块");
    setInfo(initialBlock?.info ?? "");
    setRuleType(initialBlock?.rule.type ?? "latest");
    const nextEventCode =
      initialBlock?.eventCode ?? templates[0]?.code ?? "";
    const nextEvent = templates.find(
      (template) => template.code === nextEventCode,
    );
    setEventCode(nextEventCode);
    setFieldCode(
      initialBlock?.rule.fieldCode ??
        (nextEvent ? getNumericFields(nextEvent)[0]?.code ?? "" : ""),
    );
    setDeltaDirection(initialBlock?.rule.direction ?? "last-first");
    setRangeType(initialBlock?.rule.range?.type ?? "case");
    setDays(
      initialBlock?.rule.range?.type === "lastDays"
        ? String(initialBlock.rule.range.days)
        : "30",
    );
    setFixedValue(
      initialBlock?.rule.type === "fixed"
        ? initialBlock.rule.value ?? ""
        : "",
    );
    setFixedUnit(
      initialBlock?.rule.type === "fixed"
        ? initialBlock.rule.unit ?? ""
        : "",
    );
    setFormError(null);
  }, [open, initialBlock, templates]);

  const selectedEvent = findEvent(templates, eventCode);
  const selectedFields =
    selectedEvent?.kind === "number"
      ? getNumericFields(selectedEvent)
      : [];
  const availableRules: BlockRuleType[] = useMemo(() => {
    if (!selectedEvent) {
      return ["fixed"];
    }

    if (selectedEvent.kind === "text") {
      return ["fixed", "latest", "count"];
    }

    const legacy =
      initialBlock && LEGACY_RULES.includes(initialBlock.rule.type)
        ? [initialBlock.rule.type]
        : [];

    return ["fixed", ...GENERIC_NUMERIC_RULES, ...legacy];
  }, [selectedEvent, initialBlock]);

  useEffect(() => {
    if (!availableRules.includes(ruleType)) {
      setRuleType(availableRules[0] ?? "fixed");
    }
  }, [availableRules, ruleType]);

  useEffect(() => {
    if (selectedFields.length === 0) {
      setFieldCode("");
      return;
    }

    if (!selectedFields.some((field) => field.code === fieldCode)) {
      setFieldCode(
        selectedFields.find((field) => field.kind === "input")?.code ??
          selectedFields[0].code,
      );
    }
  }, [selectedFields, fieldCode]);

  function buildRule(): BlockRule | null {
    if (ruleType === "fixed") {
      return {
        type: "fixed",
        value: fixedValue,
        unit: fixedUnit,
      };
    }

    if (!eventCode) {
      return null;
    }

    const range: BlockRange =
      rangeType === "lastDays"
        ? {
            type: "lastDays",
            days: Math.max(1, Number(days) || 30),
          }
        : { type: rangeType };

    return {
      type: ruleType,
      range,
      fieldCode: selectedEvent?.kind === "number" ? fieldCode : undefined,
      direction: ruleType === "delta" ? deltaDirection : undefined,
    };
  }

  function buildBlock(): CalendarBlock | null {
    const rule = buildRule();

    if (!rule) {
      return null;
    }

    return {
      id: initialBlock?.id ?? generateBlockId(),
      title: title.trim() || "未命名块",
      info: info.trim(),
      eventCode: ruleType === "fixed" ? null : eventCode || null,
      rule,
    };
  }

  const previewBlock = buildBlock();
  const previewResult = previewBlock
    ? resolveBlockResult(previewBlock, calendarData, caseRange)
    : null;
  const rangeDescription = previewBlock
    ? blockRangeDescription(previewBlock, caseRange, calendarData)
    : "未配置";

  function handleSave() {
    if (!title.trim()) {
      setFormError("标题不能为空");
      return;
    }

    if (ruleType === "fixed" && !fixedValue.trim()) {
      setFormError("固定值不能为空");
      return;
    }

    if (ruleType !== "fixed" && !eventCode) {
      setFormError("请选择绑定事项");
      return;
    }

    if (
      ruleType !== "fixed" &&
      selectedEvent?.kind === "number" &&
      !fieldCode
    ) {
      setFormError("请选择数值字段");
      return;
    }

    const block = buildBlock();

    if (!block) {
      setFormError("块配置不完整");
      return;
    }

    onSave(block);
    onOpenChange(false);
  }

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
        className="max-w-2xl p-0"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="shrink-0 border-b border-rule px-6 py-4 pr-14">
            <DialogHeader className="mb-0 pr-0">
              <DialogTitle className="text-xl">
                {initialBlock ? "编辑块" : "新建块"}
              </DialogTitle>
              <DialogDescription>
                块只保存标题、说明和取值规则，数值实时从日历事件计算。
              </DialogDescription>
            </DialogHeader>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  标题
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClass}
                  placeholder="例如：最新体重"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  说明
                </span>
                <input
                  value={info}
                  onChange={(event) => setInfo(event.target.value)}
                  className={inputClass}
                  placeholder="留空则自动生成"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  规则
                </span>
                <Select
                  value={ruleType}
                  onValueChange={(value) =>
                    setRuleType(value as BlockRuleType)
                  }
                >
                  <SelectTrigger
                    aria-label="选择块规则"
                    className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRules.map((rule) => (
                      <SelectItem key={rule} value={rule}>
                        {RULE_LABELS[rule]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  绑定事项
                </span>
                <Select
                  value={eventCode}
                  onValueChange={setEventCode}
                  disabled={ruleType === "fixed"}
                >
                  <SelectTrigger
                    aria-label="选择块绑定事项"
                    className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm disabled:bg-paper disabled:text-muted-foreground"
                  >
                    <SelectValue placeholder="选择事项" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
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
            </div>

            {ruleType !== "fixed" && selectedEvent?.kind === "number" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    数值字段
                  </span>
                  <Select
                    value={fieldCode}
                    onValueChange={setFieldCode}
                  >
                    <SelectTrigger
                      aria-label="选择块数值字段"
                      className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                    >
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedFields.map((field) => (
                        <SelectItem key={field.code} value={field.code}>
                          {field.label}
                          {field.unit ? ` · ${field.unit}` : ""}
                          {field.kind === "formula" ? " · 公式" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                {ruleType === "delta" ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      方向
                    </span>
                    <Select
                      value={deltaDirection}
                      onValueChange={(value) =>
                        setDeltaDirection(
                          value as "last-first" | "first-last",
                        )
                      }
                    >
                      <SelectTrigger
                        aria-label="选择区间变化方向"
                        className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-first">末值 - 首值</SelectItem>
                        <SelectItem value="first-last">首值 - 末值</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                ) : null}
              </div>
            ) : null}

            {ruleType === "fixed" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    固定值
                  </span>
                  <input
                    value={fixedValue}
                    onChange={(event) => setFixedValue(event.target.value)}
                    className={inputClass}
                    placeholder="例如：100"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    单位
                  </span>
                  <input
                    value={fixedUnit}
                    onChange={(event) => setFixedUnit(event.target.value)}
                    className={inputClass}
                    placeholder="可选，例如：kcal"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    数据范围
                  </span>
                  <Select
                    value={rangeType}
                    onValueChange={(value) =>
                      setRangeType(value as BlockRange["type"])
                    }
                  >
                    <SelectTrigger
                      aria-label="选择块数据范围"
                      className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="case">跟随案例</SelectItem>
                      <SelectItem value="lastDays">最近 N 天</SelectItem>
                      <SelectItem value="all">全部历史</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                {rangeType === "lastDays" ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      最近天数
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={days}
                      onChange={(event) => setDays(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                ) : null}
              </div>
            )}

            <div className="mt-4 border border-rule bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  预览
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {rangeDescription}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {previewResult?.value ?? "--"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {previewResult?.unit ?? ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {previewResult?.info ||
                  (ruleType === "fixed"
                    ? fixedValue.trim()
                      ? "固定值"
                      : "输入固定值"
                    : "暂无数据")}
              </p>
            </div>

            {formError ? (
              <p className="mt-3 text-xs text-destructive">{formError}</p>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-rule px-6 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="button" onClick={handleSave}>
              保存块
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}