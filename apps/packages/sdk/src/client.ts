import { ApiError, SUCCESS_CODE, type Result } from "./types";

export interface SdkOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function isResult(value: unknown): value is Result<unknown> {
  return (
    typeof value === "object" && value !== null && "code" in value && "message" in value
  );
}

export class Sdk {
  constructor(private readonly options: SdkOptions) {}

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const base = this.options.baseUrl.replace(/\/$/, "");
    const url = path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    if (!query) return url;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      baseUrl: _baseUrl,
      getToken,
      onUnauthorized,
      fetchImpl = fetch,
    } = this.options;

    const headers: Record<string, string> = { ...options.headers };
    const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    const token = getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetchImpl(this.buildUrl(path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (response.status === 401) onUnauthorized?.();

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const result = isResult(payload) ? payload : null;
      throw new ApiError(
        result?.code ?? response.status,
        result?.message ?? response.statusText,
        result?.traceId,
      );
    }

    if (isResult(payload)) {
      if (payload.code !== SUCCESS_CODE) {
        throw new ApiError(payload.code, payload.message, payload.traceId);
      }
      return payload.data as T;
    }

    return payload as T;
  }

  get<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, { ...options, body, method: "POST" });
  }

  put<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, { ...options, body, method: "PUT" });
  }

  del<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export function createSdk(options: SdkOptions): Sdk {
  return new Sdk(options);
}
