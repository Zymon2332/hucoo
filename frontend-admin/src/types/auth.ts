import type { ID } from "@/types/common";

/** 后端 `AuthenticationMethod` 枚举。 */
export type AuthMethod = "PASSWORD" | "SMS" | "EMAIL" | "WECHAT" | "QQ";

/** 管理端固定客户端标识（后端 `AuthLoginRequest.clientId` 默认值）。 */
export const ADMIN_CONSOLE_CLIENT_ID = "ADMIN_CONSOLE";

export interface AuthLoginRequest {
  method: AuthMethod;
  identifier: string;
  credential: string;
  clientId?: string;
  tenantId?: string;
  deviceId?: string;
}

export interface AuthRegisterRequest {
  identifier: string;
  /** 8 ~ 128 位，与后端 `AuthRegisterRequest` 校验一致 */
  password: string;
  displayName?: string;
}

export interface AuthRegisterResult {
  userId: ID;
  username: string;
  /** Mock 模式注册即 `ACTIVE`；真实实现可能为 `PENDING`，需管理员激活后才能登录 */
  status: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string;
  /** 访问令牌有效期（秒） */
  expiresIn: number;
  /** 刷新即轮换，旧令牌立即失效 */
  refreshToken: string;
  /** `LocalDateTime` 字符串，不带时区，按本地时间解析 */
  refreshTokenExpiresAt: string;
  userId: ID;
  username: string;
  tenantId: string;
  availableTenantIds: string[];
}

export interface AuthCurrentUser {
  userId: ID;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string | null;
}

export interface AuthProviderInfo {
  method: AuthMethod;
  enabled: boolean;
}

/** 第三方登录授权地址；`authorizationUrl` 由后端拼装，前端只负责跳转。 */
export interface AuthOAuthAuthorizeResponse {
  provider: AuthMethod;
  authorizationUrl: string;
  state: string;
}

/** 验证码发送渠道；后端 `AuthVerificationCodeRequest` 用 channel + purpose 组合路由。 */
export type VerificationChannel = "SMS" | "EMAIL";

export interface AuthVerificationCodeRequest {
  channel: VerificationChannel;
  /** 用途，登录场景固定 LOGIN */
  purpose: string;
  /** 接收方：短信为手机号，邮件为邮箱 */
  destination: string;
}

export interface AuthSessionInfo {
  sessionId: ID;
  clientId: string | null;
  deviceId: string | null;
  tenantId: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}
