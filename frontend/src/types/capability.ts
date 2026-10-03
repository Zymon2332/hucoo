import type { ID, RiskLevel } from "./common";

export type ToolCategory =
  | "file"
  | "terminal"
  | "search"
  | "git"
  | "browser"
  | "http"
  | "database"
  | "custom";

export interface Tool {
  id: ID;
  name: string;
  code: string;
  category: ToolCategory;
  description: string;
  riskLevel: RiskLevel;
  status: "enabled" | "disabled" | "pending-review" | "rejected";
  source: "builtin" | "custom" | "marketplace" | "openapi";
  version: string;
  author: string;
  installs: number;
  rating: number;
  reviewCount: number;
  requiresApproval: boolean;
  parameterSchema: string;
  scopes: string[];
  updatedAt: string;
}

export interface CommandPolicy {
  id: ID;
  pattern: string;
  effect: "allow" | "deny" | "ask";
  scope: string;
  reason: string;
  updatedAt: string;
}

export interface MicroMcpServer {
  id: ID;
  name: string;
  endpoint: string;
  transport: "sse" | "streamable-http" | "stdio";
  authType: "none" | "api-key" | "oauth" | "mtls";
  version: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  toolCount: number;
  calls24h: number;
  errorRate: number;
  latencyP95: number;
  owner: string;
  allowedDomains: string[];
  egressLimited: boolean;
  lastSyncAt: string;
  tags: string[];
}

export type AgentTemplateCategory =
  | "coding"
  | "review"
  | "testing"
  | "ops"
  | "data"
  | "writing"
  | "support";

export interface AgentTemplate {
  id: ID;
  name: string;
  code: string;
  category: AgentTemplateCategory;
  description: string;
  systemPrompt: string;
  modelPolicy: string;
  toolWhitelist: string[];
  forbiddenModels: string[];
  forbiddenTools: string[];
  knowledgeBases: string[];
  version: string;
  status: "draft" | "in-review" | "published" | "gray" | "offline" | "rejected";
  visibility: "platform" | "market" | "tenant" | "private";
  installs: number;
  rating: number;
  reviews: number;
  publisher: string;
  grayPercent: number;
  changelog: string;
  updatedAt: string;
}

export interface MarketListing {
  id: ID;
  templateId: ID;
  name: string;
  category: AgentTemplateCategory;
  publisher: string;
  pricing: "free" | "paid" | "internal";
  price: number;
  installs: number;
  rating: number;
  reviews: number;
  trendScore: number;
  featured: boolean;
  chartRank: number | null;
  status: "listed" | "pending" | "removed";
  reports: number;
  updatedAt: string;
}

export interface Project {
  id: ID;
  name: string;
  code: string;
  tenantId: ID;
  tenantName: string;
  type: "frontend" | "backend" | "data" | "ops" | "research";
  status: "active" | "archived" | "paused" | "provisioning";
  repo: string;
  branchStrategy: string;
  envCount: number;
  memberCount: number;
  agentCount: number;
  budgetMonthly: number;
  spentMonthly: number;
  modelPolicy: string;
  toolPolicy: string;
  sensitiveFileProtection: boolean;
  ignoreRules: string;
  owner: string;
  workspaces: number;
  createdAt: string;
}

export interface Workspace {
  id: ID;
  name: string;
  projectId: ID;
  projectName: string;
  tenantName: string;
  image: string;
  cpu: string;
  memory: string;
  disk: string;
  gpu: string;
  status: "running" | "idle" | "stopped" | "error" | "provisioning";
  timeoutMinutes: number;
  idleRecycleMinutes: number;
  concurrencyLimit: number;
  region: string;
  owner: string;
  monthlyCost: number;
  createdAt: string;
}

export interface Sandbox {
  id: ID;
  name: string;
  projectName: string;
  tenantName: string;
  image: string;
  imageVersion: string;
  registry: string;
  status: "ready" | "scanning" | "vulnerable" | "deprecated" | "building";
  cpu: string;
  memory: string;
  disk: string;
  gpu: string;
  networkPolicy: "deny-all" | "allowlist" | "proxy-only" | "open";
  egressProxy: string;
  dnsControl: boolean;
  snapshotEnabled: boolean;
  prewarmDeps: boolean;
  vulnCritical: number;
  vulnHigh: number;
  complianceBaseline: string;
  lastScanAt: string;
  executions24h: number;
}

export interface NetworkPolicyEntry {
  id: ID;
  domain: string;
  direction: "egress" | "ingress";
  effect: "allow" | "deny" | "ask";
  cidr: string;
  note: string;
  updatedAt: string;
}

export interface PluginPackage {
  id: ID;
  name: string;
  version: string;
  publisher: string;
  signed: boolean;
  sbomAvailable: boolean;
  vulnerabilities: number;
  installs: number;
  status: "verified" | "unverified" | "blocked";
  updatedAt: string;
}
