import type { ID, RiskLevel } from "./common";

export type ModelCapability =
  | "chat"
  | "reasoning"
  | "vision"
  | "audio"
  | "embedding"
  | "rerank"
  | "tool-calling"
  | "json-mode"
  | "long-context";

export interface ModelProvider {
  id: ID;
  name: string;
  code: string;
  type: "platform" | "open-source" | "local" | "gateway";
  baseUrl: string;
  region: string;
  status: "healthy" | "degraded" | "down" | "maintenance";
  apiKeyManaged: boolean;
  rateLimit: string;
  priceMultiplier: number;
  modelCount: number;
  latencyP95: number;
  errorRate: number;
  lastCheckedAt: string;
}

export interface PlatformModel {
  id: ID;
  name: string;
  displayName: string;
  providerId: ID;
  providerName: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;
  outputPrice: number;
  currency: string;
  status: "online" | "offline" | "beta" | "deprecated";
  visibility: "public" | "tenant" | "private";
  rateLimit: string;
  tags: string[];
  description: string;
  updatedAt: string;
}

export type CustomModelAccessType = "byok" | "custom-endpoint" | "local" | "gateway";

export type CustomModelStatus =
  "pending-review" | "validating" | "approved" | "rejected" | "disabled" | "expired";

export interface ModelValidationCheck {
  key:
    | "connection"
    | "streaming"
    | "timeout"
    | "concurrency"
    | "tool-calling"
    | "json-mode"
    | "token-usage"
    | "context-length"
    | "multimodal";
  label: string;
  status: "passed" | "failed" | "skipped" | "running";
  detail: string;
  durationMs: number;
}

export interface ModelValidationRun {
  id: ID;
  customModelId: ID;
  modelName: string;
  tenantName: string;
  runner: string;
  status: "passed" | "failed" | "running" | "queued";
  startedAt: string;
  durationMs: number;
  failureReason: string | null;
  checks: ModelValidationCheck[];
}

export interface CustomModel {
  id: ID;
  name: string;
  modelId: string;
  tenantId: ID;
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  accessType: CustomModelAccessType;
  endpoint: string;
  keyFingerprint: string;
  egressDomains: string[];
  dataFlow: "in-region" | "domestic" | "overseas" | "unknown";
  fallbackModel: string;
  costOwner: "tenant" | "platform" | "shared";
  region: string;
  riskLevel: RiskLevel;
  status: CustomModelStatus;
  validationPassed: number;
  validationFailed: number;
  lastValidatedAt: string;
  expiresAt: string;
  updatedAt: string;
  notes: string;
}

export interface ModelKey {
  id: ID;
  name: string;
  provider: string;
  owner: string;
  ownerType: "user" | "service-account" | "tenant";
  tenantName: string;
  fingerprint: string;
  algorithm: string;
  custodian: string;
  kmsRef: string;
  status: "active" | "rotating" | "revoked" | "expiring" | "leaked";
  createdAt: string;
  rotatedAt: string;
  expiresAt: string;
  lastUsedAt: string;
}

export interface RoutingRule {
  id: ID;
  name: string;
  scope: string;
  priority: number;
  matchTask: string;
  matchTenantTier: string;
  strategy: "cost" | "latency" | "availability" | "quality" | "round-robin";
  primaryModel: string;
  fallbackModels: string[];
  degradeToPlatform: boolean;
  costOwnerOnFallback: "tenant" | "platform" | "shared";
  status: "enabled" | "disabled" | "draft";
  hitRate: number;
  updatedAt: string;
}

export interface ProviderRoute {
  id: ID;
  providerName: string;
  region: string;
  weight: number;
  maxConcurrency: number;
  timeoutMs: number;
  retries: number;
  status: "enabled" | "disabled";
}

/** 单次模型调用的最终状态 */
export type ModelCallStatus = "success" | "failed" | "timeout" | "rate-limited" | "blocked";

/** 调用发起入口 */
export type ModelCallSource = "agent" | "playground" | "api" | "workflow" | "batch";

export type ModelCallFeedback = "up" | "down";

/** 一次平台模型调用的明细记录（用于用户模型使用记录查询） */
export interface ModelCallRecord {
  id: ID;
  requestId: string;
  traceId: string;
  at: string;
  tenantId: ID;
  tenantName: string;
  userId: ID;
  userName: string;
  userEmail: string;
  orgName: string;
  projectName: string;
  agentName: string;
  source: ModelCallSource;
  credentialName: string;
  clientIp: string;
  userAgent: string;
  modelId: ID;
  modelName: string;
  modelDisplayName: string;
  providerName: string;
  providerType: ModelProvider["type"];
  region: string;
  routeStrategy: RoutingRule["strategy"] | "direct";
  fallbackUsed: boolean;
  requestedModel: string;
  status: ModelCallStatus;
  httpStatus: number;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number;
  firstTokenMs: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  toolCalls: number;
  streaming: boolean;
  retryCount: number;
  safetyFlags: string[];
  feedback: ModelCallFeedback | null;
  cost: number;
  currency: string;
}
