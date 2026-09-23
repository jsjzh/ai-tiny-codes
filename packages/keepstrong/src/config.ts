export const DEFAULT_BASE_URL = "https://lianlian.gzyunke.cn";
export const API_PREFIX = "/api/v1/ai";
export const SKILL_VERSION = "1.25.0";
export const AGENT_NAME = "opencode";

export interface KeepStrongOptions {
  /** API Key，默认读 process.env.KEEPSTRONG_API_KEY */
  apiKey?: string;
  /** 服务地址，默认 https://lianlian.gzyunke.cn */
  baseUrl?: string;
  /** X-KeepStrong-Agent-Name，默认 opencode */
  agentName?: string;
  /** X-KeepStrong-Skill-Version，默认 1.25.0 */
  skillVersion?: string;
  /** X-Timezone-Offset（UTC 以东分钟数），默认按本机时区计算 */
  timezoneOffset?: number;
}

export interface ResolvedOptions {
  apiKey: string;
  baseUrl: string;
  agentName: string;
  skillVersion: string;
  timezoneOffset: number;
}

const ENV: Record<string, string | undefined> =
  typeof process !== "undefined" && process.env ? process.env : {};

export function resolveOptions(options: KeepStrongOptions = {}): ResolvedOptions {
  const apiKey = options.apiKey ?? ENV.KEEPSTRONG_API_KEY;
  if (!apiKey) {
    throw new Error(
      "缺少 KeepStrong API Key：请设置环境变量 KEEPSTRONG_API_KEY，或在 createKeepStrong({ apiKey }) 中传入。"
    );
  }
  return {
    apiKey,
    baseUrl: options.baseUrl ?? ENV.KEEPSTRONG_BASE_URL ?? DEFAULT_BASE_URL,
    agentName: options.agentName ?? AGENT_NAME,
    skillVersion: options.skillVersion ?? SKILL_VERSION,
    // JS 的 getTimezoneOffset 与「UTC 以东分钟数」符号相反，需取负
    timezoneOffset: options.timezoneOffset ?? -new Date().getTimezoneOffset(),
  };
}