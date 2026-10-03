"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { sleep } from "@/lib/utils";

export function useMockQuery<T>(
  queryKey: readonly unknown[],
  data: T,
  delay = 240,
): UseQueryResult<T, Error> {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      await sleep(delay);
      return data;
    },
  });
}

export function useMockComputedQuery<T>(
  queryKey: readonly unknown[],
  factory: () => T,
  delay = 240,
): UseQueryResult<T, Error> {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      await sleep(delay);
      return factory();
    },
  });
}
