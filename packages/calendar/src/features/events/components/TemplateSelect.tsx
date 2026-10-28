import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarTemplate } from "@/features/calendar/data/types";

type TemplateSelectProps = {
  templates: CalendarTemplate[];
  value: string | null;
  onChange: (code: string) => void;
  placeholder?: string;
};

export function TemplateSelect({
  templates,
  value,
  onChange,
  placeholder = "选择事项",
}: TemplateSelectProps) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger
        aria-label="选择事项模板"
        className="h-9 w-full border border-rule bg-sheet px-2.5 text-sm"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.code} value={template.code}>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 border border-black/10"
                style={{ backgroundColor: template.color }}
              />
              <span className="truncate">{template.title}</span>
              {template.kind === "number" && template.unit ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {template.unit}
                </span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
