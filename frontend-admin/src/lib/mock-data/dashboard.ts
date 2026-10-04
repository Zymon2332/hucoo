import type { DashboardData, DashboardMetrics, DistributionSlice, PendingApprovalSummary } from "@/types";
import { buildSeries, createRandom, randomFloat, randomInt } from "./seed";
import { approvals } from "./approvals";
import { alerts } from "./ops";
import { auditLogs } from "./audit";
import { platformModels } from "./models";

export const dashboardMetrics: DashboardMetrics = {
  tenants: 470,
  tenantsDelta: 3.2,
  users: 12_486,
  usersDelta: 5.8,
  activeAgents: 2_184,
  agentsDelta: 12.4,
  callsToday: 3_842_600,
  callsDelta: 8.6,
  tokensToday: 682_400_000,
  tokensDelta: -2.4,
  costToday: 12_486.32,
  costDelta: -6.8,
  successRate: 99.42,
  successRateDelta: 0.6,
  p95Latency: 1_184,
  p95Delta: -4.2,
};

export const dashboardSeries = buildSeries(30, 81_000);

const MODEL_MIX = ["gpt-4.1", "claude-sonnet-4.5", "qwen3-235b-a22b", "deepseek-v3.2", "gemini-2.5-pro", "llama-4-70b"];

export const modelDistribution: (DistributionSlice & { tokens: number })[] = MODEL_MIX.map((name, index) => {
  const random = createRandom(82_000 + index * 17);
  const model = platformModels.find((item) => item.name === name);
  const value = randomInt(random, 120_000, 980_000);
  return {
    name: model?.displayName ?? name,
    value,
    tokens: value * randomInt(random, 1_800, 3_600),
  };
});

export const toolShare: DistributionSlice[] = [
  { name: "fs.read", value: 1_284_600 },
  { name: "code.search", value: 842_300 },
  { name: "fs.write", value: 512_400 },
  { name: "terminal.execute", value: 386_200 },
  { name: "http.request", value: 268_900 },
  { name: "git.operations", value: 142_600 },
  { name: "browser.navigate", value: 96_400 },
  { name: "其他", value: 84_200 },
];

export const dashboardPendingApprovals: PendingApprovalSummary[] = approvals
  .filter((approval) => approval.status === "pending")
  .slice(0, 6)
  .map((approval) => ({
    id: approval.id,
    title: approval.title,
    applicant: approval.applicant,
    riskLevel: approval.riskLevel,
    submittedAt: approval.submittedAt,
    type: approval.type,
  }));

export const dashboardAlerts = alerts.filter((alert) => alert.status === "firing").slice(0, 6);

export const dashboardAuditLogs = auditLogs.slice(0, 8);

export const tenantGrowth = Array.from({ length: 12 }).map((_, index) => {
  const random = createRandom(83_000 + index * 13);
  return {
    month: `${index + 1} 月`,
    tenants: 280 + index * 16 + randomInt(random, 0, 24),
    users: 6_800 + index * 480 + randomInt(random, 0, 620),
  };
});

export const costBreakdown = [
  { name: "平台模型费", value: 486_200 },
  { name: "自定义模型费", value: 268_400 },
  { name: "BYOK 管理费", value: 42_600 },
  { name: "沙箱与存储", value: 68_200 },
];

export const quotaForecast = {
  consumedPercent: 68.4,
  forecastPercent: 96.2,
  daysLeft: 12,
  projectedOverage: 42_800,
};

export const dashboardData: DashboardData = {
  metrics: dashboardMetrics,
  series: dashboardSeries,
  modelDistribution: modelDistribution.map((item) => ({ name: item.name, value: item.value, tokens: item.tokens })),
  toolShare,
  alerts: dashboardAlerts,
  approvals: dashboardPendingApprovals,
  auditLogs: dashboardAuditLogs,
};

export const platformHealthScore = {
  score: 92,
  grade: "A",
  dimensions: [
    { name: "可用性", score: 96 },
    { name: "安全性", score: 88 },
    { name: "性能", score: 91 },
    { name: "成本效率", score: 86 },
    { name: "合规", score: 82 },
    { name: "体验", score: 94 },
  ],
  updatedAt: `${new Date("2026-09-17T09:00:00+08:00").toISOString()}`,
  deltaPercent: randomFloat(createRandom(84_000), 1.2, 6.8),
};
