/**
 * 租户管理接口契约（`backend` 的 `TenantController`，路径前缀 `/api/admin/v1/tenants`）。
 *
 * 与 `dev`/`test` profile 下实测响应逐字段对齐，注意：
 * - `id` 是雪花 ID，序列化为字符串，不要当数字用；
 * - `status` 是数字枚举，DDL 注释为 `1 启用，0 停用`，后端没有对应的 Java 枚举；
 * - 时间字段是**无时区的** `LocalDateTime`，形如 `2027-01-01T00:00` / `2026-10-01T14:51:46.994301`。
 */

import type { TenantStatus } from "@/types/identity";

/** 后端 `TenantDTO`。 */
export interface TenantDTO {
  id: string;
  tenantCode: string;
  tenantName: string;
  contactEmail: string | null;
  planCode: string | null;
  status: number | null;
  expireAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * 后端 `TenantCreateRequest`，创建与更新共用。
 *
 * 后端 `PUT`/`PATCH` 都是**整体替换**语义（`TenantConverter.update` 会把未传字段写成 null），
 * 所以提交时务必补齐全部字段，不要只传改动项。
 */
export interface TenantCreateRequest {
  tenantCode: string;
  tenantName: string;
  planCode: string;
  contactEmail?: string | null;
  status?: number | null;
  expireAt?: string | null;
}

/** 后端 `TenantOverviewDTO`：租户本体 + 成员/组织计数。 */
export interface TenantOverviewDTO {
  tenant: TenantDTO;
  userCount: number;
  organizationCount: number;
  activeUserCount: number;
}

/** 后端 `GET /tenants/statistics` 目前只返回 `total`，用索引签名兜住将来新增的聚合项。 */
export interface TenantStatistics {
  total: number;
  [key: string]: unknown;
}

export interface TenantPageParams {
  page: number;
  pageSize: number;
  /** 后端仅按 `tenant_code` 模糊匹配，不搜名称/邮箱 */
  keyword?: string;
}

/** `ap_tenant.status` 的取值，依据 DDL 注释 `状态：1 启用，0 停用`。 */
export const TENANT_STATUS_ENABLED = 1;
export const TENANT_STATUS_DISABLED = 0;

export type TenantStatusKey = "active" | "suspended" | "unknown";

/** 映射到 `src/lib/status.ts` 里已有的配色键，未知取值单独兜底。 */
export function tenantStatusKey(status: number | null | undefined): TenantStatusKey {
  if (status === TENANT_STATUS_ENABLED) return "active";
  if (status === TENANT_STATUS_DISABLED) return "suspended";
  return "unknown";
}

export function tenantStatusLabel(status: number | null | undefined): string {
  if (status === TENANT_STATUS_ENABLED) return "启用";
  if (status === TENANT_STATUS_DISABLED) return "停用";
  return status === null || status === undefined ? "未设置" : `未知（${status}）`;
}

export function isTenantEnabled(status: number | null | undefined): boolean {
  return status === TENANT_STATUS_ENABLED;
}

/** 新建/编辑表单的状态下拉项，值用字符串以适配 Radix Select。 */
export const TENANT_STATUS_OPTIONS = [
  { value: String(TENANT_STATUS_ENABLED), label: "启用" },
  { value: String(TENANT_STATUS_DISABLED), label: "停用" },
] as const;

/** 套餐编码后端是自由文本（`plan_code VARCHAR(64)`），这里只给常见值做输入建议。 */
export const TENANT_PLAN_SUGGESTIONS = ["free", "team", "business", "enterprise"] as const;

/** `<input type="datetime-local">` 需要 `yyyy-MM-ddTHH:mm`。 */
export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 16);
}

/** 把 `<input type="datetime-local">` 的取值归一成后端 `LocalDateTime` 可解析的字符串。 */
export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
}

/** 到期状态，仅用于展示着色，不作为业务判断依据。 */
export type TenantExpiryState = "none" | "expired" | "expiring" | "valid";

export function tenantExpiryState(
  expireAt: string | null | undefined,
  withinDays = 30,
): TenantExpiryState {
  if (!expireAt) return "none";
  const expiresAt = new Date(expireAt).getTime();
  if (Number.isNaN(expiresAt)) return "none";
  const now = Date.now();
  if (expiresAt < now) return "expired";
  if (expiresAt - now <= withinDays * 86_400_000) return "expiring";
  return "valid";
}

/**
 * 后端当前 DTO **没有**、但页面已经在用的字段。
 *
 * 页面上这些位置保留原样并以 `—` 占位（`title` 提示原因），不做减法；
 * 后端补齐后只需把对应值填进 {@link TenantRow}，页面无需再改结构。
 */
export const TENANT_FIELD_GAPS = {
  region: "区域（ap_tenant 无 region 列）",
  ownerName: "负责人姓名（只有 contactEmail）",
  seats: "席位数量",
  userCount: "成员数（仅概览接口按 tenant_id 统计，列表 DTO 未返回）",
  projectCount: "项目数",
  agentCount: "Agent 数",
  monthlyCalls: "月调用量",
  monthlyTokens: "月 Token",
  monthlyCost: "月成本",
  featureFlags: "功能开关（自定义模型 / BYOK / 本地模型 / 共享模型）",
  ssoEnabled: "SSO 启用状态",
  quota: "配额（Token / 调用次数 / 存储 / 并发 / 成本）",
  usageSeries: "用量时序与模型分布",
  statusDetail: "更细的状态枚举（试用中 / 开通中）",
  statistics: "统计接口聚合项（当前只有 total）",
} as const;

export const TENANT_FIELD_GAP_HINT = "后端暂未提供该字段，待接口补齐";

/**
 * 列表/详情页面使用的行视图：后端已提供字段 + 待补齐字段（可空）。
 * 待补齐字段为 `null`/`undefined` 时页面显示 `—` 占位，而不是编造数据。
 */
export interface TenantRow extends TenantDTO {
  region?: string | null;
  ownerName?: string | null;
  seats?: number | null;
  userCount?: number | null;
  projectCount?: number | null;
  agentCount?: number | null;
  monthlyCalls?: number | null;
  monthlyTokens?: number | null;
  monthlyCost?: number | null;
  ssoEnabled?: boolean | null;
  allowCustomModels?: boolean | null;
  allowByok?: boolean | null;
  allowLocalModels?: boolean | null;
  allowSharedModels?: boolean | null;
  tags?: string[] | null;
}

/** 由真实 DTO 生成行视图；待补齐字段一律留空。 */
export function toTenantRow(tenant: TenantDTO): TenantRow {
  return { ...tenant };
}

/**
 * 页面状态键 → 后端可推导的取值。
 *
 * 后端 `status` 只有 1/0，`expired` 由 `expireAt` 推导；
 * `trial`（试用中）与 `provisioning`（开通中）需要后端提供更细的状态枚举，当前不会出现。
 */
export function tenantRowStatus(tenant: Pick<TenantDTO, "status" | "expireAt">): TenantStatus {
  if (tenant.status === TENANT_STATUS_DISABLED) return "suspended";
  if (tenant.status === TENANT_STATUS_ENABLED) {
    return tenantExpiryState(tenant.expireAt) === "expired" ? "expired" : "active";
  }
  return "provisioning";
}
