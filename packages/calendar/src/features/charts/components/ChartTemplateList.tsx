import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import type { CalendarTemplate } from "@/features/calendar/data/types";
import type { ChartTemplate } from "@/features/charts/data/types";
import { CHART_TYPE_LABELS } from "@/features/charts/lib/widgetLayout";
import { cn } from "@/lib/utils";

type ChartTemplateListProps = {
  templates: ChartTemplate[];
  calendarTemplates: CalendarTemplate[];
  selectedCode: string | null;
  usageByCode: Map<string, number>;
  onSelect: (code: string) => void;
  onReorder: (activeCode: string, overCode: string) => void;
};

type SortableChartTemplateRowProps = {
  template: ChartTemplate;
  event: CalendarTemplate | undefined;
  selected: boolean;
  usage: number;
  onSelect: (code: string) => void;
};

function SortableChartTemplateRow({
  template,
  event,
  selected,
  usage,
  onSelect,
}: SortableChartTemplateRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.code });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-stretch border-b border-rule/60",
        selected && "bg-blueprint-soft",
        isDragging && "relative z-10 bg-sheet",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`拖动排序 ${template.title || "未命名图表"}`}
        className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-ink active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onSelect(template.code)}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-left"
      >
        <span
          className="size-2 shrink-0 border border-black/10"
          style={{ backgroundColor: event?.color ?? "#94a3b8" }}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              {template.title || "未命名图表"}
            </span>
            {!event ? (
              <span className="shrink-0 text-[10px] text-destructive">
                事项已失效
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {event?.title ?? "未知事项"} ·{" "}
            {CHART_TYPE_LABELS[template.chartType]}
          </span>
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {usage} 个案例
        </span>
      </button>
    </div>
  );
}

export function ChartTemplateList({
  templates,
  calendarTemplates,
  selectedCode,
  usageByCode,
  onSelect,
  onReorder,
}: ChartTemplateListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  if (templates.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-xs leading-5 text-muted-foreground">
        还没有图表模板
        <br />
        点下方“新建图表模板”
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={templates.map((template) => template.code)}
        strategy={verticalListSortingStrategy}
      >
        {templates.map((template) => (
          <SortableChartTemplateRow
            key={template.code}
            template={template}
            event={calendarTemplates.find(
              (item) => item.code === template.eventCode,
            )}
            selected={template.code === selectedCode}
            usage={usageByCode.get(template.code) ?? 0}
            onSelect={onSelect}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
