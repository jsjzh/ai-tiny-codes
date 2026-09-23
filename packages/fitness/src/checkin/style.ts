import chalk from "chalk";

const EPS = 0.05;

/** 期望/计划值：青色 */
export function planValue(kg: number, startWeightKg: number): string {
  const pct = startWeightKg > 0 ? (kg / startWeightKg) * 100 : 0;
  return chalk.cyan(`${kg.toFixed(2)} / ${pct.toFixed(2)}%`);
}

/** 实际降幅（正=减重）：绿↓ / 红↑ / 灰→ */
export function dropValue(kg: number, startWeightKg: number): string {
  const pct = startWeightKg > 0 ? (kg / startWeightKg) * 100 : 0;
  const text = `${kg.toFixed(2)} / ${pct.toFixed(2)}%`;
  if (kg > EPS) return chalk.green(`↓ ${text}`);
  if (kg < -EPS) return chalk.red(`↑ ${text}`);
  return chalk.dim(`→ ${text}`);
}

/** 偏差（实际−计划）：正=比计划重(红▲) / 负=比计划轻(绿▼)，含占比与文字 */
export function deviationValue(dev: number, startWeightKg = 0): string {
  const pct = startWeightKg > 0 ? (dev / startWeightKg) * 100 : 0;
  const sign = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
  const text = `${sign(dev)} / ${sign(pct)}%`;
  if (dev > EPS) return chalk.red(`▲ ${text} 偏重`);
  if (dev < -EPS) return chalk.green(`▼ ${text} 偏轻`);
  return chalk.dim(`＝ ${text} 持平`);
}

/** 体重变化（正=长胖）：红↑ / 绿↓ */
export function weightChangeValue(kg: number): string {
  if (kg > EPS) return chalk.red(`↑ +${kg.toFixed(2)}`);
  if (kg < -EPS) return chalk.green(`↓ ${kg.toFixed(2)}`);
  return chalk.dim(`→ ${kg.toFixed(2)}`);
}

/** 累计减重（正=已减）：绿 */
export function cumLossValue(kg: number): string {
  if (kg > EPS) return chalk.green(kg.toFixed(2));
  if (kg < -EPS) return chalk.red(kg.toFixed(2));
  return chalk.dim(kg.toFixed(2));
}

/** 趋势方向上色 */
export function trendValue(dir: string): string {
  if (dir === "下降中") return chalk.green(dir);
  if (dir === "上升中") return chalk.red(dir);
  return chalk.yellow(dir);
}

/** 说明文字 */
export const dimText = chalk.dim;

const ANSI_RE = /\u001b\[[0-9;]*m/g;

/** 去掉 ANSI 颜色，供 JSON 输出 */
export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
