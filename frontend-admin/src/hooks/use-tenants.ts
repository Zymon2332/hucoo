"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { tenantApi } from "@/lib/api/tenants";
import type {
  TenantCreateRequest,
  TenantDTO,
  TenantOverviewDTO,
  TenantPageParams,
  TenantStatistics,
} from "@/types/tenant";
import type { ApiPage } from "@/types/api";

/** 查询键按「资源 + 参数」组织，写操作统一失效 `tenantKeys.all`。 */
export const tenantKeys = {
  all: ["tenants"] as const,
  page: (params: TenantPageParams) => [...tenantKeys.all, "page", params] as const,
  detail: (id: string) => [...tenantKeys.all, "detail", id] as const,
  overview: (id: string) => [...tenantKeys.all, "overview", id] as const,
  statistics: () => [...tenantKeys.all, "statistics"] as const,
};

/** 分页列表；翻页时保留上一页数据，避免表格闪空。 */
export function useTenantPage(params: TenantPageParams) {
  return useQuery<ApiPage<TenantDTO>, Error>({
    queryKey: tenantKeys.page(params),
    queryFn: () => tenantApi.page(params),
    placeholderData: keepPreviousData,
  });
}

export function useTenantDetail(
  id: string | undefined,
  options?: Pick<UseQueryOptions<TenantDTO, Error>, "enabled">,
) {
  return useQuery<TenantDTO, Error>({
    queryKey: tenantKeys.detail(id ?? ""),
    queryFn: () => tenantApi.detail(id!),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

/** 概览计数：只在需要时拉取（列表页抽屉 / 详情页）。 */
export function useTenantOverview(id: string | undefined, enabled = true) {
  return useQuery<TenantOverviewDTO, Error>({
    queryKey: tenantKeys.overview(id ?? ""),
    queryFn: () => tenantApi.overview(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useTenantStatistics() {
  return useQuery<TenantStatistics, Error>({
    queryKey: tenantKeys.statistics(),
    queryFn: () => tenantApi.statistics(),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation<TenantDTO, Error, TenantCreateRequest>({
    mutationFn: (payload) => tenantApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}

export interface UpdateTenantInput {
  id: string;
  payload: TenantCreateRequest;
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation<TenantDTO, Error, UpdateTenantInput>({
    mutationFn: ({ id, payload }) => tenantApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: (id) => tenantApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantKeys.all }),
  });
}
