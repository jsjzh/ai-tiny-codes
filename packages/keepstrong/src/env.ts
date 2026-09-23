import fs from "node:fs";

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