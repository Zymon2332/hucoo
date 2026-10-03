import type { ID, RiskLevel, TimeSeriesPoint } from "./common";
import type { AuditLog } from "./identity";

export type AlertType =
  | "cost"
  | "error"
  | "permission-change"
  | "model-unavailable"
  | "security"
  | "quota"
  | "latency";

export interface Alert {
  id: ID;
  title: string;
  type: AlertType;
  severity: RiskLevel;
  status: "firing" | "acknowledged" | "resolved" | "silenced";
  source: string;
  tenantName: string;
  value: string;
  threshold: string;
  triggeredAt: string;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  channels: string[];
  description: string;
  runbook: string;
}

export interface AlertRule {
  id: ID;
  name: string;
  type: AlertType;
  condition: string;
  threshold: string;
  window: string;
  severity: RiskLevel;
  channels: string[];
  enabled: boolean;
  owner: string;
  lastTriggeredAt: string | null;
  description: string;
}

export interface NotificationChannel {
  id: ID;
  name: string;
  type: "email" | "slack" | "feishu" | "dingtalk" | "webhook" | "sms";
  target: string;
  status: "verified" | "pending" | "error";
  enabled: boolean;
  subscribedEvents: string[];
  updatedAt: string;
}

export interface Integration {
  id: ID;
  name: string;
  provider: string;
  category: "git" | "im" | "project" | "cicd" | "observability" | "oauth";
  status: "connected" | "disconnected" | "error" | "pending";
  scopes: string[];
  installedBy: string;
  installedAt: string;
  lastSyncAt: string;
  webhookUrl: string;
  events: string[];
  version: string;
}

export interface WebhookEndpoint {
  id: ID;
  name: string;
  url: string;
  events: string[];
  secretPrefix: string;
  status: "active" | "paused" | "failing";
  successRate: number;
  lastDeliveryAt: string;
  createdAt: string;
}

export interface ExperimentVariant {
  id: ID;
  name: string;
  weight: number;
  metric: number;
  conversions: number;
}

export interface Experiment {
  id: ID;
  key: string;
  name: string;
  type: "feature-flag" | "ab-test" | "rolling-release" | "shadow";
  status: "running" | "paused" | "completed" | "draft" | "rolled-back";
  trafficPercent: number;
  audience: string;
  targetModel: string;
  metric: string;
  confidence: number;
  lift: number;
  variants: ExperimentVariant[];
  owner: string;
  startedAt: string;
  endedAt: string | null;
  description: string;
}

export interface ReleaseRecord {
  id: ID;
  version: string;
  environment: "dev" | "staging" | "production";
  status: "success" | "failed" | "rolling-back" | "in-progress";
  strategy: "canary" | "blue-green" | "rolling";
  deployedBy: string;
  deployedAt: string;
  durationMinutes: number;
  rollbackAvailable: boolean;
  notes: string;
}

export interface Setting {
  id: ID;
  group: string;
  key: string;
  label: string;
  description: string;
  type: "boolean" | "string" | "number" | "select";
  value: string | number | boolean;
  options: string[];
  scope: "platform" | "tenant" | "project";
  updatedAt: string;
  updatedBy: string;
}

export interface DlpRule {
  id: ID;
  name: string;
  pattern: string;
  category: "pii" | "credential" | "financial" | "source-code" | "custom";
  action: "block" | "mask" | "warn" | "log";
  scope: string;
  enabled: boolean;
  hitCount: number;
  updatedAt: string;
}

export interface KmsKey {
  id: ID;
  name: string;
  provider: "kms" | "vault" | "local-hsm";
  algorithm: string;
  rotationDays: number;
  lastRotatedAt: string;
  status: "active" | "rotating" | "disabled";
  custodian: string;
  usageCount: number;
}

export interface IpAllowlistEntry {
  id: ID;
  cidr: string;
  label: string;
  scope: string;
  effect: "allow" | "deny";
  expiresAt: string | null;
  addedBy: string;
  createdAt: string;
}

export interface ContentFilterRule {
  id: ID;
  name: string;
  stage: "input" | "output" | "both";
  category: "prompt-injection" | "jailbreak" | "pii" | "illegal" | "toxicity" | "custom";
  action: "block" | "mask" | "flag";
  severity: RiskLevel;
  hitCount: number;
  enabled: boolean;
  updatedAt: string;
}

export interface ComplianceItem {
  id: ID;
  framework: "SOC2" | "GDPR" | "ISO27001" | "等保2.0" | "PCI-DSS";
  control: string;
  status: "compliant" | "partial" | "non-compliant" | "not-applicable";
  owner: string;
  evidence: string;
  dueAt: string;
  lastCheckedAt: string;
}

export interface DataRetentionPolicy {
  id: ID;
  dataType: string;
  retentionDays: number;
  deletionMode: "auto-delete" | "anonymize" | "archive" | "manual";
  exportEnabled: boolean;
  jurisdiction: string;
  updatedAt: string;
}

export interface MonitoringMetrics {
  qps: number;
  errorRate: number;
  p95: number;
  p99: number;
  toolFailureRate: number;
  modelAvailability: number;
  activeSessions: number;
  queueDepth: number;
}

export interface TraceSpan {
  id: ID;
  traceId: string;
  span: string;
  service: string;
  status: "ok" | "error" | "slow";
  durationMs: number;
  startedAt: string;
  model: string;
  tokens: number;
}

export interface ServiceStatus {
  id: ID;
  name: string;
  category: "gateway" | "model" | "tool" | "mcp" | "storage" | "auth";
  status: "operational" | "degraded" | "outage" | "maintenance";
  uptime30d: number;
  latencyP95: number;
  errorRate: number;
  slaTarget: number;
  lastIncidentAt: string | null;
}

export interface SystemLogEntry {
  id: ID;
  at: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  channel: "system" | "audit" | "model" | "tool" | "mcp" | "sandbox";
  service: string;
  message: string;
  traceId: string;
  tenantName: string;
}

export interface DashboardMetrics {
  tenants: number;
  tenantsDelta: number;
  users: number;
  usersDelta: number;
  activeAgents: number;
  agentsDelta: number;
  callsToday: number;
  callsDelta: number;
  tokensToday: number;
  tokensDelta: number;
  costToday: number;
  costDelta: number;
  successRate: number;
  successRateDelta: number;
  p95Latency: number;
  p95Delta: number;
}

export interface PendingApprovalSummary {
  id: ID;
  title: string;
  applicant: string;
  riskLevel: RiskLevel;
  submittedAt: string;
  type: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  series: TimeSeriesPoint[];
  modelDistribution: { name: string; value: number; tokens: number }[];
  toolShare: { name: string; value: number }[];
  alerts: Alert[];
  approvals: PendingApprovalSummary[];
  auditLogs: AuditLog[];
}
