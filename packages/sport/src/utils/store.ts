import fs from "fs";
import os from "os";
import path from "path";

const DIR = path.join(os.homedir(), ".sports-diet");
const FILE_NAME_RE = /^[a-zA-Z0-9-]+$/;

function fileOf(name: string): string {
  if (!FILE_NAME_RE.test(name)) throw new Error(`非法的存储文件名：${name}`);
  return path.join(DIR, `${name}.json`);
}

export function loadJson<T>(name: string): T | null {
  try {
    const file = fileOf(name);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function saveJson(name: string, data: unknown): void {
  try {
    const file = fileOf(name);
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // 存储失败不影响主流程
  }
}

export function removeJson(name: string): void {
  try {
    const file = fileOf(name);
    if (fs.existsSync(file)) fs.rmSync(file);
  } catch {
    // 忽略删除失败
  }
}
