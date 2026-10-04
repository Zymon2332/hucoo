import { apiRequest, createIdempotencyKey } from "@/lib/api-client";
import type { ApiPage } from "@/types/api";
import type {
  TenantCreateRequest,
  TenantDTO,
  TenantOverviewDTO,
  TenantPageParams,
  TenantStatistics,
} from "@/types/tenant";

const TENANT_BASE = "/api/admin/v1/tenants";

/**
 * 租户管理接口（`backend` 的 `TenantController`）。
 *
 * 实测要点（`dev` profile，真实 PostgreSQL）：
 * - 分页 `keyword` 只对 `tenant_code` 做模糊匹配；
 * - `POST`/`PUT`/`PATCH` 都要求 `tenantCode`、`tenantName`、`planCode` 非空，且写接口是整体替换语义；
 * - 写接口的**响应体**会把未传字段回显成 `null`（DB 里其实没被清空），
 *   因此调用方不要拿写响应当权威数据，写入后统一 invalidate 重新拉取；
 * - `tenant_code` 没有唯一约束，重复编码也能创建成功。
 */
export const tenantApi = {
  /** 分页查询；`page` 从 1 开始，`pageSize` 上限 500 */
  page: (params: TenantPageParams) =>
    apiRequest<ApiPage<TenantDTO>>(TENANT_BASE, {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        keyword: params.keyword?.trim() || undefined,
      },
    }),

  /** 详情；不存在时后端返回 404 */
  detail: (id: string) => apiRequest<TenantDTO>(`${TENANT_BASE}/${id}`),

  /** 概览：租户本体 + 成员/活跃成员/组织计数 */
  overview: (id: string) => apiRequest<TenantOverviewDTO>(`${TENANT_BASE}/${id}/overview`),

  /** 统计；后端目前只返回 `total` */
  statistics: () => apiRequest<TenantStatistics>(`${TENANT_BASE}/statistics`),

  create: (payload: TenantCreateRequest) =>
    apiRequest<TenantDTO>(TENANT_BASE, {
      method: "POST",
      body: payload,
      idempotencyKey: createIdempotencyKey(),
    }),

  /** 更新：后端 PUT/PATCH 等价且为非部分更新，`payload` 必须携带全部字段 */
  update: (id: string, payload: TenantCreateRequest) =>
    apiRequest<TenantDTO>(`${TENANT_BASE}/${id}`, {
      method: "PUT",
      body: payload,
      idempotencyKey: createIdempotencyKey(),
    }),

  /** 删除：逻辑删除，返回是否删除成功 */
  remove: (id: string) =>
    apiRequest<boolean>(`${TENANT_BASE}/${id}`, {
      method: "DELETE",
      idempotencyKey: createIdempotencyKey(),
    }),
};
