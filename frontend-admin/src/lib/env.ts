/**
 * 后端 API 基址。
 *
 * 本地联调直连 8081（见 `docs/BACKEND_API_HANDOFF.md`）：网关 8080 配了全局 `StripPrefix=2`，
 * 会把 `/api/admin/**` 改写成 `/v1/**`，而管理端只注册了 `/api/admin/v1/**`，走网关必然 404。
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081"
).replace(/\/+$/, "");

/** 未登录时跳转的登录页。 */
export const LOGIN_PATH = "/login";

/** 登录成功后的默认落地页，可被 `/login?next=...` 覆盖。 */
export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

/** 访问令牌剩余有效期低于该值时提前刷新，避免临界过期请求失败。 */
export const TOKEN_REFRESH_LEEWAY_MS = 30_000;
