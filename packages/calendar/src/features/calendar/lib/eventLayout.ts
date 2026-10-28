export type DayCellLayout = {
  columns: 1 | 2;
  rows: number;
  maxVisible: number;
  lineHeight: number;
  dateRowHeight: number;
  padding: number;
};

export function getDayCellLayout(
  cellWidth: number,
  cellHeight: number,
  isDesktop: boolean,
): DayCellLayout {
  const columns: 1 | 2 = cellWidth >= 170 ? 2 : 1;
  const lineHeight = isDesktop ? 20 : 16;
  const dateRowHeight = isDesktop ? 24 : 20;
  const padding = isDesktop ? 16 : 8;
  const available = Math.max(0, cellHeight - dateRowHeight - padding);
  const rows = Math.max(1, Math.min(5, Math.floor(available / lineHeight)));

  return {
    columns,
    rows,
    maxVisible: columns * rows,
    lineHeight,
    dateRowHeight,
    padding,
  };
}
