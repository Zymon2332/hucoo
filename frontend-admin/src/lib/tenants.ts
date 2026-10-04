import { z } from "zod";
import { getStatusMeta } from "@/lib/status";
import {
  TENANT_STATUS_DISABLED,
  TENANT_STATUS_ENABLED,
  isTenantEnabled,
  tenantRowStatus,
  type TenantCreateRequest,
  type TenantRow,
} from "@/types/tenant";

/**
 * 租户表单与请求体映射。
 *
 * 页面保留全部原始表单元素，但只有后端真实存在的字段会进入请求体：
 * 区域、席位、负责人姓名、功能开关属于「缺口字段」，提交时忽略（见 `TENANT_FIELD_GAPS`）。
 */
export const tenantFormSchema = z.object({
  name: z.string().trim().min(1, "请填写租户名称").max(128, "租户名称不能超过 128 个字符"),
  slug: z
    .string()
    .trim()
    .min(1, "请填写租户标识")
    .max(64, "租户标识不能超过 64 个字符")
    .regex(/^[A-Za-z0-9._-]+$/, "租户标识只能包含字母、数字、点、下划线与连字符"),
  plan: z.string().trim().min(1, "请选择套餐").max(64, "套餐编码不能超过 64 个字符"),
  // 后端 status 目前只支持 1 启用 / 0 停用，其余状态待接口补齐
  status: z.enum(["active", "suspended"]),
  expireAt: z.string(),
  region: z.string().min(1, "请选择区域"),
  ownerName: z.string(),
  ownerEmail: z.union([z.literal(""), z.string().trim().email("请输入合法邮箱").max(128)]),
  seats: z.coerce.number().int().min(1, "至少 1 个席位").max(5000, "席位过多"),
  allowCustomModels: z.boolean(),
  allowByok: z.boolean(),
  allowLocalModels: z.boolean(),
  allowSharedModels: z.boolean(),
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;

export const REGION_OPTIONS = [
  { value: "华东-上海", label: "华东-上海" },
  { value: "华北-北京", label: "华北-北京" },
  { value: "华南-深圳", label: "华南-深圳" },
  { value: "华东-杭州", label: "华东-杭州" },
  { value: "华中-武汉", label: "华中-武汉" },
];

/** 状态下拉：只有「正常 / 已暂停」能映射到后端 status 1/0，其余置灰待接口补齐。 */
export const FORM_STATUS_OPTIONS = [
  { value: "active", label: "正常", disabled: false },
  { value: "suspended", label: "已暂停", disabled: false },
  { value: "trial", label: "试用中", disabled: true },
  { value: "expired", label: "已过期", disabled: true },
  { value: "provisioning", label: "开通中", disabled: true },
] as const;

export const TENANT_FORM_DEFAULTS: TenantFormValues = {
  name: "",
  slug: "",
  plan: "team",
  status: "active",
  expireAt: "",
  region: "华东-上海",
  ownerName: "",
  ownerEmail: "",
  seats: 20,
  allowCustomModels: false,
  allowByok: true,
  allowLocalModels: false,
  allowSharedModels: false,
};

/** 表单值 → 后端请求体：只提交后端真实存在的字段。 */
export function toCreateRequest(values: TenantFormValues): TenantCreateRequest {
  return {
    tenantCode: values.slug.trim(),
    tenantName: values.name.trim(),
    planCode: values.plan.trim(),
    // 后端更新跳过 null，想清空邮箱只能提交空串
    contactEmail: values.ownerEmail.trim(),
    status: values.status === "suspended" ? TENANT_STATUS_DISABLED : TENANT_STATUS_ENABLED,
    // datetime-local 到分钟，补秒后既是合法 LocalDateTime，也不带时区
    expireAt: values.expireAt ? `${values.expireAt.slice(0, 16)}:00` : null,
  };
}

/** 行数据 → 表单初始值（缺口字段没有值，用表单默认值兜底）。 */
export function toFormValues(tenant: TenantRow): TenantFormValues {
  return {
    name: tenant.tenantName ?? "",
    slug: tenant.tenantCode ?? "",
    plan: tenant.planCode ?? "team",
    status: isTenantEnabled(tenant.status) ? "active" : "suspended",
    expireAt: tenant.expireAt ? tenant.expireAt.slice(0, 16) : "",
    region: tenant.region ?? TENANT_FORM_DEFAULTS.region,
    ownerName: tenant.ownerName ?? "",
    ownerEmail: tenant.contactEmail ?? "",
    seats: tenant.seats ?? TENANT_FORM_DEFAULTS.seats,
    allowCustomModels: tenant.allowCustomModels ?? false,
    allowByok: tenant.allowByok ?? true,
    allowLocalModels: tenant.allowLocalModels ?? false,
    allowSharedModels: tenant.allowSharedModels ?? false,
  };
}

/**
 * 行数据 → 更新请求。
 *
 * 后端 `PUT`/`PATCH` 等价且都是整体替换（`TenantConverter.update` 把未传字段写成 null），
 * 所以这里必须补齐整行字段；若历史数据缺少必填项，返回 `null` 让调用方拒绝提交，
 * 而不是发一个必然 400 的请求。
 */
export function toUpdateRequest(tenant: TenantRow): TenantCreateRequest | null {
  if (!tenant.tenantCode?.trim() || !tenant.tenantName?.trim() || !tenant.planCode?.trim()) {
    return null;
  }
  return {
    tenantCode: tenant.tenantCode,
    tenantName: tenant.tenantName,
    planCode: tenant.planCode,
    contactEmail: tenant.contactEmail ?? "",
    status: tenant.status ?? TENANT_STATUS_ENABLED,
    expireAt: tenant.expireAt,
  };
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * 导出已经取到的租户行（后端没有导出接口，所以只导出调用方传进来的数据）。
 * 带 BOM，Excel 打开不乱码。
 */
export function exportTenantsCsv(rows: TenantRow[], filename?: string): void {
  const header = [
    "租户ID",
    "租户编码",
    "租户名称",
    "套餐",
    "状态",
    "联系邮箱",
    "到期时间",
    "创建时间",
  ];
  const body = rows.map((row) => [
    row.id,
    row.tenantCode ?? "",
    row.tenantName ?? "",
    row.planCode ?? "",
    getStatusMeta(tenantRowStatus(row)).label,
    row.contactEmail ?? "",
    row.expireAt ?? "",
    row.createdAt ?? "",
  ]);
  const csv = [header, ...body].map((cells) => cells.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `tenants-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
