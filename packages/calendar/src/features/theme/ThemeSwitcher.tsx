import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { THEME_DEFINITIONS } from "./theme";
import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        !containerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      data-ignore-selection
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="切换主题"
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-8 px-2.5 max-[359px]:h-7 max-[359px]:w-7 max-[359px]:px-0 sm:h-9 sm:px-3"
        onClick={() => setOpen((value) => !value)}
      >
        <Palette aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">主题</span>
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="选择主题"
          className="motion-popover-in absolute right-0 top-full z-50 mt-2 max-h-[min(70dvh,360px)] w-64 overflow-y-auto border border-rule bg-sheet p-1"
          style={{
            borderRadius: "var(--radius-control)",
            boxShadow: "var(--shadow-panel)",
          }}
        >
          <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            主题
          </p>

          {THEME_DEFINITIONS.map((item) => {
            const active = item.id === theme;

            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 px-2 py-2 text-left transition-colors hover:bg-blueprint-soft",
                  active && "bg-blueprint-soft",
                )}
                style={{ borderRadius: "var(--radius-control)" }}
              >
                <span className="mt-0.5 flex shrink-0 border border-rule">
                  {item.swatches.map((color) => (
                    <span
                      key={color}
                      className="size-3"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                    {item.label}
                    <span className="font-mono text-[9px] font-normal text-muted-foreground">
                      {item.english}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                {active ? (
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-blueprint"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
