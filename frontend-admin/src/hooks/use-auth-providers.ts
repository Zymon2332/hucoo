"use client";

import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/lib/api/auth";
import type { AuthMethod, AuthProviderInfo } from "@/types/auth";

/** 可用认证方式（`GET /api/admin/v1/auth/providers`），后端返回全部枚举并标记 enabled。 */
export function useAuthProviders() {
  return useQuery({
    queryKey: ["auth", "providers"],
    queryFn: () => authApi.providers(),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

/**
 * 某个认证方式是否可用。
 *
 * 返回 `undefined` 表示尚未拿到结果（加载中或请求失败），调用方应降级为「不阻断但提示」。
 */
export function methodEnabled(
  providers: AuthProviderInfo[] | undefined,
  method: AuthMethod,
): boolean | undefined {
  if (!providers) return undefined;
  return providers.some((provider) => provider.method === method && provider.enabled);
}
