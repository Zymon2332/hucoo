"use client";

import * as React from "react";
import { toast } from "sonner";
import { useUpdateTenant } from "@/hooks/use-tenants";
import { describeApiError } from "@/lib/api-client";
import { toUpdateRequest } from "@/lib/tenants";
import {
  TENANT_STATUS_DISABLED,
  TENANT_STATUS_ENABLED,
  isTenantEnabled,
  type TenantCreateRequest,
  type TenantDTO,
} from "@/types/tenant";

/**
 * 启用 / 停用租户。
 *
 * 后端没有单独的「改状态」接口，`PATCH` 与 `PUT` 一样是整体替换，
 * 所以这里始终用 {@link toUpdateRequest} 拼出完整请求体，避免把邮箱、到期时间等字段写丢。
 */
export function useToggleTenantStatus() {
  const updateTenant = useUpdateTenant();

  const toggle = React.useCallback(
    async (tenant: TenantDTO): Promise<boolean> => {
      const payload = toUpdateRequest(tenant);
      if (!payload) {
        toast.error("该租户缺少编码/名称/套餐等必填字段，无法通过接口更新");
        return false;
      }
      const nextStatus = isTenantEnabled(tenant.status)
        ? TENANT_STATUS_DISABLED
        : TENANT_STATUS_ENABLED;
      try {
        await updateTenant.mutateAsync({
          id: tenant.id,
          payload: { ...payload, status: nextStatus },
        });
        toast.success(
          nextStatus === TENANT_STATUS_DISABLED
            ? `已停用「${tenant.tenantName}」`
            : `已启用「${tenant.tenantName}」`,
        );
        return true;
      } catch (error) {
        toast.error(describeApiError(error));
        return false;
      }
    },
    [updateTenant],
  );

  return { toggle, pending: updateTenant.isPending };
}

export interface BulkStatusResult {
  succeeded: number;
  failed: number;
  /** 缺少必填字段、无法提交的行数 */
  skipped: number;
}

/** 批量启用 / 停用：逐条调用更新接口（后端没有批量接口）。 */
export function useBulkTenantStatus() {
  const updateTenant = useUpdateTenant();
  const [pending, setPending] = React.useState(false);

  const apply = React.useCallback(
    async (rows: TenantDTO[], nextStatus: number): Promise<BulkStatusResult> => {
      const requests = rows.map((row) => ({ row, payload: toUpdateRequest(row) }));
      const skipped = requests.filter((item) => item.payload === null).length;
      const runnable = requests.filter(
        (item): item is { row: TenantDTO; payload: TenantCreateRequest } => item.payload !== null,
      );

      if (runnable.length === 0) {
        toast.error("所选租户缺少必填字段，无法通过接口更新");
        return { succeeded: 0, failed: 0, skipped };
      }

      setPending(true);
      const results = await Promise.allSettled(
        runnable.map((item) =>
          updateTenant.mutateAsync({
            id: item.row.id,
            payload: { ...item.payload, status: nextStatus },
          }),
        ),
      );
      setPending(false);

      const failed = results.filter((result) => result.status === "rejected").length;
      const succeeded = results.length - failed;
      const actionLabel = nextStatus === TENANT_STATUS_DISABLED ? "停用" : "启用";
      const suffix = `${failed > 0 ? `，${failed} 个失败` : ""}${
        skipped > 0 ? `，${skipped} 个缺少必填字段被跳过` : ""
      }`;
      if (failed === 0 && skipped === 0) {
        toast.success(`已${actionLabel} ${succeeded} 个租户`);
      } else {
        toast.warning(`已${actionLabel} ${succeeded} 个租户${suffix}`);
      }
      return { succeeded, failed, skipped };
    },
    [updateTenant],
  );

  return { apply, pending };
}
