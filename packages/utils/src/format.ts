export function roundTo(n: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("zh-CN");
}

/** ratio 为小数，如 0.02 → "2%" */
export function formatPercent(ratio: number): string {
  return `${roundTo(ratio * 100, 2)}%`;
}
