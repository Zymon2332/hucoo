import { apiRequest } from "@/lib/api-client";
import {
  ADMIN_CONSOLE_CLIENT_ID,
  type AuthCurrentUser,
  type AuthMethod,
  type AuthOAuthAuthorizeResponse,
  type AuthProviderInfo,
  type AuthRegisterRequest,
  type AuthRegisterResult,
  type AuthSessionInfo,
  type AuthTokenResponse,
  type AuthVerificationCodeRequest,
} from "@/types/auth";

const AUTH_BASE = "/api/admin/v1/auth";

export interface LoginInput {
  identifier: string;
  credential: string;
  method?: AuthMethod;
  tenantId?: string;
}

/**
 * 统一认证接口（`backend` 的 `AuthenticationController`）。
 *
 * 登录 / 注册 / 刷新 / 退出都走 `anonymous: true`：不携带令牌，也不触发 401 自动刷新重试。
 */
export const authApi = {
  /** 登录，返回访问令牌与刷新令牌 */
  login: (input: LoginInput) =>
    apiRequest<AuthTokenResponse>(`${AUTH_BASE}/login`, {
      method: "POST",
      body: {
        method: input.method ?? "PASSWORD",
        identifier: input.identifier,
        credential: input.credential,
        clientId: ADMIN_CONSOLE_CLIENT_ID,
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      },
      anonymous: true,
    }),

  /** 注册：Mock 模式注册即激活，可直接登录 */
  register: (payload: AuthRegisterRequest) =>
    apiRequest<AuthRegisterResult>(`${AUTH_BASE}/register`, {
      method: "POST",
      body: payload,
      anonymous: true,
    }),

  /** 刷新访问令牌：refreshToken 会轮换，调用方必须保存新值 */
  refresh: (refreshToken: string) =>
    apiRequest<AuthTokenResponse>(`${AUTH_BASE}/refresh`, {
      method: "POST",
      body: { refreshToken, clientId: ADMIN_CONSOLE_CLIENT_ID },
      anonymous: true,
    }),

  /** 第三方登录授权地址 */
  oauthAuthorize: (provider: string, redirectUri: string) =>
    apiRequest<AuthOAuthAuthorizeResponse>(
      `${AUTH_BASE}/oauth/${provider.toLowerCase()}/authorize`,
      {
        query: { clientId: ADMIN_CONSOLE_CLIENT_ID, redirectUri },
        anonymous: true,
      },
    ),

  /** 当前用户 */
  me: () => apiRequest<AuthCurrentUser>(`${AUTH_BASE}/me`),

  /** 发送验证码；Mock 未实现，会返回 110005 */
  sendVerificationCode: (payload: AuthVerificationCodeRequest) =>
    apiRequest<void>(`${AUTH_BASE}/verification-codes`, {
      method: "POST",
      body: payload,
      anonymous: true,
    }),

  /** 可用认证方式；Mock 只启用了 PASSWORD */
  providers: () => apiRequest<AuthProviderInfo[]>(`${AUTH_BASE}/providers`, { anonymous: true }),

  /** 当前用户的会话列表 */
  sessions: () => apiRequest<AuthSessionInfo[]>(`${AUTH_BASE}/sessions`),

  revokeSession: (sessionId: string) =>
    apiRequest<void>(`${AUTH_BASE}/sessions/${sessionId}`, { method: "DELETE" }),

  /** 退出：按 refreshToken 撤销服务端会话；本地登出不依赖该请求成功 */
  logout: (refreshToken: string) =>
    apiRequest<void>(`${AUTH_BASE}/logout`, {
      method: "POST",
      query: { refreshToken },
      anonymous: true,
    }),
};
