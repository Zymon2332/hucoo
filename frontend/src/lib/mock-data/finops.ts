import type {
  BillingPlan,
  BudgetAlert,
  CostCenter,
  Invoice,
  UsageRecord,
  UsageSummary,
} from "@/types";
import { createRandom, daysAgo, pickOne, randomFloat, randomInt } from "./seed";
import { tenants } from "./tenants";
import { users } from "./users";
import { platformModels } from "./models";
import { tools } from "./capability";

export const billingPlans: BillingPlan[] = [
  {
    id: "plan-01",
    name: "免费版",
    code: "free",
    pricePerSeat: 0,
    includedTokens: 2_000_000,
    includedCalls: 20_000,
    overagePricePer1kTokens: 0.09,
    concurrency: 5,
    sla: "无 SLA 保障",
    features: ["1 个租户", "最多 5 名成员", "平台模型只读", "社区支持", "7 天数据保留"],
    tenantCount: 86,
  },
  {
    id: "plan-02",
    name: "团队版",
    code: "team",
    pricePerSeat: 199,
    includedTokens: 20_000_000,
    includedCalls: 200_000,
    overagePricePer1kTokens: 0.072,
    concurrency: 20,
    sla: "99.5% 可用性（月度）",
    features: ["最多 50 名成员", "自定义模型（需审核）", "工具市场访问", "工单支持", "90 天数据保留"],
    tenantCount: 214,
  },
  {
    id: "plan-03",
    name: "商业版",
    code: "business",
    pricePerSeat: 599,
    includedTokens: 200_000_000,
    includedCalls: 1_500_000,
    overagePricePer1kTokens: 0.06,
    concurrency: 80,
    sla: "99.9% 可用性（月度）",
    features: [
      "最多 500 名成员",
      "BYOK 密钥托管",
      "沙箱与网络策略",
      "SSO 单点登录",
      "1 年数据保留",
      "专属客户成功经理",
    ],
    tenantCount: 132,
  },
  {
    id: "plan-04",
    name: "企业版",
    code: "enterprise",
    pricePerSeat: 1_299,
    includedTokens: 1_200_000_000,
    includedCalls: 8_000_000,
    overagePricePer1kTokens: 0.048,
    concurrency: 300,
    sla: "99.95% 可用性 + 赔付条款",
    features: [
      "成员数不限",
      "本地模型与私有化部署",
      "专属推理集群",
      "等保 / SOC2 证据包",
      "审计日志长期留存",
      "7×24 值班支持",
      "季度架构评审",
    ],
    tenantCount: 38,
  },
];

const AGENT_NAMES = ["编码助手", "审查助手", "客服问答", "数据分析", "运维自愈", "文档生成"];
const TOOL_NAMES = tools.slice(0, 10).map((tool) => tool.code);

export const usageRecords: UsageRecord[] = Array.from({ length: 48 }).map((_, index) => {
  const random = createRandom(31_000 + index * 41);
  const tenant = tenants[randomInt(random, 0, tenants.length - 1)];
  const tenantUsers = users.filter((user) => user.tenantId === tenant?.id);
  const user = tenantUsers.length > 0 ? tenantUsers[randomInt(random, 0, tenantUsers.length - 1)] : users[0];
  const model = pickOne(random, platformModels);
  const calls = randomInt(random, 200, 2_600_000);
  const inputTokens = Math.round(calls * randomFloat(random, 620, 1_400, 0));
  const outputTokens = Math.round(calls * randomFloat(random, 120, 420, 0));
  const tokens = inputTokens + outputTokens;
  return {
    id: `ur-${String(index + 1).padStart(4, "0")}`,
    date: daysAgo(randomInt(random, 0, 29), randomInt(random, 0, 23)).slice(0, 10),
    tenantId: tenant?.id ?? "tn-01",
    tenantName: tenant?.name ?? "—",
    userId: user?.id ?? "usr-01",
    userName: user?.name ?? "—",
    projectName: pickOne(random, ["Agent 门户前端", "模型网关服务", "智能客服工作台", "数仓 ETL", "路径规划", "理赔识别"]),
    agentName: pickOne(random, AGENT_NAMES),
    modelName: model?.name ?? "gpt-4.1",
    toolName: pickOne(random, TOOL_NAMES),
    calls,
    inputTokens,
    outputTokens,
    cost: Number(((tokens / 1000) * randomFloat(random, 0.012, 0.024, 4)).toFixed(2)),
    currency: "CNY",
  };
});

export const usageSummaries: UsageSummary[] = tenants.map((tenant, index) => {
  const random = createRandom(32_000 + index * 17);
  const calls = tenant.monthlyCalls;
  const cost = tenant.monthlyCost;
  const ratio = randomFloat(random, 0.82, 1.32);
  return {
    period: "2026-09",
    calls,
    inputTokens: Math.round(tenant.monthlyTokens * 0.78),
    outputTokens: Math.round(tenant.monthlyTokens * 0.22),
    cost,
    concurrencyPeak: randomInt(random, 4, Math.max(8, tenant.quota.concurrency.limit)),
    storageGb: tenant.quota.storage.used,
    previousCalls: Math.round(calls / ratio),
    previousCost: Number((cost / ratio).toFixed(2)),
  };
});

const INVOICE_SEEDS: [number, Invoice["status"], Invoice["method"]][] = [
  [0, "paid", "invoice"],
  [1, "paid", "wire"],
  [2, "issued", "invoice"],
  [3, "overdue", "invoice"],
  [4, "paid", "alipay"],
  [5, "draft", "invoice"],
  [6, "void", "invoice"],
  [7, "paid", "card"],
  [8, "issued", "balance"],
  [0, "paid", "wire"],
  [2, "overdue", "invoice"],
  [9, "paid", "invoice"],
  [10, "issued", "alipay"],
  [11, "draft", "invoice"],
  [1, "paid", "wire"],
  [4, "void", "card"],
];

export const invoices: Invoice[] = INVOICE_SEEDS.map(([tenantIndex, status, method], index) => {
  const random = createRandom(33_000 + index * 13);
  const tenant = tenants[tenantIndex];
  const plan = pickOne(random, billingPlans);
  const month = index % 2 === 0 ? "08" : "07";
  const periodStart = `2026-${month}-01`;
  const periodEnd = `2026-${month}-${month === "08" ? "31" : "31"}`;
  const seats = randomInt(random, 8, 420);
  const platformFee = seats * plan.pricePerSeat;
  const modelFees = randomInt(random, 3_200, 268_000);
  const byokFee = random() > 0.5 ? randomInt(random, 800, 12_800) : 0;
  const tax = Number(((platformFee + modelFees + byokFee) * 0.06).toFixed(2));
  const total = Number((platformFee + modelFees + byokFee + tax).toFixed(2));
  const issuedAt = daysAgo(index * 3 + 2, 10, 0);
  return {
    id: `inv-${String(index + 1).padStart(2, "0")}`,
    number: `INV-2026-${month}-${String(index + 1).padStart(4, "0")}`,
    tenantName: tenant?.name ?? "—",
    planName: plan.name,
    periodStart,
    periodEnd,
    seats,
    platformFee,
    modelFees,
    byokFee,
    tax,
    total,
    currency: "CNY",
    status,
    method,
    issuedAt,
    dueAt: new Date(Date.parse(issuedAt) + 30 * 86_400_000).toISOString(),
    paidAt: status === "paid" ? new Date(Date.parse(issuedAt) + randomInt(random, 3, 25) * 86_400_000).toISOString() : null,
  };
});

const DEPARTMENTS = [
  "智能引擎事业部",
  "风控平台部",
  "供应链技术部",
  "信息中心",
  "算法部",
  "数字化部",
  "金融科技部",
  "科技部",
  "产品部",
  "数据智能组",
  "运维中心",
  "合规部",
];

export const costCenters: CostCenter[] = DEPARTMENTS.map((department, index) => {
  const random = createRandom(34_000 + index * 29);
  const tenant = tenants[randomInt(random, 0, tenants.length - 1)];
  const budget = randomInt(random, 2, 40) * 10_000;
  const spent = Math.round(budget * randomFloat(random, 0.42, 1.18));
  const forecast = Math.round(budget * randomFloat(random, 0.9, 1.26));
  const variance = Number((((forecast - budget) / budget) * 100).toFixed(1));
  return {
    id: `cc-${String(index + 1).padStart(2, "0")}`,
    name: `${department}成本中心`,
    tenantName: tenant?.name ?? "—",
    department,
    owner: pickOne(random, ["汤鹏", "钟怡", "赵敏", "马骏", "孙倩", "周越"]),
    budgetMonthly: budget,
    spentMonthly: spent,
    forecast,
    variance,
    status: variance > 5 ? "over-budget" : variance > 0 ? "warning" : "on-track",
    topModels: [platformModels[randomInt(random, 0, 5)]?.name ?? "gpt-4.1", platformModels[randomInt(random, 6, 12)]?.name ?? "qwen3-72b"],
    updatedAt: daysAgo(randomInt(random, 0, 7), randomInt(random, 9, 19)),
  };
});

export const budgetAlerts: BudgetAlert[] = Array.from({ length: 10 }).map((_, index) => {
  const random = createRandom(35_000 + index * 19);
  const center = costCenters[index % costCenters.length];
  const budget = center?.budgetMonthly ?? 100_000;
  const percent = randomInt(random, 42, 118);
  const threshold = pickOne(random, [80, 90, 100]);
  return {
    id: `ba-${String(index + 1).padStart(2, "0")}`,
    scope: pickOne(random, ["租户", "项目", "成本中心"]),
    scopeName: center?.name ?? "平台默认",
    period: "2026-09",
    budget,
    spent: Math.round((budget * percent) / 100),
    percent,
    threshold,
    status: percent > 100 ? "exceeded" : percent > threshold ? "warning" : "normal",
    notifyChannels: pickOne(random, [
      ["邮件", "飞书"],
      ["邮件", "Webhook"],
      ["Slack", "邮件"],
      ["飞书"],
    ]) as string[],
  };
});

export const costSimulationModels: { model: string; share: number; inputPrice: number; outputPrice: number }[] = [
  { model: "gpt-4.1", share: 0.18, inputPrice: 14, outputPrice: 56 },
  { model: "claude-sonnet-4.5", share: 0.22, inputPrice: 21, outputPrice: 105 },
  { model: "qwen3-235b-a22b", share: 0.28, inputPrice: 2.4, outputPrice: 9.6 },
  { model: "deepseek-v3.2", share: 0.2, inputPrice: 1, outputPrice: 4 },
  { model: "llama-4-70b", share: 0.12, inputPrice: 0.35, outputPrice: 1.4 },
];
