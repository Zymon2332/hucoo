import type { ModelCallRecord, ModelCallSource, ModelCallStatus, ModelProvider } from "@/types";
import { createRandom, hoursAgo, pickOne, randomFloat, randomInt } from "./seed";
import { tenants } from "./tenants";
import { users } from "./users";
import { customModels, modelKeys, modelProviders, platformModels, routingRules } from "./models";

/** 调用入口权重：Agent 与 OpenAPI 是主力，调试台与批量任务量级较小 */
const SOURCE_POOL: ModelCallSource[] = [
  "agent",
  "agent",
  "agent",
  "agent",
  "api",
  "api",
  "api",
  "playground",
  "workflow",
  "batch",
];

const STATUS_POOL: ModelCallStatus[] = [
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "success",
  "failed",
  "failed",
  "timeout",
  "rate-limited",
  "blocked",
];

const PROJECT_NAMES = [
  "Agent 门户前端",
  "模型网关服务",
  "智能客服工作台",
  "数仓 ETL",
  "路径规划",
  "理赔识别",
  "合同审查",
  "商品向量召回",
];

const AGENT_NAMES = [
  "编码助手",
  "审查助手",
  "客服问答",
  "数据分析",
  "运维自愈",
  "文档生成",
  "不涉及（直连）",
];

const USER_AGENTS = [
  "agent-sdk/1.8.2 (python)",
  "openai-node/4.68.0",
  "curl/8.4.0",
  "Portal/2.3.0 (web)",
  "sandbox-runner/0.9.1",
  "internal-gateway/2.1.0",
];

const SUCCESS_ERROR: Record<
  Exclude<ModelCallStatus, "success">,
  { http: number; code: string; message: string }
> = {
  failed: { http: 500, code: "upstream_error", message: "上游返回 500，已按路由策略重试后仍失败" },
  timeout: {
    http: 504,
    code: "gateway_timeout",
    message: "超过 60s 未返回首个完整响应，连接被网关中断",
  },
  "rate-limited": {
    http: 429,
    code: "rate_limit_exceeded",
    message: "供应商 RPM 限流触发，建议降低并发或切换路由",
  },
  blocked: {
    http: 403,
    code: "content_policy_blocked",
    message: "内容安全策略阻断，请求未送达模型",
  },
};

const SAFETY_FLAG_POOL = ["pii", "prompt-injection", "jailbreak", "illegal", "credential"] as const;

const priceByName = new Map(platformModels.map((model) => [model.name, model]));
const regionByProvider = new Map(
  modelProviders.map((provider) => [provider.name, provider.region]),
);
const providerTypeByName = new Map(
  modelProviders.map((provider) => [provider.name, provider.type]),
);

const CUSTOM_ACCESS_PROVIDER_TYPE: Record<string, ModelProvider["type"]> = {
  byok: "platform",
  "custom-endpoint": "platform",
  gateway: "gateway",
  local: "local",
};

function resolvePrice(name: string) {
  const model = priceByName.get(name);
  if (model) return { input: model.inputPrice, output: model.outputPrice };
  return { input: 1.2, output: 4.8 };
}

function priceOfCustom(fallbackModel: string) {
  return resolvePrice(fallbackModel);
}

function buildModelCallRecord(index: number): ModelCallRecord {
  const random = createRandom(50_000 + index * 37);
  const tenant = tenants[randomInt(random, 0, tenants.length - 1)] ?? tenants[0];
  const tenantUsers = users.filter((user) => user.tenantId === tenant?.id);
  const user =
    tenantUsers.length > 0
      ? tenantUsers[randomInt(random, 0, tenantUsers.length - 1)]
      : users[randomInt(random, 0, users.length - 1)];

  const tenantCustomModels = customModels.filter((model) => model.tenantId === tenant?.id);
  const useCustomModel = tenantCustomModels.length > 0 && random() < 0.22;
  const customModel = useCustomModel
    ? tenantCustomModels[randomInt(random, 0, tenantCustomModels.length - 1)]
    : undefined;
  const platformModel = platformModels[randomInt(random, 0, platformModels.length - 1)];

  const modelName = customModel?.name ?? platformModel?.name ?? "gpt-4.1";
  const modelDisplayName = customModel?.modelId ?? platformModel?.displayName ?? modelName;
  const providerName = customModel ? "自定义接入" : (platformModel?.providerName ?? "OpenAI");
  const providerType: ModelProvider["type"] = customModel
    ? (CUSTOM_ACCESS_PROVIDER_TYPE[customModel.accessType] ?? "platform")
    : (providerTypeByName.get(providerName) ?? "platform");
  const region = customModel?.region ?? regionByProvider.get(providerName) ?? "华东-上海";
  const prices = customModel ? priceOfCustom(customModel.fallbackModel) : resolvePrice(modelName);

  const source = pickOne(random, SOURCE_POOL);
  const status = pickOne(random, STATUS_POOL);
  const streaming = random() > 0.28;

  const inputTokens =
    status === "blocked" ? randomInt(random, 40, 900) : randomInt(random, 320, 18_600);
  const outputTokens =
    status === "blocked" ||
    platformModel?.maxOutput === 0 ||
    platformModel?.capabilities.includes("embedding")
      ? 0
      : status === "success"
        ? randomInt(random, 60, 3_200)
        : randomInt(random, 0, 420);
  const cachedTokens =
    random() < 0.32 ? Math.round(inputTokens * randomFloat(random, 0.1, 0.62, 2)) : 0;

  const baseLatency =
    status === "timeout"
      ? randomInt(random, 30_000, 60_400)
      : providerType === "local"
        ? randomInt(random, 180, 1_400)
        : providerType === "open-source"
          ? randomInt(random, 240, 2_100)
          : randomInt(random, 420, 8_400);
  const latencyMs = status === "blocked" ? randomInt(random, 24, 160) : baseLatency;
  const firstTokenMs =
    streaming && status !== "blocked"
      ? Math.round(latencyMs * randomFloat(random, 0.08, 0.42, 2))
      : 0;

  const costBasis =
    cachedTokens > 0 ? inputTokens - cachedTokens + cachedTokens * 0.25 : inputTokens;
  const rawCost = (costBasis / 1000) * prices.input + (outputTokens / 1000) * prices.output;
  const cost =
    status === "success" || status === "timeout"
      ? Number(rawCost.toFixed(4))
      : Number((rawCost * 0.35).toFixed(4));

  const routeStrategy =
    status === "success" && random() < 0.45 ? "direct" : pickOne(random, routingRules).strategy;
  const fallbackUsed = status !== "blocked" && random() < 0.12;
  const requestedModel = fallbackUsed
    ? (platformModels[randomInt(random, 0, platformModels.length - 1)]?.name ?? modelName)
    : modelName;

  const safetyFlags: string[] = [];
  if (status === "blocked") {
    safetyFlags.push(pickOne(random, SAFETY_FLAG_POOL));
  } else if (random() < 0.06) {
    safetyFlags.push("pii");
  }

  const credential = modelKeys.find((key) => key.tenantName === tenant?.name);
  const error = status === "success" ? null : SUCCESS_ERROR[status];

  return {
    id: `call-${String(index + 1).padStart(4, "0")}`,
    requestId: `req_${(50_000 + index * 37).toString(36)}${Math.floor(random() * 1_679_616 + 1_048_576).toString(36)}`,
    traceId: `tr-${String(50_000 + index * 37).padStart(6, "0")}`,
    at: hoursAgo(randomInt(random, 0, 719), randomInt(random, 0, 59)),
    tenantId: tenant?.id ?? "tn-01",
    tenantName: tenant?.name ?? "—",
    userId: user?.id ?? "usr-01",
    userName: user?.name ?? "—",
    userEmail: user?.email ?? "—",
    orgName: user?.orgName ?? "—",
    projectName: pickOne(random, PROJECT_NAMES),
    agentName:
      source === "api" || source === "playground"
        ? "不涉及（直连）"
        : pickOne(random, AGENT_NAMES.slice(0, 6)),
    source,
    credentialName: credential?.name ?? "平台默认密钥",
    clientIp: `${pickOne(random, [10, 172, 192])}.${randomInt(random, 0, 255)}.${randomInt(random, 0, 255)}.${randomInt(random, 1, 254)}`,
    userAgent: pickOne(random, USER_AGENTS),
    modelId: customModel?.id ?? platformModel?.id ?? "pm-01",
    modelName,
    modelDisplayName,
    providerName,
    providerType,
    region,
    routeStrategy,
    fallbackUsed,
    requestedModel,
    status,
    httpStatus: error?.http ?? 200,
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
    latencyMs,
    firstTokenMs,
    inputTokens,
    outputTokens,
    cachedTokens,
    toolCalls: source === "agent" ? randomInt(random, 0, 6) : randomInt(random, 0, 2),
    streaming,
    retryCount: status === "success" ? 0 : randomInt(random, 0, 2),
    safetyFlags,
    feedback: status === "success" && random() < 0.18 ? (random() < 0.72 ? "up" : "down") : null,
    cost,
    currency: "CNY",
  };
}

export const modelCallRecords: ModelCallRecord[] = Array.from({ length: 260 }, (_, index) =>
  buildModelCallRecord(index),
).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

/** 供「实时订阅」演示使用：按种子生成一条刚刚发生的调用记录 */
export function createLiveModelCall(seed: number): ModelCallRecord {
  const record = buildModelCallRecord(900 + seed);
  return {
    ...record,
    id: `call-live-${String(seed).padStart(3, "0")}`,
    requestId: `req_live_${seed.toString(36).padStart(4, "0")}`,
    at: new Date().toISOString(),
  };
}

export const modelCallErrorCatalog: { code: string; message: string; count: number }[] = (() => {
  const map = new Map<string, { code: string; message: string; count: number }>();
  modelCallRecords
    .filter((record) => record.errorCode)
    .forEach((record) => {
      const entry = map.get(record.errorCode as string) ?? {
        code: record.errorCode as string,
        message: record.errorMessage ?? "—",
        count: 0,
      };
      entry.count += 1;
      map.set(entry.code, entry);
    });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
})();
