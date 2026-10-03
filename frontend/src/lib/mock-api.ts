import { sleep } from "@/lib/utils";

export interface MockListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  filters?: Record<string, string>;
  sort?: { key: string; direction: "asc" | "desc" };
}

export interface MockListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function matchesKeyword(item: unknown, keyword: string) {
  if (!keyword) return true;
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  return JSON.stringify(item).toLowerCase().includes(needle);
}

function matchesFilters(item: Record<string, unknown>, filters?: Record<string, string>) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, value]) => {
    if (!value || value === "all") return true;
    const actual = item[key];
    if (Array.isArray(actual)) return actual.includes(value);
    return String(actual) === value;
  });
}

function sortItems<T>(items: T[], sort?: MockListParams["sort"]) {
  if (!sort) return items;
  const { key, direction } = sort;
  const factor = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = (a as Record<string, unknown>)[key];
    const right = (b as Record<string, unknown>)[key];
    if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
    return String(left ?? "").localeCompare(String(right ?? ""), "zh-CN") * factor;
  });
}

export async function mockList<T>(
  source: T[],
  params: MockListParams = {},
): Promise<MockListResult<T>> {
  const { page = 1, pageSize = 10, keyword = "", filters, sort } = params;
  await sleep(180);

  const filtered = source
    .filter((item) => matchesKeyword(item, keyword))
    .filter((item) => matchesFilters(item as Record<string, unknown>, filters));
  const sorted = sortItems(filtered, sort);
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
  };
}

export async function mockGet<T>(source: T[], id: string, idKey = "id"): Promise<T | undefined> {
  await sleep(160);
  return source.find((item) => String((item as Record<string, unknown>)[idKey]) === id);
}

export async function mockAction(message: string, delay = 420): Promise<{ ok: true; message: string }> {
  await sleep(delay);
  return { ok: true, message };
}

export async function mockDelete<T>(source: T[], id: string, idKey = "id"): Promise<T[]> {
  await sleep(360);
  return source.filter((item) => String((item as Record<string, unknown>)[idKey]) !== id);
}
