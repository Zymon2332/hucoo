import type {
  Alert,
  AlertRule,
  AlertType,
  Experiment,
  Integration,
  NotificationChannel,
  ReleaseRecord,
  Setting,
  WebhookEndpoint,
} from "@/types";
import { createRandom, daysAgo, hoursAgo, minutesAgo, pickOne, pickMany, randomFloat, randomInt } from "./seed";

interface AlertSeed {
  title: string;
  type: AlertType;
  severity: Alert["severity"];
  status: Alert["status"];
  source: string;
  tenantName: string;
  value: string;
  threshold: string;
  description: string;
  runbook: string;
}

const ALERT_SEEDS: AlertSeed[] = [
  { title: "蓝鲸零售今日成本超预算 42%", type: "cost", severity: "high", status: "firing", source: "成本监控", tenantName: "蓝鲸零售", value: "¥128,400", threshold: "¥90,000", description: "客服 Agent 调用量突增，单日成本已达预算 1.42 倍。", runbook: "RB-COST-002" },
  { title: "Anthropic 供应商错误率升至 3.2%", type: "error", severity: "high", status: "acknowledged", source: "模型网关", tenantName: "云启科技", value: "3.2%", threshold: "1%", description: "海外出口网络抖动导致超时重试增加。", runbook: "RB-MODEL-011" },
  { title: "超级管理员权限变更未复核", type: "permission-change", severity: "critical", status: "firing", source: "审计风控", tenantName: "星辰银行", value: "1 条", threshold: "0 条", description: "存在 1 条高权限授予操作超过 4 小时未由第二人复核。", runbook: "RB-SEC-004" },
  { title: "qwen3-72b-local 连接失败率 18%", type: "model-unavailable", severity: "critical", status: "firing", source: "模型健康检查", tenantName: "拓维制造", value: "18%", threshold: "5%", description: "本地推理集群 3 号节点异常，已自动摘除但容量不足。", runbook: "RB-MODEL-003" },
  { title: "检测到疑似提示注入攻击 27 次", type: "security", severity: "critical", status: "acknowledged", source: "内容安全", tenantName: "木星电商", value: "27 次", threshold: "5 次/小时", description: "商品评论 Agent 输入包含绕过指令的恶意文本。", runbook: "RB-SEC-009" },
  { title: "极光教育 Token 配额使用 92%", type: "quota", severity: "medium", status: "firing", source: "配额监控", tenantName: "极光教育", value: "92%", threshold: "90%", description: "本月配额预计 5 天后耗尽，建议提前扩容。", runbook: "RB-QUOTA-001" },
  { title: "模型网关 P95 延迟升至 2.4s", type: "latency", severity: "high", status: "firing", source: "性能监控", tenantName: "光年出行", value: "2,431ms", threshold: "1,500ms", description: "实时路径规划高峰期排队导致延迟劣化。", runbook: "RB-PERF-006" },
  { title: "溪流能源长时间无调用（服务暂停）", type: "error", severity: "low", status: "resolved", source: "调用监控", tenantName: "溪流能源", value: "0 次/24h", threshold: "少于 100 次", description: "租户服务已暂停，指标不再上报。", runbook: "RB-OPS-002" },
  { title: "BYOK 密钥即将过期（14 天内）", type: "security", severity: "medium", status: "acknowledged", source: "密钥托管", tenantName: "星辰银行", value: "3 个", threshold: "0 个", description: "3 个生产密钥将在 14 天内到期，需完成轮换。", runbook: "RB-KEY-005" },
  { title: "GPU 沙箱利用率持续低于 12%", type: "cost", severity: "low", status: "silenced", source: "资源监控", tenantName: "天穹保险", value: "9.4%", threshold: "15%", description: "理赔识别沙箱长期空闲，建议缩容或回收。", runbook: "RB-COST-007" },
  { title: "审计日志写入延迟超过 30s", type: "error", severity: "medium", status: "resolved", source: "审计服务", tenantName: "平台", value: "42s", threshold: "30s", description: "日志存储集群扩容后已恢复。", runbook: "RB-OPS-011" },
  { title: "工具 browser.navigate 被高频调用（异常）", type: "security", severity: "high", status: "acknowledged", source: "工具风控", tenantName: "拾光传媒", value: "1,240 次/小时", threshold: "500 次/小时", description: "疑似脚本化抓取，已限流并要求说明用途。", runbook: "RB-SEC-012" },
  { title: "模型路由降级到平台模型 186 次", type: "model-unavailable", severity: "medium", status: "resolved", source: "模型路由", tenantName: "光年出行", value: "186 次", threshold: "50 次", description: "备用集群抖动期间触发降级，费用按约定由双方分担。", runbook: "RB-MODEL-008" },
  { title: "恒宇物流租户已过期 12 天", type: "quota", severity: "medium", status: "firing", source: "租户生命周期", tenantName: "恒宇物流", value: "12 天", threshold: "0 天", description: "租户已过期，建议联系续费或进入只读回收流程。", runbook: "RB-OPS-014" },
  { title: "MCP Server feishu-mcp 心跳中断", type: "model-unavailable", severity: "high", status: "firing", source: "MCP 健康检查", tenantName: "平台", value: "中断 26 分钟", threshold: "5 分钟", description: "飞书 MCP 连接失败，影响通知与文档类工具调用。", runbook: "RB-MCP-003" },
  { title: "夜间批量任务成本异常上升 3 倍", type: "cost", severity: "high", status: "firing", source: "成本监控", tenantName: "蓝鲸零售", value: "¥18,200/夜", threshold: "¥6,000/夜", description: "批处理路由未命中省钱策略，疑似规则优先级被调整。", runbook: "RB-COST-009" },
];

export const alerts: Alert[] = ALERT_SEEDS.map((seed, index) => {
  const random = createRandom(41_000 + index * 13);
  return {
    id: `alrt-${String(index + 1).padStart(2, "0")}`,
    title: seed.title,
    type: seed.type,
    severity: seed.severity,
    status: seed.status,
    source: seed.source,
    tenantName: seed.tenantName,
    value: seed.value,
    threshold: seed.threshold,
    triggeredAt: hoursAgo(randomInt(random, 1, 72), randomInt(random, 0, 59)),
    acknowledgedBy: seed.status === "acknowledged" ? pickOne(random, ["孙晓", "赵敏", "陈立", "许安"]) : null,
    resolvedAt: seed.status === "resolved" ? hoursAgo(randomInt(random, 0, 20), randomInt(random, 0, 59)) : null,
    channels: pickMany(random, ["邮件", "飞书", "Slack", "Webhook", "短信"], randomInt(random, 1, 3)),
    description: seed.description,
    runbook: seed.runbook,
  };
});

const RULE_SEEDS: [string, AlertType, string, string, string, Alert["severity"], boolean][] = [
  ["单日成本超预算", "cost", "daily_cost > budget", "100% 预算", "1d", "high", true],
  ["单租户成本突增", "cost", "cost_delta > 200%", "环比 200%", "1h", "high", true],
  ["模型错误率升高", "error", "provider_error_rate > 1%", "1%", "5m", "high", true],
  ["模型不可用", "model-unavailable", "health_check_failed >= 3", "连续 3 次", "5m", "critical", true],
  ["工具失败率升高", "error", "tool_failure_rate > 5%", "5%", "15m", "medium", true],
  ["P95 延迟劣化", "latency", "p95_latency > 1500ms", "1500ms", "10m", "high", true],
  ["配额使用率预警", "quota", "quota_used > 90%", "90%", "1h", "medium", true],
  ["高权限变更未复核", "permission-change", "privileged_change_unreviewed > 0", "0 条", "30m", "critical", true],
  ["提示注入命中", "security", "injection_hits > 5", "5 次/小时", "1h", "critical", true],
  ["DLP 敏感数据外发", "security", "dlp_block_count > 0", "0 次", "5m", "critical", true],
  ["密钥即将过期", "security", "key_expiry_days < 14", "14 天", "1d", "medium", true],
  ["沙箱长期空闲", "cost", "gpu_idle_hours > 72", "72 小时", "1d", "low", false],
  ["审计写入延迟", "error", "audit_write_latency > 30s", "30s", "5m", "medium", true],
  ["租户即将到期", "quota", "tenant_expiry_days < 30", "30 天", "1d", "low", false],
];

export const alertRules: AlertRule[] = RULE_SEEDS.map(
  ([name, type, condition, threshold, window, severity, enabled], index) => {
    const random = createRandom(42_000 + index * 17);
    return {
      id: `ar-${String(index + 1).padStart(2, "0")}`,
      name,
      type,
      condition,
      threshold,
      window,
      severity,
      channels: pickMany(random, ["邮件", "飞书", "Slack", "Webhook"], randomInt(random, 1, 2)),
      enabled,
      owner: pickOne(random, ["孙晓", "陈立", "许安", "汤鹏", "马骏"]),
      lastTriggeredAt: enabled ? hoursAgo(randomInt(random, 1, 240), randomInt(random, 0, 59)) : null,
      description: `${name}：当 ${condition} 持续 ${window} 触发。`,
    };
  },
);

export const notificationChannels: NotificationChannel[] = [
  { id: "nc-01", name: "值班邮件组", type: "email", target: "oncall@cloudnova.cn", status: "verified", enabled: true, subscribedEvents: ["告警", "审批", "账单"], updatedAt: daysAgo(20) },
  { id: "nc-02", name: "平台告警飞书群", type: "feishu", target: "https://open.feishu.cn/open-apis/bot/v2/hook/9f2c…", status: "verified", enabled: true, subscribedEvents: ["告警", "发布"], updatedAt: daysAgo(6) },
  { id: "nc-03", name: "SRE Slack", type: "slack", target: "https://hooks.slack.com/services/T0…/B0…", status: "verified", enabled: true, subscribedEvents: ["告警"], updatedAt: daysAgo(12) },
  { id: "nc-04", name: "钉钉安全群", type: "dingtalk", target: "https://oapi.dingtalk.com/robot/send?access_token=…", status: "pending", enabled: true, subscribedEvents: ["安全", "审计"], updatedAt: daysAgo(2) },
  { id: "nc-05", name: "审计 Webhook", type: "webhook", target: "https://siem.corp.internal/hooks/agent-audit", status: "verified", enabled: true, subscribedEvents: ["审计", "安全"], updatedAt: daysAgo(30) },
  { id: "nc-06", name: "财务短信通知", type: "sms", target: "+86 138****6621", status: "verified", enabled: false, subscribedEvents: ["账单", "预算"], updatedAt: daysAgo(45) },
  { id: "nc-07", name: "测试通道", type: "email", target: "qa-alerts@cloudnova.cn", status: "error", enabled: false, subscribedEvents: ["告警"], updatedAt: daysAgo(9) },
  { id: "nc-08", name: "客户成功飞书群", type: "feishu", target: "https://open.feishu.cn/open-apis/bot/v2/hook/1a7d…", status: "verified", enabled: true, subscribedEvents: ["租户", "工单"], updatedAt: daysAgo(4) },
];

interface IntegrationSeed {
  name: string;
  provider: string;
  category: Integration["category"];
  status: Integration["status"];
  scopes: string[];
  events: string[];
}

const INTEGRATION_SEEDS: IntegrationSeed[] = [
  { name: "GitHub 代码仓库", provider: "GitHub", category: "git", status: "connected", scopes: ["repo", "pull_request", "workflow"], events: ["push", "pull_request", "check_run"] },
  { name: "GitLab 私有仓库", provider: "GitLab", category: "git", status: "connected", scopes: ["api", "read_repository"], events: ["push", "merge_request"] },
  { name: "Bitbucket 云仓库", provider: "Bitbucket", category: "git", status: "disconnected", scopes: ["repository"], events: ["push"] },
  { name: "Slack 通知", provider: "Slack", category: "im", status: "connected", scopes: ["chat:write", "commands"], events: ["alert", "approval"] },
  { name: "Microsoft Teams", provider: "Teams", category: "im", status: "error", scopes: ["chat.message.send"], events: ["alert"] },
  { name: "飞书机器人", provider: "飞书", category: "im", status: "connected", scopes: ["im:message", "docx:read"], events: ["alert", "approval", "daily-report"] },
  { name: "钉钉工作通知", provider: "钉钉", category: "im", status: "connected", scopes: ["message:send"], events: ["alert"] },
  { name: "企业微信应用", provider: "企业微信", category: "im", status: "pending", scopes: ["message:send", "contact:read"], events: ["alert", "onboarding"] },
  { name: "Jira 工单同步", provider: "Jira", category: "project", status: "connected", scopes: ["issue:write", "project:read"], events: ["issue.created", "issue.updated"] },
  { name: "Linear 需求同步", provider: "Linear", category: "project", status: "connected", scopes: ["issues:create"], events: ["issue.created"] },
  { name: "Trello 看板", provider: "Trello", category: "project", status: "disconnected", scopes: ["board:read"], events: ["card.moved"] },
  { name: "Jenkins 流水线", provider: "Jenkins", category: "cicd", status: "connected", scopes: ["job:build"], events: ["build.started", "build.finished"] },
  { name: "GitHub Actions", provider: "GitHub Actions", category: "cicd", status: "connected", scopes: ["workflow:write"], events: ["workflow_run"] },
  { name: "Grafana 可观测", provider: "Grafana", category: "observability", status: "connected", scopes: ["dashboard:read", "alert:write"], events: ["alert.fired"] },
  { name: "Sentry 异常追踪", provider: "Sentry", category: "observability", status: "connected", scopes: ["event:read"], events: ["issue.created"] },
];

export const integrations: Integration[] = INTEGRATION_SEEDS.map((seed, index) => {
  const random = createRandom(43_000 + index * 11);
  return {
    id: `itg-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    provider: seed.provider,
    category: seed.category,
    status: seed.status,
    scopes: seed.scopes,
    installedBy: pickOne(random, ["陈立", "宋茜", "孙晓", "邓可", "马骏"]),
    installedAt: daysAgo(randomInt(random, 20, 420), randomInt(random, 9, 19)),
    lastSyncAt: seed.status === "connected" ? minutesAgo(randomInt(random, 2, 400)) : daysAgo(randomInt(random, 3, 40)),
    webhookUrl: `https://api.agent-platform.cn/hooks/${seed.provider.toLowerCase().replace(/\s+/g, "-")}`,
    events: seed.events,
    version: `${randomInt(random, 1, 5)}.${randomInt(random, 0, 12)}.${randomInt(random, 0, 9)}`,
  };
});

export const webhookEndpoints: WebhookEndpoint[] = Array.from({ length: 10 }).map((_, index) => {
  const random = createRandom(44_000 + index * 17);
  const status = pickOne(random, ["active", "active", "active", "paused", "failing"]) as WebhookEndpoint["status"];
  return {
    id: `wh-${String(index + 1).padStart(2, "0")}`,
    name: pickOne(random, ["审计同步", "成本推送", "审批通知", "用量回流", "安全事件", "工单创建", "发布事件", "租户生命周期", "模型健康", "账单事件"]) + `#${index + 1}`,
    url: `https://${pickOne(random, ["siem.corp.internal", "finops.corp.internal", "workflow.corp.internal", "data-warehouse.internal"])}/hooks/${pickOne(random, ["audit", "cost", "approval", "usage", "security"])}`,
    events: pickMany(random, ["audit.created", "alert.fired", "approval.decided", "usage.daily", "tenant.updated", "invoice.issued"], randomInt(random, 1, 3)),
    secretPrefix: `whsec_${Math.round(random() * 0xffffff).toString(16).padStart(6, "0")}`,
    status,
    successRate: status === "failing" ? randomFloat(random, 62, 84) : randomFloat(random, 92, 100),
    lastDeliveryAt: minutesAgo(randomInt(random, 1, 1_440)),
    createdAt: daysAgo(randomInt(random, 20, 380), randomInt(random, 9, 19)),
  };
});

interface ExperimentSeed {
  key: string;
  name: string;
  type: Experiment["type"];
  status: Experiment["status"];
  traffic: number;
  metric: string;
  lift: number;
  targetModel: string;
  description: string;
}

const EXPERIMENT_SEEDS: ExperimentSeed[] = [
  { key: "prompt-v2-rollout", name: "编码助手提示词 v2 灰度", type: "rolling-release", status: "running", traffic: 35, metric: "任务成功率", lift: 6.4, targetModel: "claude-sonnet-4.5", description: "新提示词在工具调用参数生成上更稳定。" },
  { key: "ab-cheap-router", name: "成本优先路由 A/B", type: "ab-test", status: "running", traffic: 50, metric: "单次成本", lift: -18.2, targetModel: "deepseek-v3.2", description: "对照组走质量优先路由，实验组走成本优先。" },
  { key: "flag-byok-mgmt-fee", name: "BYOK 管理费开关", type: "feature-flag", status: "running", traffic: 100, metric: "收入", lift: 3.1, targetModel: "-", description: "对 BYOK 租户按密钥数量收取管理费。" },
  { key: "ab-cache-layer", name: "语义缓存层 A/B", type: "ab-test", status: "completed", traffic: 50, metric: "P95 延迟", lift: -22.8, targetModel: "qwen3-72b", description: "命中语义缓存的请求直接返回，显著降低延迟。" },
  { key: "shadow-o3-router", name: "o3 推理路由影子模式", type: "shadow", status: "running", traffic: 10, metric: "质量评分", lift: 12.6, targetModel: "o3", description: "影子流量评估推理模型收益，不影响线上结果。" },
  { key: "flag-new-console-nav", name: "新版控制台导航", type: "feature-flag", status: "paused", traffic: 20, metric: "导航点击率", lift: -4.2, targetModel: "-", description: "分组导航改版，用户反馈待收敛。" },
  { key: "ab-tool-whitelist", name: "工具白名单收紧 A/B", type: "ab-test", status: "completed", traffic: 50, metric: "安全事件数", lift: -36.4, targetModel: "-", description: "收紧终端工具白名单，安全事件显著下降。" },
  { key: "rollout-mcp-v2", name: "MCP 协议 v2 升级灰度", type: "rolling-release", status: "running", traffic: 60, metric: "工具失败率", lift: -8.8, targetModel: "-", description: "Streamable HTTP 传输提升连接稳定性。" },
  { key: "ab-lazy-context", name: "上下文懒加载 A/B", type: "ab-test", status: "draft", traffic: 0, metric: "Token 消耗", lift: 0, targetModel: "gpt-4.1", description: "按需加载知识库片段，尚未开始。" },
  { key: "rollout-sandbox-pool", name: "沙箱预热池灰度", type: "rolling-release", status: "running", traffic: 45, metric: "启动耗时", lift: -41.2, targetModel: "-", description: "预热池将沙箱冷启动从 8.4s 降到 4.9s。" },
  { key: "ab-approval-2step", name: "审批链减为两级 A/B", type: "ab-test", status: "rolled-back", traffic: 25, metric: "审批时长", lift: -58.2, targetModel: "-", description: "审批过快导致风险漏检，已回滚。" },
  { key: "shadow-injection-detector", name: "注入检测新模型影子", type: "shadow", status: "running", traffic: 100, metric: "召回率", lift: 9.4, targetModel: "qwen3-32b-instruct", description: "影子评估新检测模型召回与误报。" },
  { key: "flag-tenant-self-service", name: "租户自助开通开关", type: "feature-flag", status: "draft", traffic: 0, metric: "开通转化率", lift: 0, targetModel: "-", description: "允许租户自助开通试用，待风控确认。" },
];

export const experiments: Experiment[] = EXPERIMENT_SEEDS.map((seed, index) => {
  const random = createRandom(45_000 + index * 23);
  const weights = seed.traffic === 0 ? [50, 50] : [50, 50];
  return {
    id: `exp-${String(index + 1).padStart(2, "0")}`,
    key: seed.key,
    name: seed.name,
    type: seed.type,
    status: seed.status,
    trafficPercent: seed.traffic,
    audience: pickOne(random, ["全部租户", "企业版租户", "内部员工", "新注册租户", "指定租户白名单"]),
    targetModel: seed.targetModel,
    metric: seed.metric,
    confidence: seed.status === "completed" ? randomInt(random, 92, 99) : randomInt(random, 40, 95),
    lift: seed.lift,
    variants: weights.map((weight, variantIndex) => ({
      id: `${seed.key}-v${variantIndex + 1}`,
      name: variantIndex === 0 ? (seed.type === "ab-test" ? "对照组" : "基线") : seed.type === "ab-test" ? "实验组" : "新版本",
      weight,
      metric: seed.type === "ab-test" ? randomFloat(random, 62, 94) : randomInt(random, 0, 100),
      conversions: randomInt(random, 400, 82_000),
    })),
    owner: pickOne(random, ["许安", "孙倩", "陈立", "邓可", "宋茜"]),
    startedAt: daysAgo(randomInt(random, 2, 120), randomInt(random, 9, 19)),
    endedAt: seed.status === "completed" || seed.status === "rolled-back" ? daysAgo(randomInt(random, 1, 30), randomInt(random, 9, 19)) : null,
    description: seed.description,
  };
});

export const releases: ReleaseRecord[] = [
  { id: "rel-01", version: "v2.14.0", environment: "production", status: "success", strategy: "canary", deployedBy: "宋茜", deployedAt: daysAgo(2, 21, 30), durationMinutes: 42, rollbackAvailable: true, notes: "新增模型路由降级费用归属配置。" },
  { id: "rel-02", version: "v2.14.1", environment: "production", status: "success", strategy: "canary", deployedBy: "宋茜", deployedAt: daysAgo(1, 20, 10), durationMinutes: 36, rollbackAvailable: true, notes: "修复 BYOK 指纹展示为空的问题。" },
  { id: "rel-03", version: "v2.15.0-rc1", environment: "staging", status: "in-progress", strategy: "rolling", deployedBy: "许安", deployedAt: hoursAgo(6), durationMinutes: 18, rollbackAvailable: true, notes: "MCP v2 传输升级验证。" },
  { id: "rel-04", version: "v2.13.4", environment: "production", status: "failed", strategy: "canary", deployedBy: "邓可", deployedAt: daysAgo(9, 22, 5), durationMinutes: 12, rollbackAvailable: true, notes: "沙箱预热池内存泄漏，触发自动回滚。" },
  { id: "rel-05", version: "v2.13.3", environment: "production", status: "success", strategy: "blue-green", deployedBy: "宋茜", deployedAt: daysAgo(16, 21, 0), durationMinutes: 55, rollbackAvailable: true, notes: "审计日志存储扩容。" },
  { id: "rel-06", version: "v2.16.0-alpha", environment: "dev", status: "success", strategy: "rolling", deployedBy: "许安", deployedAt: hoursAgo(20), durationMinutes: 9, rollbackAvailable: false, notes: "实验性成本模拟器接口。" },
  { id: "rel-07", version: "v2.15.0-rc2", environment: "staging", status: "rolling-back", strategy: "canary", deployedBy: "孙倩", deployedAt: hoursAgo(3), durationMinutes: 7, rollbackAvailable: true, notes: "灰度指标劣化，执行回滚。" },
  { id: "rel-08", version: "v2.12.0", environment: "production", status: "success", strategy: "rolling", deployedBy: "陈立", deployedAt: daysAgo(38, 20, 0), durationMinutes: 48, rollbackAvailable: true, notes: "上线沙箱镜像漏洞扫描。" },
  { id: "rel-09", version: "v2.14.2", environment: "production", status: "success", strategy: "canary", deployedBy: "宋茜", deployedAt: hoursAgo(30), durationMinutes: 33, rollbackAvailable: true, notes: "优化租户配额告警阈值。" },
  { id: "rel-10", version: "v2.16.0-beta", environment: "staging", status: "success", strategy: "blue-green", deployedBy: "孙倩", deployedAt: daysAgo(4, 19, 20), durationMinutes: 26, rollbackAvailable: true, notes: "实验平台显著性计算修正。" },
  { id: "rel-11", version: "v2.13.2", environment: "production", status: "success", strategy: "canary", deployedBy: "邓可", deployedAt: daysAgo(24, 21, 45), durationMinutes: 38, rollbackAvailable: true, notes: "修复 SSO SCIM 增量同步丢失。" },
];

interface SettingSeed {
  group: string;
  key: string;
  label: string;
  description: string;
  type: Setting["type"];
  value: Setting["value"];
  options: string[];
}

const SETTING_SEEDS: SettingSeed[] = [
  { group: "全局设置", key: "platformName", label: "平台名称", description: "显示在登录页与控制台标题中的名称。", type: "string", value: "Agent 平台管理控制台", options: [] },
  { group: "全局设置", key: "defaultRegion", label: "默认区域", description: "新建租户与沙箱默认部署区域。", type: "select", value: "华东-上海", options: ["华东-上海", "华北-北京", "华南-深圳", "西南-成都"] },
  { group: "全局设置", key: "timezone", label: "时区", description: "报表、审计与账单使用的时区。", type: "select", value: "Asia/Shanghai", options: ["Asia/Shanghai", "Asia/Hong_Kong", "UTC"] },
  { group: "全局设置", key: "sessionTimeoutMinutes", label: "会话超时（分钟）", description: "管理端无操作自动登出时间。", type: "number", value: 60, options: [] },
  { group: "全局设置", key: "passwordPolicy", label: "密码策略", description: "本地账号密码复杂度要求。", type: "select", value: "强（12 位 + 大小写数字符号）", options: ["中（8 位）", "强（12 位 + 大小写数字符号）", "仅 SSO"] },
  { group: "全局设置", key: "mfaRequired", label: "强制多因素认证", description: "平台管理员必须开启 MFA。", type: "boolean", value: true, options: [] },
  { group: "品牌与本地化", key: "language", label: "默认语言", description: "控制台默认界面语言。", type: "select", value: "zh-CN", options: ["zh-CN", "en-US", "zh-TW"] },
  { group: "品牌与本地化", key: "brandColor", label: "品牌主色", description: "控制台主色与图表默认配色。", type: "string", value: "#6D28D9", options: [] },
  { group: "品牌与本地化", key: "logoUrl", label: "Logo 地址", description: "控制台左上角 Logo，建议 SVG。", type: "string", value: "https://cdn.agent-platform.cn/brand/logo.svg", options: [] },
  { group: "通知", key: "emailSender", label: "邮件发件人", description: "系统通知邮件的发件地址。", type: "string", value: "no-reply@agent-platform.cn", options: [] },
  { group: "通知", key: "notificationDigest", label: "每日摘要", description: "每天 9:00 发送前一日运营摘要。", type: "boolean", value: true, options: [] },
  { group: "通知", key: "alertSuppressionMinutes", label: "告警抑制窗口（分钟）", description: "同一告警在该窗口内不重复通知。", type: "number", value: 15, options: [] },
  { group: "私有化部署", key: "deploymentMode", label: "部署模式", description: "SaaS 多租户或私有化单租户。", type: "select", value: "多租户 SaaS", options: ["多租户 SaaS", "私有化单租户", "混合模式"] },
  { group: "私有化部署", key: "licenseKey", label: "License 密钥", description: "私有化部署授权，按节点数与功能授权。", type: "string", value: "AGT-ENT-2026-****-8842", options: [] },
  { group: "私有化部署", key: "offlineInstall", label: "离线安装包", description: "允许在无外网环境通过离线镜像升级。", type: "boolean", value: false, options: [] },
  { group: "私有化部署", key: "upgradeChannel", label: "升级通道", description: "生产环境升级策略。", type: "select", value: "稳定版（延迟 7 天）", options: ["最新版", "稳定版（延迟 7 天）", "长期支持版"] },
  { group: "数据与迁移", key: "retentionDays", label: "数据保留天数", description: "审计与用量明细的默认保留周期。", type: "number", value: 180, options: [] },
  { group: "数据与迁移", key: "auditExportFormat", label: "审计导出格式", description: "合规导出文件格式。", type: "select", value: "CSV + 签名包", options: ["CSV", "JSONL", "CSV + 签名包"] },
  { group: "数据与迁移", key: "backupSchedule", label: "备份计划", description: "全量备份频率。", type: "select", value: "每日 02:00", options: ["每小时", "每日 02:00", "每周日 02:00"] },
  { group: "多环境", key: "maintenanceMode", label: "维护模式", description: "开启后仅超级管理员可访问控制台。", type: "boolean", value: false, options: [] },
  { group: "多环境", key: "enabledEnvironments", label: "启用的环境", description: "平台管理的环境列表。", type: "string", value: "dev, staging, production", options: [] },
  { group: "全局策略", key: "allowCustomModels", label: "允许自定义模型", description: "关闭后所有租户不可接入自定义模型。", type: "boolean", value: true, options: [] },
  { group: "全局策略", key: "allowByok", label: "允许 BYOK", description: "允许租户使用自有密钥直连模型。", type: "boolean", value: true, options: [] },
  { group: "全局策略", key: "allowLocalModels", label: "允许本地模型", description: "允许接入租户自建的本地推理集群。", type: "boolean", value: false, options: [] },
  { group: "全局策略", key: "allowSharedModels", label: "允许共享模型", description: "允许租户之间共享自定义模型。", type: "boolean", value: true, options: [] },
  { group: "全局策略", key: "customModelDefaultRisk", label: "自定义模型默认风险等级", description: "新提交接入申请的默认风险等级。", type: "select", value: "high", options: ["low", "medium", "high", "critical"] },
];

export const settings: Setting[] = SETTING_SEEDS.map((seed, index) => ({
  id: `set-${String(index + 1).padStart(2, "0")}`,
  group: seed.group,
  key: seed.key,
  label: seed.label,
  description: seed.description,
  type: seed.type,
  value: seed.value,
  options: seed.options,
  scope: "platform",
  updatedAt: daysAgo(randomInt(createRandom(46_000 + index), 1, 120), randomInt(createRandom(46_400 + index), 9, 19)),
  updatedBy: pickOne(createRandom(47_000 + index), ["陈立", "孙晓", "许安", "宋茜"]),
}));

export const settingGroups = Array.from(new Set(settings.map((setting) => setting.group)));
