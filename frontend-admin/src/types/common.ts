export type ID = string;

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral" | "processing";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  hint?: string;
}

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TimeSeriesPoint {
  date: string;
  calls: number;
  tokens: number;
  cost: number;
  successRate: number;
  p95: number;
}

export interface DistributionSlice {
  name: string;
  value: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface FeatureFlags {
  allowCustomModels: boolean;
  allowByok: boolean;
  allowLocalModels: boolean;
  allowSharedModels: boolean;
}

export interface QuotaBucket {
  used: number;
  limit: number;
  unit: string;
}

export interface QuotaSnapshot {
  tokens: QuotaBucket;
  calls: QuotaBucket;
  storage: QuotaBucket;
  concurrency: QuotaBucket;
  cost: QuotaBucket;
}
