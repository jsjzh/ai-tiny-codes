import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

import { isMultiSelectModifier } from "../lib/platform";
import { datesBetween } from "../lib/selection";

type SelectionModifiers = {
  shiftKey: boolean;
  multiKey: boolean;
};

export function useCalendarSelection() {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());
  const selectedRef = useRef<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);
  const dragStartRef = useRef<string | null>(null);

  const commit = useCallback((next: Set<string>) => {
    selectedRef.current = next;
    setSelectedDates(next);
  }, []);

  const clearSelection = useCallback(() => {
    anchorRef.current = null;
    dragStartRef.current = null;
    commit(new Set());
  }, [commit]);

  const endDrag = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    function handlePointerEnd() {
      endDrag();
    }

    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("blur", handlePointerEnd);

    return () => {
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("blur", handlePointerEnd);
    };
  }, [endDrag]);

  const applySelection = useCallback(
    (date: string, modifiers: SelectionModifiers) => {
      if (modifiers.shiftKey) {
        const anchor = anchorRef.current ?? date;
        const range = new Set(datesBetween(anchor, date));
        const next = modifiers.multiKey
          ? new Set([...selectedRef.current, ...range])
          : range;

        commit(next);
        if (!anchorRef.current) {
          anchorRef.current = date;
        }
        return;
      }

      if (modifiers.multiKey) {
        const next = new Set(selectedRef.current);

        if (next.has(date)) {
          next.delete(date);
          if (anchorRef.current === date) {
            anchorRef.current = null;
          }
        } else {
          next.add(date);
          anchorRef.current = date;
        }

        commit(next);
        return;
      }

      anchorRef.current = date;
      commit(new Set([date]));
    },
    [commit],
  );

  const handlePointerDown = useCallback(
    (date: string, event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      endDrag();

      const modifiers = {
        shiftKey: event.shiftKey,
        multiKey: isMultiSelectModifier(event),
      };

      applySelection(date, modifiers);

      if (!modifiers.shiftKey && !modifiers.multiKey) {
        dragStartRef.current = date;
      }
    },
    [applySelection, endDrag],
  );

  const handlePointerEnter = useCallback(
    (date: string, event: PointerEvent<HTMLElement>) => {
      const dragStart = dragStartRef.current;

      if (!dragStart) {
        return;
      }

      if ((event.buttons & 1) === 0) {
        endDrag();
        return;
      }

      commit(new Set(datesBetween(dragStart, date)));
    },
    [commit, endDrag],
  );

  const handleClick = useCallback(
    (date: string, event: MouseEvent<HTMLElement>) => {
      if (event.detail !== 0) {
        return;
      }

      applySelection(date, {
        shiftKey: event.shiftKey,
        multiKey: isMultiSelectModifier(event),
      });
    },
    [applySelection],
  );

  const handleContextMenuSelect = useCallback(
    (date: string) => {
      if (selectedRef.current.has(date)) {
        return;
      }

      anchorRef.current = date;
      endDrag();
      commit(new Set([date]));
    },
    [commit, endDrag],
  );

  return {
    selectedDates,
    clearSelection,
    handlePointerDown,
    handlePointerEnter,
    handleClick,
    handleContextMenuSelect,
  };
}
