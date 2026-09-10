import fs from "fs";
import os from "os";
import path from "path";

const BASE_DIR = path.join(os.homedir(), ".ai-tiny-codes");
const NAME_RE = /^[a-zA-Z0-9-]+$/;

export interface JsonStore {
  /** 数据目录，供提示文案使用 */
  dir: string;
  load<T>(name: string): T | null;
  save(name: string, data: unknown): void;
  remove(name: string): void;
}

function assertName(name: string, kind: string): void {
  if (!NAME_RE.test(name)) throw new Error(`非法的存储${kind}：${name}`);
}

/**
 * 在 ~/.ai-tiny-codes/<scope>/ 下读写 JSON。
 * 读写失败都不影响主流程。
 */
export function createJsonStore(scope: string): JsonStore {
  assertName(scope, "命名空间");
  const dir = path.join(BASE_DIR, scope);

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
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
  };
}
