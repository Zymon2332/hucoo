import type {
  AgentTemplate,
  CommandPolicy,
  MarketListing,
  MicroMcpServer,
  NetworkPolicyEntry,
  PluginPackage,
  Project,
  Sandbox,
  Tool,
  Workspace,
} from "@/types";
import { createRandom, daysAgo, hoursAgo, pickMany, pickOne, randomFloat, randomInt } from "./seed";

interface ToolSeed {
  name: string;
  code: string;
  category: Tool["category"];
  description: string;
  risk: Tool["riskLevel"];
  status: Tool["status"];
  source: Tool["source"];
  scopes: string[];
  schema: string;
  requiresApproval: boolean;
}

const TOOL_SEEDS: ToolSeed[] = [
  { name: "文件读取", code: "fs.read", category: "file", description: "读取工作区内文件内容，受敏感文件保护规则约束。", risk: "low", status: "enabled", source: "builtin", scopes: ["fs:read"], schema: '{"type":"object","properties":{"path":{"type":"string"},"offset":{"type":"number"}},"required":["path"]}', requiresApproval: false },
  { name: "文件写入", code: "fs.write", category: "file", description: "写入或覆盖工作区文件，禁止写入受保护路径。", risk: "medium", status: "enabled", source: "builtin", scopes: ["fs:read", "fs:write"], schema: '{"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"]}', requiresApproval: false },
  { name: "目录遍历", code: "fs.list", category: "file", description: "列出目录结构，遵守 .agentignore 忽略规则。", risk: "low", status: "enabled", source: "builtin", scopes: ["fs:read"], schema: '{"type":"object","properties":{"path":{"type":"string"},"depth":{"type":"number"}},"required":["path"]}', requiresApproval: false },
  { name: "终端执行", code: "terminal.execute", category: "terminal", description: "在沙箱内执行 shell 命令，受命令白名单与 sudo 禁止策略约束。", risk: "critical", status: "enabled", source: "builtin", scopes: ["sandbox:execute"], schema: '{"type":"object","properties":{"command":{"type":"string"},"cwd":{"type":"string"},"timeoutMs":{"type":"number"}},"required":["command"]}', requiresApproval: true },
  { name: "代码搜索", code: "code.search", category: "search", description: "基于 ripgrep 的仓库内代码与文本搜索。", risk: "low", status: "enabled", source: "builtin", scopes: ["repo:read"], schema: '{"type":"object","properties":{"pattern":{"type":"string"},"glob":{"type":"string"}},"required":["pattern"]}', requiresApproval: false },
  { name: "网页搜索", code: "web.search", category: "search", description: "联网检索公开资料，返回摘要与来源链接。", risk: "medium", status: "enabled", source: "builtin", scopes: ["net:egress"], schema: '{"type":"object","properties":{"query":{"type":"string"},"topK":{"type":"number"}},"required":["query"]}', requiresApproval: false },
  { name: "Git 操作", code: "git.operations", category: "git", description: "提交、分支、变基与差异查询，禁止强制推送主分支。", risk: "high", status: "enabled", source: "builtin", scopes: ["repo:write"], schema: '{"type":"object","properties":{"action":{"type":"string"},"args":{"type":"array","items":{"type":"string"}}},"required":["action"]}', requiresApproval: true },
  { name: "浏览器自动化", code: "browser.navigate", category: "browser", description: "无头浏览器访问与截图，域名白名单受网络策略控制。", risk: "high", status: "enabled", source: "builtin", scopes: ["net:egress", "browser:control"], schema: '{"type":"object","properties":{"url":{"type":"string"},"screenshot":{"type":"boolean"}},"required":["url"]}', requiresApproval: true },
  { name: "HTTP 请求", code: "http.request", category: "http", description: "发起 HTTP 请求调用外部 API，需声明出网域名。", risk: "medium", status: "enabled", source: "builtin", scopes: ["net:egress"], schema: '{"type":"object","properties":{"method":{"type":"string"},"url":{"type":"string"},"body":{"type":"object"}},"required":["method","url"]}', requiresApproval: false },
  { name: "CMDB 查询", code: "cmdb.query", category: "custom", description: "内网 CMDB 资产只读查询，通过 OpenAPI 导入注册。", risk: "medium", status: "pending-review", source: "openapi", scopes: ["net:internal"], schema: '{"type":"object","properties":{"assetId":{"type":"string"},"env":{"type":"string"}},"required":["assetId"]}', requiresApproval: true },
  { name: "数据库只读查询", code: "db.readonly.query", category: "database", description: "对脱敏数据仓库执行只读 SQL，禁止 DDL/DML。", risk: "critical", status: "rejected", source: "custom", scopes: ["db:read"], schema: '{"type":"object","properties":{"sql":{"type":"string"},"limit":{"type":"number"}},"required":["sql"]}', requiresApproval: true },
  { name: "Kubernetes 操作", code: "k8s.operations", category: "custom", description: "查看与滚动重启工作负载，禁止删除命名空间。", risk: "critical", status: "enabled", source: "custom", scopes: ["k8s:write"], schema: '{"type":"object","properties":{"namespace":{"type":"string"},"action":{"type":"string"}},"required":["namespace","action"]}', requiresApproval: true },
  { name: "通知发送", code: "notify.send", category: "custom", description: "向飞书/钉钉/邮件发送通知消息。", risk: "low", status: "enabled", source: "marketplace", scopes: ["im:send"], schema: '{"type":"object","properties":{"channel":{"type":"string"},"text":{"type":"string"}},"required":["channel","text"]}', requiresApproval: false },
  { name: "PDF 解析", code: "doc.pdf.parse", category: "file", description: "解析 PDF/Word 文档为结构化文本与表格。", risk: "low", status: "enabled", source: "marketplace", scopes: ["fs:read"], schema: '{"type":"object","properties":{"path":{"type":"string"},"tables":{"type":"boolean"}},"required":["path"]}', requiresApproval: false },
  { name: "图像识别", code: "vision.analyze", category: "custom", description: "调用多模态模型完成图表理解与 OCR。", risk: "medium", status: "enabled", source: "marketplace", scopes: ["model:invoke"], schema: '{"type":"object","properties":{"imageUrl":{"type":"string"},"task":{"type":"string"}},"required":["imageUrl"]}', requiresApproval: false },
  { name: "邮件发送", code: "mail.send", category: "custom", description: "以平台服务账号发送事务邮件，需模板审核。", risk: "medium", status: "disabled", source: "custom", scopes: ["mail:send"], schema: '{"type":"object","properties":{"to":{"type":"string"},"templateId":{"type":"string"}},"required":["to","templateId"]}', requiresApproval: true },
  { name: "定时任务调度", code: "cron.schedule", category: "custom", description: "创建与管理工作区内的定时任务。", risk: "medium", status: "enabled", source: "custom", scopes: ["sandbox:execute"], schema: '{"type":"object","properties":{"cron":{"type":"string"},"command":{"type":"string"}},"required":["cron","command"]}', requiresApproval: false },
  { name: "Secrets 读取", code: "secrets.read", category: "custom", description: "读取项目级密钥引用（不返回明文，仅注入运行时）。", risk: "critical", status: "pending-review", source: "builtin", scopes: ["secrets:read"], schema: '{"type":"object","properties":{"ref":{"type":"string"}},"required":["ref"]}', requiresApproval: true },
];

export const tools: Tool[] = TOOL_SEEDS.map((seed, index) => {
  const random = createRandom(21_000 + index * 29);
  return {
    id: `tool-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    code: seed.code,
    category: seed.category,
    description: seed.description,
    riskLevel: seed.risk,
    status: seed.status,
    source: seed.source,
    version: `${randomInt(random, 1, 4)}.${randomInt(random, 0, 12)}.${randomInt(random, 0, 9)}`,
    author: pickOne(random, ["平台官方", "云启科技", "拓维制造", "蓝鲸零售", "开源社区", "天穹保险"]),
    installs: randomInt(random, 12, 42_800),
    rating: randomFloat(random, 3.6, 4.9),
    reviewCount: randomInt(random, 0, 1_860),
    requiresApproval: seed.requiresApproval,
    parameterSchema: seed.schema,
    scopes: seed.scopes,
    updatedAt: daysAgo(randomInt(random, 1, 160), randomInt(random, 9, 19)),
  };
});

const COMMAND_SEEDS: [string, CommandPolicy["effect"], string, string][] = [
  ["rm -rf /", "deny", "全局", "禁止删除根目录，任何环境不可放行。"],
  ["sudo *", "deny", "全局", "沙箱内禁止提权，规避容器逃逸风险。"],
  ["git push --force", "ask", "项目级", "强制推送需人工确认，主分支直接拒绝。"],
  ["npm install", "allow", "全局", "允许安装依赖，走内部镜像源。"],
  ["pnpm add", "allow", "全局", "允许使用 pnpm 管理依赖。"],
  ["pip install", "ask", "项目级", "需要确认包来源与版本锁定。"],
  ["curl *", "ask", "全局", "出网访问需声明域名白名单。"],
  ["docker run *", "deny", "生产环境", "禁止在沙箱内启动容器，避免资源逃逸。"],
  ["kubectl apply *", "ask", "运维项目", "仅允许在预发环境执行，生产环境需审批。"],
  ["chmod 777 *", "deny", "全局", "禁止开放全局写权限。"],
  ["psql *", "ask", "数据项目", "仅允许只读账号，禁止 DDL。"],
  ["terraform apply", "ask", "运维项目", "基础设施变更需双人复核。"],
];

export const commandPolicies: CommandPolicy[] = COMMAND_SEEDS.map(([pattern, effect, scope, reason], index) => ({
  id: `cmd-${String(index + 1).padStart(2, "0")}`,
  pattern,
  effect,
  scope,
  reason,
  updatedAt: daysAgo(randomInt(createRandom(22_000 + index), 2, 120), randomInt(createRandom(22_500 + index), 9, 19)),
}));

const NETWORK_SEEDS: [string, NetworkPolicyEntry["direction"], NetworkPolicyEntry["effect"], string, string][] = [
  ["registry.npmjs.org", "egress", "allow", "0.0.0.0/0", "依赖安装白名单。"],
  ["pypi.org", "egress", "allow", "0.0.0.0/0", "Python 依赖源白名单。"],
  ["api.anthropic.com", "egress", "allow", "0.0.0.0/0", "仅允许企业网关出口访问。"],
  ["10.20.0.0/16", "egress", "deny", "10.20.0.0/16", "禁止访问内网办公网段。"],
  ["169.254.169.254", "egress", "deny", "169.254.169.254/32", "禁止访问云元数据服务。"],
  ["*.internal.corp", "egress", "deny", "0.0.0.0/0", "默认禁止内网域名解析。"],
  ["huggingface.co", "egress", "ask", "0.0.0.0/0", "模型权重下载需审批。"],
  ["oss-cn-hangzhou.aliyuncs.com", "egress", "allow", "0.0.0.0/0", "对象存储读写白名单。"],
  ["admin.agent-platform.cn", "ingress", "allow", "203.0.113.0/24", "仅允许办公出口 IP 访问控制台。"],
  ["0.0.0.0/0", "ingress", "deny", "0.0.0.0/0", "默认拒绝公网入站。"],
];

export const networkPolicyEntries: NetworkPolicyEntry[] = NETWORK_SEEDS.map(
  ([domain, direction, effect, cidr, note], index) => ({
    id: `net-${String(index + 1).padStart(2, "0")}`,
    domain,
    direction,
    effect,
    cidr,
    note,
    updatedAt: daysAgo(randomInt(createRandom(23_000 + index), 1, 90), randomInt(createRandom(23_400 + index), 9, 19)),
  }),
);

const PLUGIN_SEEDS: [string, string, boolean, number, PluginPackage["status"]][] = [
  ["@agent/tool-git", "平台官方", true, 0, "verified"],
  ["@agent/tool-browser", "平台官方", true, 0, "verified"],
  ["@agent/tool-postgres", "云启科技", true, 1, "verified"],
  ["@community/notion-sync", "开源社区", false, 3, "unverified"],
  ["@vendor/sap-connector", "SAP 生态", true, 2, "verified"],
  ["@community/jira-bridge", "开源社区", true, 0, "verified"],
  ["crypto-miner-helper", "未知发布者", false, 12, "blocked"],
  ["@tenant/bluewhale-custom", "蓝鲸零售", false, 1, "unverified"],
  ["@agent/tool-slack", "平台官方", true, 0, "verified"],
];

export const pluginPackages: PluginPackage[] = PLUGIN_SEEDS.map(([name, publisher, signed, vulns, status], index) => {
  const random = createRandom(24_000 + index * 13);
  return {
    id: `plg-${String(index + 1).padStart(2, "0")}`,
    name,
    version: `${randomInt(random, 0, 3)}.${randomInt(random, 1, 18)}.${randomInt(random, 0, 12)}`,
    publisher,
    signed,
    sbomAvailable: random() > 0.25,
    vulnerabilities: vulns,
    installs: randomInt(random, 8, 26_400),
    status,
    updatedAt: daysAgo(randomInt(random, 1, 150), randomInt(random, 9, 19)),
  };
});

const MCP_SEEDS: [string, MicroMcpServer["transport"], MicroMcpServer["authType"], MicroMcpServer["status"], string[]][] = [
  ["filesystem-mcp", "stdio", "none", "healthy", ["fs:read", "fs:write"]],
  ["postgres-mcp", "streamable-http", "api-key", "healthy", ["db:read"]],
  ["github-mcp", "streamable-http", "oauth", "healthy", ["repo:read", "repo:write", "issue:write"]],
  ["playwright-mcp", "sse", "none", "degraded", ["browser:control"]],
  ["slack-mcp", "streamable-http", "oauth", "healthy", ["im:send"]],
  ["jira-mcp", "sse", "api-key", "healthy", ["issue:read", "issue:write"]],
  ["notion-mcp", "streamable-http", "oauth", "healthy", ["doc:read"]],
  ["k8s-mcp", "streamable-http", "mtls", "healthy", ["k8s:read", "k8s:write"]],
  ["sentry-mcp", "sse", "api-key", "degraded", ["observability:read"]],
  ["chrome-devtools-mcp", "stdio", "none", "unknown", ["browser:control"]],
  ["redis-mcp", "streamable-http", "api-key", "healthy", ["cache:read", "cache:write"]],
  ["internal-cmdb-mcp", "streamable-http", "mtls", "healthy", ["net:internal"]],
  ["feishu-mcp", "sse", "oauth", "down", ["im:send", "doc:read"]],
];

export const mcpServers: MicroMcpServer[] = MCP_SEEDS.map(
  ([name, transport, authType, status, _scopes], index) => {
    const random = createRandom(25_000 + index * 17);
    return {
      id: `mcp-${String(index + 1).padStart(2, "0")}`,
      name,
      endpoint:
        transport === "stdio"
          ? `stdio://npx -y @mcp/${name}`
          : `https://mcp.agent-platform.cn/${name.replace("-mcp", "")}`,
      transport,
      authType,
      version: `${randomInt(random, 0, 2)}.${randomInt(random, 4, 22)}.${randomInt(random, 0, 9)}`,
      status,
      toolCount: randomInt(random, 3, 42),
      calls24h: randomInt(random, 200, 90_000),
      errorRate: randomFloat(random, 0, 4.2),
      latencyP95: randomInt(random, 80, 2_600),
      owner: pickOne(random, ["平台官方", "云启科技", "拓维制造", "蓝鲸零售", "光年出行"]),
      allowedDomains: pickMany(random, ["api.github.com", "hooks.slack.com", "jira.internal.cn", "k8s.internal.cn", "redis.internal.cn", "open.feishu.cn"], randomInt(random, 1, 3)),
      egressLimited: random() > 0.35,
      lastSyncAt: hoursAgo(randomInt(random, 1, 72)),
      tags: pickMany(random, ["官方", "自建", "生产", "只读", "高权限", "需审批"], randomInt(random, 1, 3)),
    };
  },
);

interface AgentSeed {
  name: string;
  code: string;
  category: AgentTemplate["category"];
  description: string;
  prompt: string;
  status: AgentTemplate["status"];
  visibility: AgentTemplate["visibility"];
  publisher: string;
  tools: string[];
  knowledge: string[];
}

const AGENT_SEEDS: AgentSeed[] = [
  { name: "代码实现助手", code: "coding-assistant", category: "coding", description: "按需求实现功能并补充单元测试，遵守项目规范。", prompt: "你是资深工程师。先阅读仓库规范与现有实现，再以最小变更完成需求；必须补充或更新单元测试，禁止绕过类型检查。", status: "published", visibility: "market", publisher: "平台官方", tools: ["fs.read", "fs.write", "code.search", "terminal.execute"], knowledge: ["仓库规范", "API 手册"] },
  { name: "代码审查员", code: "code-reviewer", category: "review", description: "审查 PR 的正确性、安全性与可维护性，输出分级意见。", prompt: "你负责审查变更。优先检查逻辑缺陷、安全风险与边界条件，其次关注可读性；每条意见需给出文件位置与修改建议。", status: "published", visibility: "market", publisher: "平台官方", tools: ["fs.read", "code.search", "git.operations"], knowledge: ["内部编码规范"] },
  { name: "单元测试生成器", code: "test-generator", category: "testing", description: "根据实现生成覆盖边界条件的测试用例。", prompt: "你是测试工程师。识别分支与边界，生成可运行的测试；不得修改被测实现来让测试通过。", status: "published", visibility: "platform", publisher: "平台官方", tools: ["fs.read", "fs.write", "terminal.execute"], knowledge: ["测试框架指南"] },
  { name: "故障自愈运维", code: "ops-selfheal", category: "ops", description: "识别告警并执行预定义的自愈脚本，全程审计。", prompt: "你是 SRE。先定位根因再执行处置，所有变更需说明回滚方案；生产环境高风险操作必须申请审批。", status: "gray", visibility: "platform", publisher: "平台官方", tools: ["k8s.operations", "http.request", "notify.send"], knowledge: ["应急预案库", "Runbook"] },
  { name: "数据分析助手", code: "data-analyst", category: "data", description: "编写只读 SQL 并生成图表洞察。", prompt: "你是数据分析师。仅使用只读查询，说明口径与假设，给出可复现的分析步骤。", status: "published", visibility: "market", publisher: "云启科技", tools: ["db.readonly.query", "vision.analyze"], knowledge: ["指标字典", "数仓表结构"] },
  { name: "技术文档撰写", code: "doc-writer", category: "writing", description: "生成与维护 API 文档、变更日志与最佳实践。", prompt: "你是技术写作专家。输出结构化文档，示例代码必须可运行，术语与产品保持一致。", status: "published", visibility: "market", publisher: "平台官方", tools: ["fs.read", "fs.write", "code.search"], knowledge: ["术语表"] },
  { name: "客服知识问答", code: "cs-knowledge", category: "support", description: "基于知识库回答客户问题并升级复杂工单。", prompt: "你是客服助手。回答必须引用知识库来源；无法确认时明确说明并转人工，禁止编造。", status: "published", visibility: "market", publisher: "蓝鲸零售", tools: ["fs.read", "http.request"], knowledge: ["客服手册", "退换货政策"] },
  { name: "合同风险审查", code: "contract-risk-review", category: "review", description: "识别合同条款风险并给出修改建议。", prompt: "你是法务审查助手。逐条比对风险条款库，标注等级与依据；最终结论必须提示人工复核。", status: "in-review", visibility: "market", publisher: "天穹保险", tools: ["doc.pdf.parse", "fs.read"], knowledge: ["合同条款库", "监管要求"] },
  { name: "安全扫描助手", code: "security-scanner", category: "ops", description: "扫描依赖漏洞与泄露凭据并生成修复清单。", prompt: "你是安全工程师。输出按严重度排序的修复清单，对每个结论给出证据与复现方式。", status: "published", visibility: "platform", publisher: "平台官方", tools: ["code.search", "terminal.execute"], knowledge: ["漏洞库"] },
  { name: "提示词优化器", code: "prompt-optimizer", category: "writing", description: "基于评测结果迭代优化系统提示词。", prompt: "你是提示词工程师。保持语义不变的前提下提升稳定性，输出前后对比与评测分数。", status: "draft", visibility: "private", publisher: "云启科技", tools: ["fs.read", "fs.write"], knowledge: ["评测集"] },
  { name: "报表生成助手", code: "report-builder", category: "data", description: "按周生成经营报表并解释异常波动。", prompt: "你是经营分析师。报表需包含环比与归因，异常波动必须给出可能原因与验证方式。", status: "published", visibility: "tenant", publisher: "光年出行", tools: ["db.readonly.query", "doc.pdf.parse"], knowledge: ["经营指标库"] },
  { name: "工单分类机器人", code: "ticket-classifier", category: "support", description: "对工单自动打标并路由到对应团队。", prompt: "你是工单分派助手。按分类体系输出标签与置信度，低置信度转人工。", status: "offline", visibility: "tenant", publisher: "恒宇物流", tools: ["http.request"], knowledge: ["工单分类体系"] },
  { name: "数据库迁移审查", code: "migration-reviewer", category: "review", description: "审查 DDL 变更的兼容性与回滚方案。", prompt: "你是 DBA。评估锁表风险与向后兼容性，给出灰度与回滚步骤。", status: "rejected", visibility: "private", publisher: "星辰银行", tools: ["fs.read", "code.search"], knowledge: ["数据库规范"] },
  { name: "供应链预测助手", code: "supply-forecast", category: "data", description: "基于历史销量预测补货需求。", prompt: "你是供应链分析师。说明预测模型假设与置信区间，异常值需单独标注。", status: "gray", visibility: "tenant", publisher: "蓝鲸零售", tools: ["db.readonly.query", "vision.analyze"], knowledge: ["销量数据字典"] },
  { name: "发布值班助手", code: "release-oncall", category: "ops", description: "值守发布流水线，异常时执行回滚。", prompt: "你是发布值班。严格按发布单执行，指标劣化超过阈值立即回滚并通知负责人。", status: "published", visibility: "platform", publisher: "平台官方", tools: ["k8s.operations", "http.request", "notify.send"], knowledge: ["发布规范", "回滚手册"] },
];

const MODEL_POOL = ["claude-sonnet-4.5", "gpt-4.1", "qwen3-235b-a22b", "deepseek-v3.2", "gemini-2.5-pro", "glm-4.6"];

export const agentTemplates: AgentTemplate[] = AGENT_SEEDS.map((seed, index) => {
  const random = createRandom(26_000 + index * 37);
  return {
    id: `at-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    code: seed.code,
    category: seed.category,
    description: seed.description,
    systemPrompt: seed.prompt,
    modelPolicy: `${pickOne(random, MODEL_POOL)} 主，${pickOne(random, MODEL_POOL)} 兜底`,
    toolWhitelist: seed.tools,
    forbiddenModels: pickMany(random, ["o3", "gpt-4o-audio"], randomInt(random, 0, 2)),
    forbiddenTools: pickMany(random, ["secrets.read", "terminal.execute", "db.readonly.query"], randomInt(random, 0, 2)),
    knowledgeBases: seed.knowledge,
    version: `${randomInt(random, 1, 3)}.${randomInt(random, 0, 18)}.${randomInt(random, 0, 9)}`,
    status: seed.status,
    visibility: seed.visibility,
    installs: randomInt(random, 0, 128_000),
    rating: randomFloat(random, 3.6, 4.9),
    reviews: randomInt(random, 0, 2_400),
    publisher: seed.publisher,
    grayPercent: seed.status === "gray" ? randomInt(random, 5, 50) : 0,
    changelog: pickOne(random, [
      "优化工具调用参数校验，减少无效重试。",
      "新增知识库引用来源标注。",
      "修复长上下文下的指令遗忘问题。",
      "降低 18% 平均 Token 消耗。",
    ]),
    updatedAt: daysAgo(randomInt(random, 1, 120), randomInt(random, 9, 19)),
  };
});

export function getAgentTemplateById(id: string) {
  return agentTemplates.find((template) => template.id === id);
}

const MARKET_SEEDS: [number, MarketListing["pricing"], number, number, MarketListing["status"], boolean][] = [
  [0, "free", 0, 128_400, "listed", true],
  [1, "free", 0, 96_200, "listed", true],
  [14, "internal", 0, 12_800, "listed", false],
  [3, "internal", 0, 6_400, "pending", false],
  [4, "paid", 199, 42_600, "listed", false],
  [5, "free", 0, 63_100, "listed", false],
  [6, "paid", 499, 28_400, "listed", false],
  [7, "paid", 899, 4_200, "pending", false],
  [8, "internal", 0, 9_800, "listed", false],
  [14, "internal", 0, 3_100, "removed", false],
  [10, "internal", 0, 18_600, "listed", false],
  [12, "internal", 0, 1_200, "removed", false],
  [13, "internal", 0, 7_400, "listed", false],
  [11, "free", 0, 22_300, "listed", false],
];

export const marketListings: MarketListing[] = MARKET_SEEDS.map(
  ([templateIndex, pricing, price, installs, status, featured], index) => {
    const random = createRandom(27_000 + index * 23);
    const template = agentTemplates[templateIndex];
    return {
      id: `mkt-${String(index + 1).padStart(2, "0")}`,
      templateId: template?.id ?? "at-01",
      name: template?.name ?? "—",
      category: template?.category ?? "coding",
      publisher: template?.publisher ?? "平台官方",
      pricing,
      price,
      installs,
      rating: randomFloat(random, 3.8, 4.9),
      reviews: randomInt(random, 4, 1_860),
      trendScore: randomInt(random, 42, 99),
      featured,
      chartRank: featured ? randomInt(random, 1, 3) : null,
      status,
      reports: randomInt(random, 0, 6),
      updatedAt: daysAgo(randomInt(random, 1, 60), randomInt(random, 9, 19)),
    };
  },
);

interface ProjectSeed {
  name: string;
  code: string;
  tenantId: string;
  type: Project["type"];
  repo: string;
  owner: string;
  status: Project["status"];
}

const PROJECT_SEEDS: ProjectSeed[] = [
  { name: "Agent 门户前端", code: "agent-portal-web", tenantId: "tn-01", type: "frontend", repo: "git@github.com:cloudnova/agent-portal-web.git", owner: "宋茜", status: "active" },
  { name: "模型网关服务", code: "model-gateway", tenantId: "tn-01", type: "backend", repo: "git@github.com:cloudnova/model-gateway.git", owner: "许安", status: "active" },
  { name: "风控规则引擎", code: "risk-engine", tenantId: "tn-02", type: "backend", repo: "git@git.stellarbank.com:risk/engine.git", owner: "赵敏", status: "active" },
  { name: "脱敏数据仓库", code: "dw-masked", tenantId: "tn-02", type: "data", repo: "git@git.stellarbank.com:data/dw-masked.git", owner: "袁莉", status: "active" },
  { name: "智能客服工作台", code: "cs-workbench", tenantId: "tn-03", type: "frontend", repo: "git@gitlab.com:bluewhale/cs-workbench.git", owner: "林嘉", status: "active" },
  { name: "补货预测流水线", code: "supply-forecast", tenantId: "tn-03", type: "data", repo: "git@gitlab.com:bluewhale/supply-forecast.git", owner: "钟怡", status: "paused" },
  { name: "影像辅助诊断", code: "imaging-assist", tenantId: "tn-04", type: "research", repo: "git@git.shanhai.health:ai/imaging-assist.git", owner: "吴桐", status: "active" },
  { name: "在线学习平台", code: "learning-platform", tenantId: "tn-05", type: "frontend", repo: "git@github.com:aurora-edu/learning-platform.git", owner: "周越", status: "active" },
  { name: "产线视觉质检", code: "vision-qc", tenantId: "tn-06", type: "research", repo: "git@git.tuowei.com:ai/vision-qc.git", owner: "郑海", status: "active" },
  { name: "实时路径规划", code: "route-planner", tenantId: "tn-07", type: "backend", repo: "git@github.com:lightyear/route-planner.git", owner: "孙倩", status: "active" },
  { name: "内容生产工作台", code: "content-studio", tenantId: "tn-08", type: "frontend", repo: "git@git.shiguang.media:studio/content-studio.git", owner: "何笑", status: "provisioning" },
  { name: "理赔单据识别", code: "claims-ocr", tenantId: "tn-09", type: "research", repo: "git@git.skyvault.com:ai/claims-ocr.git", owner: "马骏", status: "active" },
  { name: "大促压测平台", code: "flash-sale-load", tenantId: "tn-11", type: "ops", repo: "git@github.com:jupiter/load-test.git", owner: "邓可", status: "archived" },
  { name: "运单调度优化", code: "dispatch-optimizer", tenantId: "tn-12", type: "ops", repo: "git@git.hengyu-logistics.com:ops/dispatch.git", owner: "方岩", status: "archived" },
];

export const projects: Project[] = PROJECT_SEEDS.map((seed, index) => {
  const random = createRandom(28_000 + index * 31);
  const budget = randomInt(random, 8, 260) * 1_000;
  const ratio = randomFloat(random, 0.3, 1.3);
  return {
    id: `pj-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    code: seed.code,
    tenantId: seed.tenantId,
    tenantName:
      { "tn-01": "云启科技", "tn-02": "星辰银行", "tn-03": "蓝鲸零售", "tn-04": "山海医疗", "tn-05": "极光教育", "tn-06": "拓维制造", "tn-07": "光年出行", "tn-08": "拾光传媒", "tn-09": "天穹保险", "tn-11": "木星电商", "tn-12": "恒宇物流" }[seed.tenantId] ?? "—",
    type: seed.type,
    status: seed.status,
    repo: seed.repo,
    branchStrategy: pickOne(random, ["主干保护 + PR 双人评审", "GitFlow（develop/release）", "Trunk-based + 特性开关"]),
    envCount: randomInt(random, 2, 8),
    memberCount: randomInt(random, 3, 60),
    agentCount: randomInt(random, 1, 24),
    budgetMonthly: budget,
    spentMonthly: Math.round(budget * ratio),
    modelPolicy: pickOne(random, ["仅平台模型", "允许 BYOK", "允许本地模型", "允许共享模型"]),
    toolPolicy: pickOne(random, ["只读工具", "标准工具集", "含终端执行（受限）", "自定义工具需审批"]),
    sensitiveFileProtection: random() > 0.25,
    ignoreRules: ".env, *.pem, secrets/**, config/prod.yaml",
    owner: seed.owner,
    workspaces: randomInt(random, 1, 12),
    createdAt: daysAgo(randomInt(random, 40, 620), randomInt(random, 9, 19)),
  };
});

const WS_SEEDS: [string, string, Workspace["status"], string, string, string, string][] = [
  ["前端开发-01", "pj-01", "running", "registry.internal/agent/node20:1.4", "4C", "8Gi", "无"],
  ["前端开发-02", "pj-01", "idle", "registry.internal/agent/node20:1.4", "4C", "8Gi", "无"],
  ["网关调试-01", "pj-02", "running", "registry.internal/agent/python312:2.1", "8C", "16Gi", "无"],
  ["网关压测-01", "pj-02", "stopped", "registry.internal/agent/python312:2.1", "16C", "32Gi", "无"],
  ["风控分析-01", "pj-03", "running", "registry.internal/agent/data:3.0", "8C", "32Gi", "无"],
  ["风控分析-02", "pj-03", "error", "registry.internal/agent/data:3.0", "8C", "32Gi", "无"],
  ["数仓 ETL-01", "pj-04", "running", "registry.internal/agent/spark:4.2", "16C", "64Gi", "无"],
  ["客服前端-01", "pj-05", "idle", "registry.internal/agent/node20:1.4", "4C", "8Gi", "无"],
  ["客服前端-02", "pj-05", "provisioning", "registry.internal/agent/node20:1.4", "4C", "8Gi", "无"],
  ["诊断训练-01", "pj-07", "running", "registry.internal/agent/cuda12:5.1", "16C", "64Gi", "1×A100"],
  ["学习平台-01", "pj-08", "running", "registry.internal/agent/node20:1.4", "4C", "8Gi", "无"],
  ["视觉质检-01", "pj-09", "running", "registry.internal/agent/cuda12:5.1", "8C", "32Gi", "1×A10"],
  ["路径规划-01", "pj-10", "running", "registry.internal/agent/python312:2.1", "8C", "16Gi", "无"],
  ["内容工作台-01", "pj-11", "provisioning", "registry.internal/agent/node20:1.4", "4C", "8Gi", "无"],
  ["理赔识别-01", "pj-12", "idle", "registry.internal/agent/cuda12:5.1", "8C", "32Gi", "1×A10"],
  ["压测平台-01", "pj-13", "stopped", "registry.internal/agent/loadtest:1.8", "8C", "16Gi", "无"],
];

export const workspaces: Workspace[] = WS_SEEDS.map(
  ([name, projectId, status, image, cpu, memory, gpu], index) => {
    const random = createRandom(29_000 + index * 19);
    const project = projects.find((item) => item.id === projectId);
    return {
      id: `ws-${String(index + 1).padStart(2, "0")}`,
      name,
      projectId,
      projectName: project?.name ?? "—",
      tenantName: project?.tenantName ?? "—",
      image,
      cpu,
      memory,
      disk: `${randomInt(random, 2, 20) * 10}Gi`,
      gpu,
      status,
      timeoutMinutes: pickOne(random, [30, 60, 120, 240, 480]),
      idleRecycleMinutes: pickOne(random, [5, 15, 30, 60, 120]),
      concurrencyLimit: randomInt(random, 1, 16),
      region: pickOne(random, ["华东-上海", "华北-北京", "华南-深圳"]),
      owner: project?.owner ?? "—",
      monthlyCost: randomInt(random, 120, 9_600),
      createdAt: daysAgo(randomInt(random, 2, 300), randomInt(random, 9, 19)),
    };
  },
);

const SB_SEEDS: [string, Sandbox["status"], Sandbox["networkPolicy"], number, number][] = [
  ["node20-standard", "ready", "allowlist", 0, 2],
  ["python312-standard", "ready", "allowlist", 0, 1],
  ["data-toolbox", "scanning", "proxy-only", 0, 4],
  ["cuda12-train", "ready", "deny-all", 0, 6],
  ["cuda12-infer", "vulnerable", "proxy-only", 3, 12],
  ["spark-etl", "ready", "allowlist", 0, 3],
  ["loadtest-runner", "deprecated", "open", 0, 8],
  ["node20-minimal", "ready", "deny-all", 0, 0],
  ["java21-enterprise", "ready", "allowlist", 0, 2],
  ["go122-service", "ready", "allowlist", 0, 1],
  ["ruby33-legacy", "deprecated", "open", 1, 9],
  ["desktop-browser", "vulnerable", "proxy-only", 4, 18],
  ["ml-notebook", "building", "allowlist", 0, 0],
  ["compliance-baseline", "ready", "deny-all", 0, 0],
];

export const sandboxes: Sandbox[] = SB_SEEDS.map(
  ([name, status, networkPolicy, vulnCritical, vulnHigh], index) => {
    const random = createRandom(30_000 + index * 23);
    const project = projects[randomInt(random, 0, projects.length - 1)];
    return {
      id: `sb-${String(index + 1).padStart(2, "0")}`,
      name,
      projectName: project?.name ?? "—",
      tenantName: project?.tenantName ?? "—",
      image: `registry.internal/sandbox/${name}`,
      imageVersion: `${randomInt(random, 1, 4)}.${randomInt(random, 0, 18)}.${randomInt(random, 0, 9)}`,
      registry: "registry.internal",
      status,
      cpu: pickOne(random, ["2C", "4C", "8C", "16C"]),
      memory: pickOne(random, ["4Gi", "8Gi", "16Gi", "32Gi", "64Gi"]),
      disk: `${randomInt(random, 2, 20) * 10}Gi`,
      gpu: pickOne(random, ["无", "无", "无", "1×A10", "1×A100"]),
      networkPolicy,
      egressProxy: networkPolicy === "proxy-only" ? "http://egress-proxy.internal:3128" : "—",
      dnsControl: random() > 0.3,
      snapshotEnabled: random() > 0.35,
      prewarmDeps: random() > 0.4,
      vulnCritical,
      vulnHigh,
      complianceBaseline: pickOne(random, ["cis", "pci-dss", "internal"]),
      lastScanAt: hoursAgo(randomInt(random, 1, 168)),
      executions24h: randomInt(random, 0, 42_000),
    };
  },
);

export const sandboxImages = sandboxes.map((sandbox) => ({
  id: sandbox.id,
  image: sandbox.image,
  version: sandbox.imageVersion,
  registry: sandbox.registry,
  status: sandbox.status,
}));

export const expiringSandboxes = sandboxes
  .filter((sandbox) => sandbox.status === "vulnerable" || sandbox.status === "deprecated")
  .map((sandbox) => sandbox.id);
