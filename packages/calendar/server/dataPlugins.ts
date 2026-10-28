import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

type JsonDataPluginOptions = {
  name: string;
  route: string;
  dataFile: string;
  defaultData: unknown;
};

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
) {
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

function createJsonDataPlugin({
  name,
  route,
  dataFile,
  defaultData,
}: JsonDataPluginOptions): Plugin {
  async function readData(): Promise<unknown> {
    try {
      const raw = await readFile(dataFile, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return defaultData;
      }
      throw error;
    }
  }

  async function writeData(data: unknown): Promise<void> {
    await mkdir(dirname(dataFile), { recursive: true });
    const tempFile = `${dataFile}.tmp`;
    await writeFile(
      tempFile,
      `${JSON.stringify(data, null, 2)}\n`,
      "utf8",
    );
    await rename(tempFile, dataFile);
  }

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
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

  function middleware(
    request: IncomingMessage,
    response: ServerResponse,
  ) {
    void handleRequest(request, response);
  }

  return {
    name,
    configureServer(server) {
      server.middlewares.use(route, middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(route, middleware);
    },
  };
}

export function calendarDataPlugin(): Plugin {
  return createJsonDataPlugin({
    name: "calendar-data",
    route: "/api/calendar",
    dataFile: fileURLToPath(
      new URL(
        "../../../datas/calendar/calendar.json",
        import.meta.url,
      ),
    ),
    defaultData: {
      version: 1,
      templates: [],
      events: {},
      chartTemplates: [],
    },
  });
}

export function chartsDataPlugin(): Plugin {
  return createJsonDataPlugin({
    name: "charts-data",
    route: "/api/charts",
    dataFile: fileURLToPath(
      new URL("../../../datas/charts/charts.json", import.meta.url),
    ),
    defaultData: { version: 1, templates: [], cases: [] },
  });
}