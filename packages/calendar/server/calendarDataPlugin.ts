import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const DATA_FILE = fileURLToPath(
  new URL("../../../datas/calendar/calendar.json", import.meta.url),
);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_DATA = {
  version: 1,
  templates: [],
  events: {},
  chartTemplates: [],
};

async function readData(): Promise<unknown> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_DATA;
    }
    throw error;
  }
}

async function writeData(data: unknown): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tempFile, DATA_FILE);
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_BODY_BYTES) {
      throw new Error("请求体过大");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "GET") {
    try {
      sendJson(response, 200, await readData());
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "读取失败",
      });
    }
    return;
  }

  if (request.method === "PUT") {
    try {
      const body = await readBody(request);
      const data: unknown = JSON.parse(body);

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("数据格式错误");
      }

      await writeData(data);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "保存失败",
      });
    }
    return;
  }

  response.setHeader("Allow", "GET, PUT");
  sendJson(response, 405, { error: "Method Not Allowed" });
}

function middleware(request: IncomingMessage, response: ServerResponse) {
  void handleRequest(request, response);
}

export function calendarDataPlugin(): Plugin {
  return {
    name: "calendar-data",
    configureServer(server) {
      server.middlewares.use("/api/calendar", middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/calendar", middleware);
    },
  };
}
