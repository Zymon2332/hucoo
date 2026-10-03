import type {
  CustomModel,
  ModelKey,
  ModelProvider,
  ModelValidationCheck,
  ModelValidationRun,
  PlatformModel,
  RoutingRule,
} from "@/types";
import { createRandom, daysAgo, daysFromNow, fingerprint, hoursAgo, pickMany, pickOne, randomFloat, randomInt } from "./seed";
import { tenants } from "./tenants";

export const modelProviders: ModelProvider[] = [
  {
    id: "mp-01",
    name: "OpenAI",
    code: "openai",
    type: "platform",
    baseUrl: "https://api.openai.com/v1",
    region: "美国-弗吉尼亚",
    status: "healthy",
    apiKeyManaged: true,
    rateLimit: "10,000 RPM · 2M TPM",
    priceMultiplier: 1,
    modelCount: 6,
    latencyP95: 1180,
    errorRate: 0.18,
    lastCheckedAt: hoursAgo(1),
  },
  {
    id: "mp-02",
    name: "Anthropic",
    code: "anthropic",
    type: "platform",
    baseUrl: "https://api.anthropic.com/v1",
    region: "美国-俄勒冈",
    status: "healthy",
    apiKeyManaged: true,
    rateLimit: "8,000 RPM · 1.6M TPM",
    priceMultiplier: 1.05,
    modelCount: 4,
    latencyP95: 1320,
    errorRate: 0.24,
    lastCheckedAt: hoursAgo(1),
  },
  {
    id: "mp-03",
    name: "Google Vertex AI",
    code: "google",
    type: "platform",
    baseUrl: "https://us-central1-aiplatform.googleapis.com",
    region: "美国-爱荷华",
    status: "degraded",
    apiKeyManaged: true,
    rateLimit: "6,000 RPM",
    priceMultiplier: 1.02,
    modelCount: 4,
    latencyP95: 2240,
    errorRate: 1.86,
    lastCheckedAt: hoursAgo(2),
  },
  {
    id: "mp-04",
    name: "阿里云百炼",
    code: "aliyun-bailian",
    type: "platform",
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    region: "华东-杭州",
    status: "healthy",
    apiKeyManaged: true,
    rateLimit: "20,000 RPM",
    priceMultiplier: 0.92,
    modelCount: 7,
    latencyP95: 640,
    errorRate: 0.11,
    lastCheckedAt: hoursAgo(1),
  },
  {
    id: "mp-05",
    name: "开源模型池（vLLM）",
    code: "opensource-vllm",
    type: "open-source",
    baseUrl: "https://inference.agent-platform.internal/v1",
    region: "华东-上海",
    status: "healthy",
    apiKeyManaged: false,
    rateLimit: "无限制（集群调度）",
    priceMultiplier: 0.35,
    modelCount: 5,
    latencyP95: 880,
    errorRate: 0.32,
    lastCheckedAt: hoursAgo(1),
  },
  {
    id: "mp-06",
    name: "私有化推理集群",
    code: "private-cluster",
    type: "local",
    baseUrl: "http://10.20.8.11:8000/v1",
    region: "客户机房",
    status: "healthy",
    apiKeyManaged: false,
    rateLimit: "集群内调度",
    priceMultiplier: 0.2,
    modelCount: 3,
    latencyP95: 420,
    errorRate: 0.08,
    lastCheckedAt: hoursAgo(3),
  },
  {
    id: "mp-07",
    name: "企业统一网关",
    code: "enterprise-gateway",
    type: "gateway",
    baseUrl: "https://llm-gw.corp.internal/v1",
    region: "华北-北京",
    status: "maintenance",
    apiKeyManaged: true,
    rateLimit: "租户级限流",
    priceMultiplier: 1.2,
    modelCount: 9,
    latencyP95: 1560,
    errorRate: 0.62,
    lastCheckedAt: hoursAgo(5),
  },
];

interface PlatformModelSeed {
  name: string;
  display: string;
  providerId: string;
  capabilities: PlatformModel["capabilities"];
  context: number;
  maxOutput: number;
  inPrice: number;
  outPrice: number;
  status: PlatformModel["status"];
  visibility: PlatformModel["visibility"];
  tags: string[];
  description: string;
}

const PLATFORM_MODEL_SEEDS: PlatformModelSeed[] = [
  { name: "gpt-4.1", display: "GPT-4.1", providerId: "mp-01", capabilities: ["chat", "reasoning", "vision", "tool-calling", "json-mode", "long-context"], context: 1_000_000, maxOutput: 32_768, inPrice: 14, outPrice: 56, status: "online", visibility: "public", tags: ["旗舰", "通用"], description: "通用旗舰模型，长上下文与工具调用表现稳定，适合复杂 Agent 编排。" },
  { name: "gpt-4o-mini", display: "GPT-4o mini", providerId: "mp-01", capabilities: ["chat", "vision", "tool-calling", "json-mode"], context: 128_000, maxOutput: 16_384, inPrice: 1.1, outPrice: 4.4, status: "online", visibility: "public", tags: ["高性价比"], description: "轻量高并发模型，适合意图识别、摘要与批量处理。" },
  { name: "o3", display: "o3 推理", providerId: "mp-01", capabilities: ["chat", "reasoning", "tool-calling"], context: 200_000, maxOutput: 100_000, inPrice: 42, outPrice: 168, status: "beta", visibility: "tenant", tags: ["深度推理"], description: "深度推理模型，适合代码修复与多步规划，成本较高。" },
  { name: "claude-sonnet-4.5", display: "Claude Sonnet 4.5", providerId: "mp-02", capabilities: ["chat", "reasoning", "vision", "tool-calling", "long-context"], context: 200_000, maxOutput: 64_000, inPrice: 21, outPrice: 105, status: "online", visibility: "public", tags: ["编码", "Agent"], description: "编码与长任务表现突出，支持计算机使用类工具。" },
  { name: "claude-haiku-4.5", display: "Claude Haiku 4.5", providerId: "mp-02", capabilities: ["chat", "vision", "tool-calling"], context: 200_000, maxOutput: 32_000, inPrice: 7, outPrice: 35, status: "online", visibility: "public", tags: ["低延迟"], description: "低延迟版本，适合在线交互类 Agent。" },
  { name: "gemini-2.5-pro", display: "Gemini 2.5 Pro", providerId: "mp-03", capabilities: ["chat", "reasoning", "vision", "audio", "long-context"], context: 2_000_000, maxOutput: 65_536, inPrice: 8.75, outPrice: 70, status: "online", visibility: "public", tags: ["超长上下文", "多模态"], description: "超长上下文与多模态能力，适合文档理解与音视频摘要。" },
  { name: "gemini-2.5-flash", display: "Gemini 2.5 Flash", providerId: "mp-03", capabilities: ["chat", "vision", "audio", "tool-calling"], context: 1_000_000, maxOutput: 32_768, inPrice: 1.05, outPrice: 4.2, status: "online", visibility: "public", tags: ["高吞吐"], description: "高吞吐多模态模型，适合大规模批处理。" },
  { name: "qwen3-235b-a22b", display: "通义千问3 235B", providerId: "mp-04", capabilities: ["chat", "reasoning", "tool-calling", "json-mode"], context: 131_072, maxOutput: 16_384, inPrice: 2.4, outPrice: 9.6, status: "online", visibility: "public", tags: ["国产", "推理"], description: "国产大参数模型，中文语境与工具调用表现优秀。" },
  { name: "qwen3-72b", display: "通义千问3 72B", providerId: "mp-04", capabilities: ["chat", "tool-calling", "json-mode"], context: 131_072, maxOutput: 8_192, inPrice: 1.2, outPrice: 4.8, status: "online", visibility: "public", tags: ["国产"], description: "均衡型国产模型，适合企业内知识问答。" },
  { name: "deepseek-v3.2", display: "DeepSeek V3.2", providerId: "mp-04", capabilities: ["chat", "reasoning", "tool-calling"], context: 128_000, maxOutput: 16_384, inPrice: 1, outPrice: 4, status: "online", visibility: "public", tags: ["国产", "性价比"], description: "高性价比推理模型，适合代码与结构化任务。" },
  { name: "glm-4.6", display: "智谱 GLM-4.6", providerId: "mp-04", capabilities: ["chat", "tool-calling", "json-mode"], context: 128_000, maxOutput: 8_192, inPrice: 1.8, outPrice: 7.2, status: "online", visibility: "public", tags: ["国产"], description: "企业知识库场景表现稳定，支持结构化输出。" },
  { name: "llama-4-70b", display: "Llama 4 70B", providerId: "mp-05", capabilities: ["chat", "tool-calling"], context: 128_000, maxOutput: 8_192, inPrice: 0.35, outPrice: 1.4, status: "online", visibility: "tenant", tags: ["开源", "自托管"], description: "开源权重模型，平台自托管，成本最低。" },
  { name: "qwen3-32b-instruct", display: "Qwen3 32B Instruct", providerId: "mp-05", capabilities: ["chat", "json-mode"], context: 32_768, maxOutput: 4_096, inPrice: 0.2, outPrice: 0.8, status: "online", visibility: "tenant", tags: ["开源", "小参数"], description: "小参数高频模型，适合分类与抽取。" },
  { name: "bge-m3", display: "BGE-M3 向量", providerId: "mp-05", capabilities: ["embedding"], context: 8_192, maxOutput: 0, inPrice: 0.05, outPrice: 0, status: "online", visibility: "public", tags: ["向量"], description: "多语言向量模型，用于知识库检索。" },
  { name: "bge-reranker-v2", display: "BGE Reranker v2", providerId: "mp-05", capabilities: ["rerank"], context: 8_192, maxOutput: 0, inPrice: 0.08, outPrice: 0, status: "online", visibility: "public", tags: ["重排序"], description: "检索结果重排序，提升知识库召回质量。" },
  { name: "gpt-4o-audio", display: "GPT-4o Audio", providerId: "mp-01", capabilities: ["chat", "audio", "vision"], context: 128_000, maxOutput: 16_384, inPrice: 18, outPrice: 72, status: "offline", visibility: "private", tags: ["语音"], description: "语音交互模型，当前因合规评审暂停对外开放。" },
];

export const platformModels: PlatformModel[] = PLATFORM_MODEL_SEEDS.map((seed, index) => {
  const provider = modelProviders.find((item) => item.id === seed.providerId);
  return {
    id: `pm-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    displayName: seed.display,
    providerId: seed.providerId,
    providerName: provider?.name ?? "—",
    capabilities: seed.capabilities,
    contextWindow: seed.context,
    maxOutput: seed.maxOutput,
    inputPrice: seed.inPrice,
    outputPrice: seed.outPrice,
    currency: "CNY",
    status: seed.status,
    visibility: seed.visibility,
    rateLimit: provider?.rateLimit ?? "—",
    tags: seed.tags,
    description: seed.description,
    updatedAt: daysAgo(randomInt(createRandom(7000 + index), 1, 90), 10, 30),
  };
});

interface CustomModelSeed {
  name: string;
  modelId: string;
  tenantId: string;
  accessType: CustomModel["accessType"];
  endpoint: string;
  dataFlow: CustomModel["dataFlow"];
  fallback: string;
  costOwner: CustomModel["costOwner"];
  risk: CustomModel["riskLevel"];
  status: CustomModel["status"];
  notes: string;
}

const CUSTOM_MODEL_SEEDS: CustomModelSeed[] = [
  { name: "gpt-4.1-finance-gw", modelId: "gpt-4.1-2025-04-14", tenantId: "tn-01", accessType: "gateway", endpoint: "https://llm-gw.cloudnova.cn/v1", dataFlow: "overseas", fallback: "qwen3-235b-a22b", costOwner: "tenant", risk: "high", status: "pending-review", notes: "财务对账场景，出网已收敛至统一网关，等待数据流向终审。" },
  { name: "claude-sonnet-code", modelId: "claude-sonnet-4-5", tenantId: "tn-01", accessType: "byok", endpoint: "https://api.anthropic.com/v1", dataFlow: "overseas", fallback: "deepseek-v3.2", costOwner: "tenant", risk: "high", status: "approved", notes: "研发代码审查使用，密钥托管在平台保险箱，季度轮换。" },
  { name: "qwen3-72b-local", modelId: "qwen3-72b-instruct", tenantId: "tn-06", accessType: "local", endpoint: "http://10.20.8.11:8000/v1", dataFlow: "in-region", fallback: "qwen3-32b-instruct", costOwner: "tenant", risk: "low", status: "approved", notes: "产线数据不出厂区，已完成全量验证项。" },
  { name: "intent-mini-v2", modelId: "intent-mini-v2", tenantId: "tn-03", accessType: "custom-endpoint", endpoint: "https://ai.vendor-x.com/v2/models/intent-mini", dataFlow: "unknown", fallback: "qwen3-32b-instruct", costOwner: "tenant", risk: "high", status: "rejected", notes: "供应商未提供数据流向与等保材料。" },
  { name: "stellar-risk-gateway", modelId: "risk-llm-8b", tenantId: "tn-02", accessType: "gateway", endpoint: "https://risk-gw.stellarbank.com/v1", dataFlow: "in-region", fallback: "qwen3-72b", costOwner: "platform", risk: "medium", status: "approved", notes: "行内风控模型，通过统一网关接入，费用由平台统一结算。" },
  { name: "skyvault-claims-ocr", modelId: "claims-vl-7b", tenantId: "tn-09", accessType: "custom-endpoint", endpoint: "https://ai-ins.skyvault.com/v1/claims-vl", dataFlow: "domestic", fallback: "gemini-2.5-flash", costOwner: "tenant", risk: "medium", status: "validating", notes: "理赔单据识别，多模态验证项执行中。" },
  { name: "lightyear-route-llm", modelId: "route-planner-13b", tenantId: "tn-07", accessType: "byok", endpoint: "https://api.vendor-y.com/v1", dataFlow: "domestic", fallback: "deepseek-v3.2", costOwner: "shared", risk: "medium", status: "approved", notes: "实时路径规划，高峰期降级到平台模型，费用按 6:4 分担。" },
  { name: "aurora-edu-tutor", modelId: "tutor-7b", tenantId: "tn-05", accessType: "custom-endpoint", endpoint: "https://llm.aurora-edu.cn/v1", dataFlow: "domestic", fallback: "qwen3-72b", costOwner: "tenant", risk: "low", status: "approved", notes: "教育场景答疑模型，已通过内容安全审核。" },
  { name: "tuowei-vision-qc", modelId: "vision-qc-3b", tenantId: "tn-06", accessType: "local", endpoint: "http://10.20.9.21:8000/v1", dataFlow: "in-region", fallback: "gemini-2.5-flash", costOwner: "tenant", risk: "low", status: "disabled", notes: "因误检率上升，临时下线待重新验证。" },
  { name: "shiguang-copywriter", modelId: "copywriter-13b", tenantId: "tn-08", accessType: "byok", endpoint: "https://api.vendor-z.com/v1", dataFlow: "overseas", fallback: "glm-4.6", costOwner: "tenant", risk: "high", status: "expired", notes: "授权已到期，未续签，密钥已自动失效。" },
  { name: "jupiter-reco-embed", modelId: "reco-embed-v3", tenantId: "tn-11", accessType: "custom-endpoint", endpoint: "https://ai.jupiter.shop/embed/v3", dataFlow: "domestic", fallback: "bge-m3", costOwner: "tenant", risk: "low", status: "approved", notes: "商品向量召回，日调用 400 万次。" },
  { name: "bluewhale-cs-llm", modelId: "cs-llm-32b", tenantId: "tn-03", accessType: "local", endpoint: "http://10.30.4.8:8000/v1", dataFlow: "in-region", fallback: "qwen3-72b", costOwner: "tenant", risk: "low", status: "approved", notes: "客服知识库问答，自建集群推理。" },
  { name: "brook-doc-parser", modelId: "doc-parse-8b", tenantId: "tn-10", accessType: "custom-endpoint", endpoint: "https://parse.brook-energy.cn/v1", dataFlow: "domestic", fallback: "gemini-2.5-flash", costOwner: "tenant", risk: "medium", status: "disabled", notes: "租户暂停服务，模型一并停用。" },
  { name: "hengyu-logistics-planner", modelId: "logistics-planner-32b", tenantId: "tn-12", accessType: "gateway", endpoint: "https://gw.hengyu-logistics.com/v1", dataFlow: "domestic", fallback: "qwen3-235b-a22b", costOwner: "tenant", risk: "medium", status: "pending-review", notes: "合同已过期，需续费后重新提交接入申请。" },
];

export const customModels: CustomModel[] = CUSTOM_MODEL_SEEDS.map((seed, index) => {
  const random = createRandom(8000 + index * 41);
  const tenant = tenants.find((item) => item.id === seed.tenantId);
  const passed = seed.status === "rejected" ? randomInt(random, 5, 7) : seed.status === "validating" ? randomInt(random, 3, 5) : 9;
  const failed = seed.status === "rejected" ? randomInt(random, 2, 4) : 0;
  return {
    id: `cm-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    modelId: seed.modelId,
    tenantId: seed.tenantId,
    tenantName: tenant?.name ?? "—",
    ownerName: pickOne(random, ["陈立", "赵敏", "林嘉", "吴桐", "郑海", "孙倩", "马骏", "邓可"]),
    ownerEmail: pickOne(random, ["owner-a@example.com", "owner-b@example.com", "owner-c@example.com"]),
    accessType: seed.accessType,
    endpoint: seed.endpoint,
    keyFingerprint: seed.accessType === "byok" || seed.accessType === "gateway" ? fingerprint(9000 + index) : "不适用",
    egressDomains: seed.dataFlow === "overseas" ? ["api.anthropic.com", "api.openai.com"] : seed.accessType === "local" ? [] : ["llm-gw.cloudnova.cn"],
    dataFlow: seed.dataFlow,
    fallbackModel: seed.fallback,
    costOwner: seed.costOwner,
    region: tenant?.region ?? "华东-上海",
    riskLevel: seed.risk,
    status: seed.status,
    validationPassed: passed,
    validationFailed: failed,
    lastValidatedAt: hoursAgo(randomInt(random, 2, 240)),
    expiresAt: seed.status === "expired" ? daysAgo(6) : daysFromNow(randomInt(random, 30, 360)),
    updatedAt: hoursAgo(randomInt(random, 1, 168)),
    notes: seed.notes,
  };
});

export function getCustomModelById(id: string) {
  return customModels.find((model) => model.id === id);
}

const VALIDATION_CHECK_LABELS: [ModelValidationCheck["key"], string][] = [
  ["connection", "连通性"],
  ["streaming", "流式输出"],
  ["timeout", "超时控制"],
  ["concurrency", "并发能力"],
  ["tool-calling", "工具调用"],
  ["json-mode", "JSON 模式"],
  ["token-usage", "Token 统计"],
  ["context-length", "上下文长度"],
  ["multimodal", "多模态"],
];

export function buildValidationChecks(
  overall: ModelValidationRun["status"],
  seed: number,
  limit = 9,
): ModelValidationCheck[] {
  const random = createRandom(seed);
  const keys = VALIDATION_CHECK_LABELS.slice(0, limit);
  let failed = false;
  return keys.map(([key, label]) => {
    let status: ModelValidationCheck["status"] = "passed";
    if (overall === "failed" && !failed && random() > 0.55) {
      status = "failed";
      failed = true;
    } else if (overall === "running" && random() > 0.6) {
      status = "running";
    } else if (overall === "queued") {
      status = "skipped";
    } else if (overall === "passed" && random() > 0.92) {
      status = "skipped";
    }
    return {
      key,
      label,
      status,
      detail:
        status === "passed"
          ? pickOne(random, ["响应正常，耗时 320ms", "流式分片 42 个，间隔稳定", "并发 32 无错误", "工具调用参数校验通过"])
          : status === "failed"
            ? pickOne(random, ["连接超时（>30s）", "工具调用返回 400", "上下文截断异常", "Token 统计缺失"])
            : status === "running"
              ? "执行中…"
              : "已跳过（依赖前置项）",
      durationMs: randomInt(random, 120, 4200),
    };
  });
}

export const modelValidationRuns: ModelValidationRun[] = customModels.map((model, index) => {
  const random = createRandom(10_000 + index * 53);
  const status: ModelValidationRun["status"] =
    model.status === "rejected"
      ? "failed"
      : model.status === "validating"
        ? "running"
        : model.status === "pending-review"
          ? "queued"
          : "passed";
  return {
    id: `mv-${String(index + 1).padStart(2, "0")}`,
    customModelId: model.id,
    modelName: model.name,
    tenantName: model.tenantName,
    runner: pickOne(random, ["许安", "孙倩", "平台自动验证器", "钱枫"]),
    status,
    startedAt: hoursAgo(randomInt(random, 1, 200)),
    durationMs: randomInt(random, 42_000, 380_000),
    failureReason:
      status === "failed"
        ? pickOne(random, ["工具调用未通过：返回 400 参数错误", "上下文长度与声明不符（实测 32k）", "连通性超时"])
        : null,
    checks: buildValidationChecks(status, 11_000 + index * 11, model.accessType === "local" ? 9 : 8),
  };
});

export const modelKeys: ModelKey[] = Array.from({ length: 12 }).map((_, index) => {
  const random = createRandom(12_000 + index * 19);
  const model = customModels[index % customModels.length];
  const status = pickOne(random, [
    "active",
    "active",
    "active",
    "rotating",
    "expiring",
    "revoked",
    "leaked",
  ]) as ModelKey["status"];
  return {
    id: `mk-${String(index + 1).padStart(2, "0")}`,
    name: `${model?.name ?? "key"}-${pickOne(random, ["prod", "stg", "sandbox"])}`,
    provider: pickOne(random, ["Anthropic", "OpenAI", "企业网关", "私有集群"]),
    owner: model?.ownerName ?? "—",
    ownerType: pickOne(random, ["user", "service-account", "tenant"]) as ModelKey["ownerType"],
    tenantName: model?.tenantName ?? "—",
    fingerprint: fingerprint(13_000 + index),
    algorithm: "AES-256-GCM · HMAC-SHA256",
    custodian: pickOne(random, ["钱枫", "平台保险箱", "企业 KMS"]),
    kmsRef: `kms://platform/byok/${String(index + 1).padStart(3, "0")}`,
    status,
    createdAt: daysAgo(randomInt(random, 20, 380)),
    rotatedAt: daysAgo(randomInt(random, 1, 60)),
    expiresAt: status === "expiring" ? daysFromNow(randomInt(random, 3, 14)) : daysFromNow(randomInt(random, 60, 400)),
    lastUsedAt: hoursAgo(randomInt(random, 1, 200)),
  };
});

const ROUTING_SEEDS: [string, string, string, RoutingRule["strategy"], string, string[], boolean, RoutingRule["costOwnerOnFallback"], RoutingRule["status"]][] = [
  ["研发代码任务路由", "全局", "coding", "quality", "claude-sonnet-4.5", ["gpt-4.1", "deepseek-v3.2"], false, "tenant", "enabled"],
  ["客服问答成本优先", "蓝鲸零售", "support", "cost", "qwen3-32b-instruct", ["qwen3-72b", "glm-4.6"], true, "platform", "enabled"],
  ["低延迟实时交互", "光年出行", "realtime", "latency", "gemini-2.5-flash", ["qwen3-72b"], true, "shared", "enabled"],
  ["文档长上下文任务", "全局", "long-context", "quality", "gemini-2.5-pro", ["gpt-4.1"], false, "tenant", "enabled"],
  ["夜间批处理省钱路由", "平台默认", "batch", "cost", "deepseek-v3.2", ["qwen3-72b", "llama-4-70b"], true, "platform", "enabled"],
  ["合规敏感任务（境内）", "星辰银行", "compliance", "availability", "qwen3-235b-a22b", ["qwen3-72b"], true, "tenant", "enabled"],
  ["海外模型熔断降级", "全局", "default", "availability", "gpt-4.1", ["claude-sonnet-4.5", "qwen3-235b-a22b"], true, "shared", "enabled"],
  ["高并发摘要任务", "平台默认", "summarize", "round-robin", "qwen3-32b-instruct", ["gemini-2.5-flash"], false, "tenant", "enabled"],
  ["医疗数据本地优先", "山海医疗", "healthcare", "availability", "qwen3-72b-local", ["qwen3-235b-a22b"], false, "tenant", "draft"],
  ["推理任务质量优先（实验）", "平台默认", "reasoning", "quality", "o3", ["claude-sonnet-4.5", "gemini-2.5-pro"], true, "platform", "disabled"],
];

export const routingRules: RoutingRule[] = ROUTING_SEEDS.map(
  ([name, scope, matchTask, strategy, primaryModel, fallbackModels, degrade, costOwner, status], index) => {
    const random = createRandom(14_000 + index * 23);
    return {
      id: `rr-${String(index + 1).padStart(2, "0")}`,
      name,
      scope,
      priority: index + 1,
      matchTask,
      matchTenantTier: scope === "全局" || scope === "平台默认" ? "全部" : "企业版",
      strategy,
      primaryModel,
      fallbackModels,
      degradeToPlatform: degrade,
      costOwnerOnFallback: costOwner,
      status,
      hitRate: randomFloat(random, 2.4, 38.6),
      updatedAt: daysAgo(randomInt(random, 1, 45), randomInt(random, 9, 19)),
    };
  },
);

export const providerRoutes = modelProviders.map((provider, index) => ({
  id: `pr-${String(index + 1).padStart(2, "0")}`,
  providerName: provider.name,
  region: provider.region,
  weight: index % 3 === 0 ? 40 : index % 3 === 1 ? 30 : 30,
  maxConcurrency: index % 2 === 0 ? 120 : 80,
  timeoutMs: index % 2 === 0 ? 60_000 : 30_000,
  retries: index % 3 === 0 ? 3 : 2,
  status: provider.status === "down" ? ("disabled" as const) : ("enabled" as const),
}));

export const modelCapabilityDistribution = pickMany(
  createRandom(15_000),
  ["chat", "reasoning", "vision", "audio", "embedding", "tool-calling", "json-mode", "long-context"],
  6,
);
