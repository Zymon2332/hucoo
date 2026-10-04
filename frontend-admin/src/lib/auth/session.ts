import { create } from "zustand";

import { authApi } from "@/lib/api/auth";
import { configureAuthBridge, describeApiError } from "@/lib/api-client";
import { decodeAccessToken } from "@/lib/auth/jwt";
import { TOKEN_REFRESH_LEEWAY_MS } from "@/lib/env";
import type { AuthMethod, AuthRegisterResult, AuthTokenResponse } from "@/types/auth";
import type { ID } from "@/types/common";

const STORAGE_KEY = "hucoo.admin.session";
const FALLBACK_ACCESS_TTL_MS = 20 * 60 * 1000;

export interface AuthUser {
  userId: ID;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
  /** 访问令牌过期时间（epoch ms） */
  expiresAt: number;
  /** 刷新令牌过期时间（epoch ms），后端返回的是不带时区的本地时间 */
  refreshExpiresAt: number | null;
  tenantId: string | null;
  availableTenantIds: string[];
  permissions: string[];
  user: AuthUser;
  /** 记住我：true 落 localStorage，false 落 sessionStorage */
  remember: boolean;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
}

export const useAuthStore = create<AuthState>(() => ({
  status: "idle",
  session: null,
  error: null,
}));

/* -------------------------------------------------------------------------- */
/* 本地持久化                                                                   */
/* -------------------------------------------------------------------------- */

function storageFor(remember: boolean): Storage | null {
  if (typeof window === "undefined") return null;
  return remember ? window.localStorage : window.sessionStorage;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed?.accessToken && parsed.user) {
        return { ...parsed, remember: storage === window.localStorage };
      }
    } catch {
      // 损坏的数据直接丢弃，避免卡在无法登录的状态
    }
    storage.removeItem(STORAGE_KEY);
  }
  return null;
}

function writeStoredSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;

  // 先清两处，避免「记住我」切换后残留两份互相覆盖
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  if (!session) return;
  storageFor(session.remember)?.setItem(STORAGE_KEY, JSON.stringify(session));
}

/** 后端时间字段是 `LocalDateTime`（不带时区），按本地时间解析；纳秒部分裁到毫秒。 */
function parseLocalDateTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value.replace(/(\.\d{3})\d+$/, "$1"));
  return Number.isNaN(parsed) ? null : parsed;
}

/* -------------------------------------------------------------------------- */
/* 会话状态                                                                     */
/* -------------------------------------------------------------------------- */

function clearSession(): void {
  writeStoredSession(null);
  useAuthStore.setState({ status: "anonymous", session: null });
}

function applyTokenResponse(
  token: AuthTokenResponse,
  options: { remember: boolean; user: AuthUser },
): AuthSession {
  const claims = decodeAccessToken(token.accessToken);
  const expiresAt =
    claims?.exp && claims.exp > 0
      ? claims.exp * 1000
      : Date.now() + (token.expiresIn > 0 ? token.expiresIn * 1000 : FALLBACK_ACCESS_TTL_MS);

  const session: AuthSession = {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken || null,
    expiresAt,
    refreshExpiresAt: parseLocalDateTime(token.refreshTokenExpiresAt),
    tenantId: token.tenantId ?? claims?.tenantId ?? null,
    availableTenantIds: token.availableTenantIds ?? [],
    permissions: claims?.permissions ?? [],
    user: options.user,
    remember: options.remember,
  };

  useAuthStore.setState({ status: "authenticated", session, error: null });
  writeStoredSession(session);
  return session;
}

let refreshInFlight: Promise<boolean> | null = null;

/** 刷新访问令牌；并发调用共享同一次请求。返回 false 表示会话已失效并已清空。 */
function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const pending = (async () => {
    const current = useAuthStore.getState().session;
    if (!current?.refreshToken) return false;
    if (current.refreshExpiresAt !== null && current.refreshExpiresAt <= Date.now()) {
      clearSession();
      return false;
    }
    try {
      const token = await authApi.refresh(current.refreshToken);
      applyTokenResponse(token, { remember: current.remember, user: current.user });
      return true;
    } catch {
      clearSession();
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  refreshInFlight = pending;
  return pending;
}

/** 用 `/auth/me` 补全展示信息；网络异常时保留本地会话，只有令牌失效才会被清空。 */
async function loadCurrentUser(): Promise<void> {
  const current = useAuthStore.getState().session;
  if (!current) return;

  try {
    const me = await authApi.me();
    const latest = useAuthStore.getState().session;
    if (!latest) return;
    const session: AuthSession = {
      ...latest,
      user: {
        userId: me.userId,
        username: me.username,
        displayName: me.displayName?.trim() || me.username,
        avatarUrl: me.avatarUrl ?? null,
        status: me.status ?? null,
      },
    };
    useAuthStore.setState({ status: "authenticated", session, error: null });
    writeStoredSession(session);
  } catch {
    // 会话已被 api-client 清理（401 且刷新失败）时保持匿名；否则视为离线，继续用本地会话。
    if (useAuthStore.getState().session) {
      useAuthStore.setState({ status: "authenticated" });
    }
  }
}

let bootstrapInFlight: Promise<void> | null = null;

/** 恢复登录态：读本地会话 → 必要时刷新 → 拉取当前用户。可重复调用。 */
export function bootstrapSession(): Promise<void> {
  if (bootstrapInFlight) return bootstrapInFlight;

  const pending = (async () => {
    const existing = useAuthStore.getState().session;
    if (
      existing &&
      useAuthStore.getState().status === "authenticated" &&
      existing.expiresAt - TOKEN_REFRESH_LEEWAY_MS > Date.now()
    ) {
      return;
    }

    const stored = readStoredSession();
    if (!stored) {
      useAuthStore.setState({ status: "anonymous", session: null, error: null });
      return;
    }

    useAuthStore.setState({ status: "loading", session: stored, error: null });

    if (stored.expiresAt - TOKEN_REFRESH_LEEWAY_MS <= Date.now()) {
      const refreshed = await refreshSession();
      if (!refreshed) return;
    }
    await loadCurrentUser();
  })().finally(() => {
    bootstrapInFlight = null;
  });

  bootstrapInFlight = pending;
  return pending;
}

/* -------------------------------------------------------------------------- */
/* 对外动作                                                                     */
/* -------------------------------------------------------------------------- */

export interface SignInInput {
  identifier: string;
  credential: string;
  /** 记住我：勾选后令牌存 localStorage，否则只存当前标签页会话 */
  remember: boolean;
  /** 默认账号密码登录 */
  method?: AuthMethod;
}

/** 登录；失败时抛出原始错误（调用方用 describeApiError 取文案）。 */
export async function signIn(input: SignInInput): Promise<AuthSession> {
  useAuthStore.setState({ status: "loading", error: null });
  try {
    const token = await authApi.login({
      identifier: input.identifier.trim(),
      credential: input.credential,
      method: input.method,
    });
    const session = applyTokenResponse(token, {
      remember: input.remember,
      user: {
        userId: token.userId,
        username: token.username,
        displayName: token.username,
        avatarUrl: null,
        status: null,
      },
    });
    await loadCurrentUser();
    // loadCurrentUser 会用 /auth/me 的结果替换会话，返回最新快照而不是上面那份
    return useAuthStore.getState().session ?? session;
  } catch (error) {
    // 登录失败同样要清掉本地令牌，否则内存匿名、存储里还留着上一份会话，下次启动会被恢复
    clearSession();
    useAuthStore.setState({ error: describeApiError(error) });
    throw error;
  }
}

/** 注册：Mock 模式注册即激活，注册后可立刻用同一账号密码登录。 */
export function registerAccount(payload: {
  identifier: string;
  password: string;
  displayName?: string;
}): Promise<AuthRegisterResult> {
  return authApi.register({
    identifier: payload.identifier.trim(),
    password: payload.password,
    displayName: payload.displayName?.trim() || undefined,
  });
}

/** 退出登录：先清本地（立即生效），再尽力撤销服务端会话。 */
export async function signOut(): Promise<void> {
  const current = useAuthStore.getState().session;
  clearSession();
  if (!current?.refreshToken) return;
  try {
    await authApi.logout(current.refreshToken);
  } catch {
    // 撤销失败不影响本地登出
  }
}

export function useAuthStatus(): AuthStatus {
  return useAuthStore((state) => state.status);
}

export function useAuthUser(): AuthUser | null {
  return useAuthStore((state) => state.session?.user ?? null);
}

const EMPTY_PERMISSIONS: string[] = [];

/** 权限码来自访问令牌，仅用于界面显隐；后端仍会独立鉴权。 */
export function useAuthPermissions(): string[] {
  return useAuthStore((state) => state.session?.permissions ?? EMPTY_PERMISSIONS);
}

/** 判断是否拥有某个权限码，`*` 视为全部权限。 */
export function hasPermission(permissions: string[], code: string): boolean {
  return permissions.includes("*") || permissions.includes(code);
}

/* -------------------------------------------------------------------------- */
/* 注入 api-client 的鉴权钩子（避免循环依赖）                                     */
/* -------------------------------------------------------------------------- */

configureAuthBridge({
  getAccessToken: () => useAuthStore.getState().session?.accessToken ?? null,
  getTenantId: () => useAuthStore.getState().session?.tenantId ?? null,
  refreshAccessToken: refreshSession,
  onUnauthorized: clearSession,
});
