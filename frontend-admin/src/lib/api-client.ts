import { API_BASE_URL } from "@/lib/env";
import { API_ERROR_FALLBACKS, ApiError, type ApiEnvelope } from "@/types/api";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** 登录 / 注册 / 刷新 / 退出等接口：不携带令牌，也不做 401 自动刷新重试。 */
  anonymous?: boolean;
}

interface AuthBridge {
  getAccessToken: () => string | null;
  getTenantId: () => string | null;
  /** 刷新成功返回 true，调用方会重放原请求 */
  refreshAccessToken: () => Promise<boolean>;
  onUnauthorized: () => void;
}

// 会话层（src/lib/auth/session.ts）在模块初始化时注入，避免 api-client ↔ session 循环依赖。
let authBridge: AuthBridge = {
  getAccessToken: () => null,
  getTenantId: () => null,
  refreshAccessToken: async () => false,
  onUnauthorized: () => {},
};

export function configureAuthBridge(next: Partial<AuthBridge>): void {
  authBridge = { ...authBridge, ...next };
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = new URL(path, `${API_BASE_URL}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function parseEnvelope<T>(text: string): ApiEnvelope<T> | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return undefined;
  }
}

function resolveMessage<T>(envelope: ApiEnvelope<T> | undefined, response: Response): string {
  const fromServer = envelope?.message?.trim();
  if (fromServer) return fromServer;
  const code = envelope?.code ?? response.status;
  return API_ERROR_FALLBACKS[code] ?? `请求失败（HTTP ${response.status}）`;
}

async function send<T>(path: string, options: RequestOptions, allowRetry: boolean): Promise<T> {
  const { method = "GET", body, query, idempotencyKey, signal, anonymous = false } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (!anonymous) {
    const token = authBridge.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const tenantId = authBridge.getTenantId();
    if (tenantId) headers["X-Tenant-Id"] = tenantId;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(0, 0, `无法连接后端服务（${API_BASE_URL}），请确认服务已启动`);
  }

  const envelope = parseEnvelope<T>(await response.text());

  // 访问令牌过期：刷新一次后重放原请求；登录接口自身的 401 走 anonymous，不会进这里。
  if (response.status === 401 && !anonymous && allowRetry) {
    const refreshed = await authBridge.refreshAccessToken();
    if (refreshed) return send<T>(path, options, false);
    authBridge.onUnauthorized();
  }

  if (!response.ok || (envelope && envelope.code !== 200)) {
    throw new ApiError(
      response.status,
      envelope?.code ?? response.status,
      resolveMessage(envelope, response),
      envelope?.traceId,
    );
  }

  return (envelope ? envelope.data : undefined) as T;
}

/** 统一请求入口：成功返回信封里的 `data`，失败抛 {@link ApiError}。 */
export function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true);
}

/** 面向表单与提示的错误文案：优先用后端 `message`，网络异常归一为可读说明。 */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || API_ERROR_FALLBACKS[error.code] || "请求失败";
  }
  if (error instanceof Error && error.message) return error.message;
  return "请求失败，请稍后重试";
}

/** 后端 traceId，便于把前端报错与后端日志对上。 */
export function traceIdOf(error: unknown): string | undefined {
  return error instanceof ApiError ? error.traceId : undefined;
}
