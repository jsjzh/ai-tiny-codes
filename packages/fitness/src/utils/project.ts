import fs from "fs";
import path from "path";

/** 从当前目录往上找到含 pnpm-workspace.yaml 的仓库根；找不到则返回起始目录 */
export function findProjectRoot(start: string = process.cwd()): string {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/** 仓库内数据目录 <repo>/datas（可继续传子路径） */
export function datasDir(...segments: string[]): string {
  return path.join(findProjectRoot(), "datas", ...segments);
}

/** 相对仓库根的数据路径，用于提示文案 */
export function datasRelative(...segments: string[]): string {
  return path.join("datas", ...segments);
}
