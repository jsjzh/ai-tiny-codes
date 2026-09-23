import { KeepStrongOptions, ResolvedOptions, resolveOptions } from "./config";

export class KeepStrongApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "KeepStrongApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export interface KeepStrongRequestOptions {
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    sp.append(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class KeepStrongClient {
  readonly options: ResolvedOptions;

  constructor(options: KeepStrongOptions = {}) {
    this.options = resolveOptions(options);
  }

  /** GET，query 会自动拼到 URL 上 */
  getJson<T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal): Promise<T> {
    return this.request<T>("GET", path, { query, signal });
  }

  /** POST，会自动加 Idempotency-Key 并合并 userConfirmed=true */
  postJson<T>(path: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    return this.request<T>("POST", path, { body, signal });
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    opts: KeepStrongRequestOptions = {},
    attempt = 0
  ): Promise<T> {
    const write = method === "POST";
    const url = `${this.options.baseUrl}${path}${buildQuery(opts.query)}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      "X-KeepStrong-Skill-Version": this.options.skillVersion,
      "X-KeepStrong-Agent-Name": this.options.agentName,
      "X-Timezone-Offset": String(this.options.timezoneOffset),
    };

    let body: string | undefined;
    if (write) {
      headers["Content-Type"] = "application/json";
      headers["Idempotency-Key"] = uuid();
      body = JSON.stringify({ userConfirmed: true, ...(opts.body ?? {}) });
    }

    const response = await fetch(url, { method, headers, body, signal: opts.signal });

    // 429：按 Retry-After 有界退避重试
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after")) || 2 ** attempt;
      await sleep(retryAfter * 1000);
      return this.request<T>(method, path, opts, attempt + 1);
    }

    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = text;
    }

    if (!response.ok) throw this.toError(response.status, payload);

    // 该 API 直接返回数据，没有 { code, data, msg } 包裹
    return payload as T;
  }

  private toError(status: number, payload: unknown): KeepStrongApiError {
    const obj = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
    const serverMsg =
      typeof obj.msg === "string" ? obj.msg : typeof obj.message === "string" ? obj.message : "";

    if (status === 401 && obj.apiKeyExpired === true) {
      return new KeepStrongApiError(
        "练练健身 API Key 已失效：请打开「练练健身 > 我的 > 连接 AI」重新生成，并更新 KEEPSTRONG_API_KEY",
        status,
        payload
      );
    }
    if (status === 426 && obj.skillUpdateRequired === true) {
      const skillUrl = typeof obj.skillUrl === "string" ? obj.skillUrl : "";
      return new KeepStrongApiError(
        `练练健身 skill 需要更新${skillUrl ? `（${skillUrl}）` : ""}`,
        status,
        payload
      );
    }
    if (serverMsg === "TIMEZONE_OFFSET_SIGN_MISMATCH" || obj.code === "TIMEZONE_OFFSET_SIGN_MISMATCH") {
      return new KeepStrongApiError(
        "时区偏移符号错误：X-Timezone-Offset 应为 UTC 以东分钟数（中国 480）",
        status,
        payload
      );
    }
    return new KeepStrongApiError(serverMsg || `请求失败（HTTP ${status}）`, status, payload);
  }
}

export function createKeepStrong(options: KeepStrongOptions = {}): KeepStrongClient {
  return new KeepStrongClient(options);
}