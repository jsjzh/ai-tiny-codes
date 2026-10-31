import fs from "node:fs";
import path from "node:path";

/**
 * 读取一个 `KEY=VALUE` 的 .env 文件并写入 process.env（已存在的变量不覆盖）。
 * 仅在 Node 环境可用；浏览器环境请用自己的环境变量注入方式。
 */
export function loadEnvFile(filePath: string): void {
  if (typeof process === "undefined" || !process.env) return;
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const matched = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (matched && process.env[matched[1]] === undefined) {
      process.env[matched[1]] = matched[2].replace(/^["']|["']$/g, "");
    }
  }
}

/**
 * 从仓库根（含 pnpm-workspace.yaml）读取环境变量，先 `.env.local` 后 `.env`。
 * 已存在的变量不覆盖，因此 `.env.local` 优先级更高。
 */
export function loadProjectEnv(start: string = process.cwd()): void {
  let dir = start;
  for (;;) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      loadEnvFile(path.join(dir, ".env.local"));
      loadEnvFile(path.join(dir, ".env"));
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}