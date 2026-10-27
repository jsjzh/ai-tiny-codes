import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import { cn } from "@/lib/utils";

import { PRESET_COLORS } from "../lib/colors";

type TemplateColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function TemplateColorPicker({ value, onChange }: TemplateColorPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`选择颜色 ${color}`}
            title={color}
            onClick={() => onChange(color)}
            className={cn(
              "size-6 border border-black/10 transition-transform hover:scale-110",
              value.toLowerCase() === color.toLowerCase() &&
                "ring-2 ring-blueprint ring-offset-1",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="size-4 border border-black/10"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-xs text-muted-foreground">{value}</span>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-blueprint hover:underline"
          onClick={() => setCustomOpen((open) => !open)}
        >
          {customOpen ? "收起取色器" : "自定义颜色"}
        </button>
      </div>

      {customOpen ? (
        <div className="border border-rule bg-paper p-3">
          <HexColorPicker color={value} onChange={onChange} style={{ width: "100%" }} />
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hex</span>
            <HexColorInput
              color={value}
              onChange={onChange}
              prefixed
              className="h-8 w-28 border border-rule bg-sheet px-2 font-mono text-xs outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
