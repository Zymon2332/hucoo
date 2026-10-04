export interface AccessTokenClaims {
  userId?: string | number;
  username?: string;
  tenantId?: string;
  clientId?: string;
  sessionId?: number;
  permissions?: string[];
  /** 过期时间（秒） */
  exp?: number;
  /** 签发时间（秒） */
  iat?: number;
}

/**
 * 解析访问令牌载荷，仅用于界面展示（租户、权限、过期时间）。
 *
 * 不做签名校验，也不能作为鉴权依据：真正的判定始终在后端。
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as AccessTokenClaims;
  } catch {
    return null;
  }
}
