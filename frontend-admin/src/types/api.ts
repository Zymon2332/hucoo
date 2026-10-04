/** 后端统一响应信封：业务数据在 `data`，成功判定用 `code === 200`。 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
  timestamp?: number;
  success?: boolean;
}

/** 分页接口的 `data` 结构；注意比通用 `Paginated<T>` 多了 `pages`。 */
export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

/** 后端业务错误：保留 HTTP 状态码、业务码与 traceId，便于提示与排查。 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: number;
  readonly traceId?: string;

  constructor(status: number, code: number, message: string, traceId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** 后端未给出 `message` 时的兜底文案，编号对齐 `backend` 的 `CommonErrorCode`。 */
export const API_ERROR_FALLBACKS: Record<number, string> = {
  400: "请求参数不合法",
  401: "登录状态已失效，请重新登录",
  403: "没有访问该资源的权限",
  404: "请求的资源不存在",
  409: "数据冲突，请刷新后重试",
  429: "操作过于频繁，请稍后再试",
  503: "后端服务暂不可用",
  110004: "账号或凭证错误",
  110005: "该认证方式未启用",
  110006: "账号尚未激活，请联系管理员",
  110008: "验证码发送过于频繁",
  110009: "登录状态已失效，请重新登录",
  110010: "登录状态已失效，请重新登录",
  110011: "该账号尚未加入可访问的企业空间",
};
