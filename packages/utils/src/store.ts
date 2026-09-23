import fs from "fs";
import os from "os";
import path from "path";

const BASE_DIR = path.join(os.homedir(), ".ai-tiny-codes");
const SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

export interface JsonStore {
  /** 数据目录，供提示文案使用 */
  dir: string;
  load<T>(name: string): T | null;
  save(name: string, data: unknown): void;
  remove(name: string): void;
  /** 列出某个子目录下所有 json 的 base 名（不含扩展名），按字典序排序 */
  list(subdir?: string): string[];
}

export interface JsonStoreOptions {
  /** 基目录，默认 ~/.ai-tiny-codes；可传项目内目录（如 <repo>/datas） */
  baseDir?: string;
}

function assertName(name: string, kind: string): void {
  const segments = name.split("/");
  const ok =
    segments.length > 0 &&
    segments.every((s) => SEGMENT_RE.test(s) && s !== "." && s !== "..");
  if (!ok) throw new Error(`非法的存储${kind}：${name}`);
}

/**
 * 在 <baseDir>/<scope>/ 下读写 JSON（baseDir 默认 ~/.ai-tiny-codes）。
 * name 支持 `子目录/名字`，如 `plans/plan-96.8-75-2026-08-01`。
 * 读写失败都不影响主流程。
 */
export function createJsonStore(scope: string, options: JsonStoreOptions = {}): JsonStore {
  assertName(scope, "命名空间");
  const dir = path.join(options.baseDir ?? BASE_DIR, scope);

  const fileOf = (name: string): string => {
    assertName(name, "文件名");
    return path.join(dir, `${name}.json`);
  };

  return {
    dir,
    load<T>(name: string): T | null {
      try {
        const file = fileOf(name);
        if (!fs.existsSync(file)) return null;
        return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
      } catch {
        return null;
      }
    },
    save(name: string, data: unknown): void {
      try {
        const file = fileOf(name);
        const parent = path.dirname(file);
        if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
      } catch {
        // 存储失败不影响主流程
      }
    },
    remove(name: string): void {
      try {
        const file = fileOf(name);
        if (fs.existsSync(file)) fs.rmSync(file);
      } catch {
        // 忽略删除失败
      }
    },
    list(subdir = ""): string[] {
      try {
        if (subdir) assertName(subdir, "子目录");
        const target = subdir ? path.join(dir, subdir) : dir;
        if (!fs.existsSync(target)) return [];
        return fs
          .readdirSync(target)
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.slice(0, -".json".length))
          .sort();
      } catch {
        return [];
      }
    },
  };
}
