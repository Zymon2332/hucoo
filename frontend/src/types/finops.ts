import type { ID } from "./common";

export interface UsageRecord {
  id: ID;
  date: string;
  tenantId: ID;
  tenantName: string;
  userId: ID;
  userName: string;
  projectName: string;
  agentName: string;
  modelName: string;
  toolName: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  currency: string;
}

export interface UsageSummary {
  period: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  concurrencyPeak: number;
  storageGb: number;
  previousCalls: number;
  previousCost: number;
}

export interface BillingPlan {
  id: ID;
  name: string;
  code: "free" | "team" | "business" | "enterprise";
  pricePerSeat: number;
  includedTokens: number;
  includedCalls: number;
  overagePricePer1kTokens: number;
  concurrency: number;
  sla: string;
  features: string[];
  tenantCount: number;
}

export interface Invoice {
  id: ID;
  number: string;
  tenantName: string;
  planName: string;
  periodStart: string;
  periodEnd: string;
  seats: number;
  platformFee: number;
  modelFees: number;
  byokFee: number;
  tax: number;
  total: number;
  currency: string;
  status: "paid" | "issued" | "overdue" | "void" | "draft";
  method: "invoice" | "card" | "wire" | "alipay" | "balance";
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
}

export interface CostCenter {
  id: ID;
  name: string;
  tenantName: string;
  department: string;
  owner: string;
  budgetMonthly: number;
  spentMonthly: number;
  forecast: number;
  variance: number;
  status: "on-track" | "warning" | "over-budget";
  topModels: string[];
  updatedAt: string;
}

export interface BudgetAlert {
  id: ID;
  scope: string;
  scopeName: string;
  period: string;
  budget: number;
  spent: number;
  percent: number;
  threshold: number;
  status: "normal" | "warning" | "exceeded";
  notifyChannels: string[];
}

export interface CostSimulation {
  monthlyCalls: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  modelMix: { model: string; share: number; inputPrice: number; outputPrice: number }[];
  platformFee: number;
  byokManagementFee: number;
}
