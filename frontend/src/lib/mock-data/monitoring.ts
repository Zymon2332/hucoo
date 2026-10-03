import type { MonitoringMetrics, ServiceStatus, SystemLogEntry } from "@/types";
import { buildSeries, createRandom, hoursAgo, minutesAgo, pickOne, randomFloat, randomInt } from "./seed";

export const monitoringMetrics: MonitoringMetrics = {
  qps: 4_268,
  errorRate: 0.62,
  p95: 1_184,
  p99: 2_860,
  toolFailureRate: 1.42,
  modelAvailability: 99.82,
  activeSessions: 1_284,
  queueDepth: 36,
};

export const monitoringSeries = buildSeries(30, 71_000).map((point, index) => {
  const random = createRandom(72_000 + index * 7);
  return {
    date: point.date,
    qps: Math.round(point.calls / 86_400) + randomInt(random, 0, 420),
    errorRate: randomFloat(random, 0.08, 1.96, 2),
    p95: point.p95,
    p99: Math.round(point.p95 * randomFloat(random, 1.8, 2.6)),
    toolFailureRate: randomFloat(random, 0.4, 3.2, 2),
    modelAvailability: randomFloat(random, 98.4, 99.98, 2),
  };
});

export const serviceStatuses: ServiceStatus[] = [
  { id: "svc-01", name: "API 网关", category: "gateway", status: "operational", uptime30d: 99.98, latencyP95: 86, errorRate: 0.04, slaTarget: 99.95, lastIncidentAt: null },
  { id: "svc-02", name: "策略引擎", category: "gateway", status: "operational", uptime30d: 99.96, latencyP95: 42, errorRate: 0.02, slaTarget: 99.9, lastIncidentAt: null },
  { id: "svc-03", name: "模型路由", category: "model", status: "degraded", uptime30d: 99.42, latencyP95: 428, errorRate: 1.24, slaTarget: 99.9, lastIncidentAt: hoursAgo(5) },
  { id: "svc-04", name: "模型调用（海外）", category: "model", status: "degraded", uptime30d: 98.86, latencyP95: 1_680, errorRate: 2.86, slaTarget: 99.5, lastIncidentAt: hoursAgo(2) },
  { id: "svc-05", name: "模型调用（境内）", category: "model", status: "operational", uptime30d: 99.94, latencyP95: 512, errorRate: 0.12, slaTarget: 99.9, lastIncidentAt: null },
  { id: "svc-06", name: "工具执行器", category: "tool", status: "operational", uptime30d: 99.88, latencyP95: 268, errorRate: 0.86, slaTarget: 99.9, lastIncidentAt: hoursAgo(38) },
  { id: "svc-07", name: "MCP 桥接", category: "mcp", status: "degraded", uptime30d: 99.12, latencyP95: 640, errorRate: 3.42, slaTarget: 99.5, lastIncidentAt: hoursAgo(6) },
  { id: "svc-08", name: "沙箱调度", category: "storage", status: "operational", uptime30d: 99.9, latencyP95: 124, errorRate: 0.08, slaTarget: 99.9, lastIncidentAt: null },
  { id: "svc-09", name: "审计存储", category: "storage", status: "maintenance", uptime30d: 99.72, latencyP95: 210, errorRate: 0.24, slaTarget: 99.9, lastIncidentAt: hoursAgo(12) },
  { id: "svc-10", name: "身份服务", category: "auth", status: "operational", uptime30d: 99.99, latencyP95: 64, errorRate: 0.01, slaTarget: 99.99, lastIncidentAt: null },
  { id: "svc-11", name: "用量采集", category: "storage", status: "operational", uptime30d: 99.94, latencyP95: 96, errorRate: 0.06, slaTarget: 99.9, lastIncidentAt: null },
  { id: "svc-12", name: "国内出口代理", category: "gateway", status: "outage", uptime30d: 97.86, latencyP95: 2_240, errorRate: 8.42, slaTarget: 99.5, lastIncidentAt: minutesAgo(18) },
];

const LOG_TEMPLATES: [SystemLogEntry["channel"], SystemLogEntry["level"], string, string][] = [
  ["system", "info", "api-gateway", "配置热更新完成，版本 v2.14.2"],
  ["system", "warn", "sandbox-pool", "节点 node-07 内存使用率 89%，已触发驱逐预检"],
  ["system", "error", "model-router", "上游 anthropic 超时，自动切换备用区域"],
  ["system", "info", "policy-engine", "策略缓存重建完成，命中率 94.2%"],
  ["audit", "info", "audit-service", "审计日志已归档到冷存储（2026-08）"],
  ["audit", "warn", "audit-service", "检测到高权限操作缺少第二人复核，已通知安全组"],
  ["model", "warn", "model-router", "gpt-4.1 延迟 P95 1.8s，超过阈值触发降级评估"],
  ["model", "info", "model-router", "路由规则 rr-02 命中率升至 38.6%"],
  ["model", "error", "model-router", "qwen3-72b-local 健康检查失败 3/3，已摘除节点"],
  ["tool", "warn", "tool-runner", "browser.navigate 调用频率异常，已限流"],
  ["tool", "info", "tool-runner", "工具终端执行沙箱镜像更新到 node20:1.4"],
  ["tool", "error", "tool-runner", "工具 db.readonly.query 执行被策略拒绝（deny 规则）"],
  ["mcp", "info", "mcp-bridge", "MCP filesystem 已连接，工具数 12"],
  ["mcp", "error", "mcp-bridge", "MCP feishu-mcp 心跳中断，进入重连退避"],
  ["mcp", "info", "mcp-bridge", "MCP redis-mcp 版本升级到 1.8.2"],
  ["sandbox", "info", "sandbox-pool", "预热池扩容 8 个实例，冷启动降至 4.9s"],
  ["sandbox", "error", "sandbox-pool", "镜像 cuda12-infer 扫描发现 3 个高危漏洞"],
  ["system", "info", "billing-service", "月度账单生成完成，共 16 张发票"],
  ["system", "warn", "billing-service", "3 个租户账单逾期，已发送提醒"],
  ["system", "info", "experiment-service", "实验 prompt-v2-rollout 放量到 35%"],
];

export const systemLogs: SystemLogEntry[] = Array.from({ length: 40 }).map((_, index) => {
  const random = createRandom(73_000 + index * 23);
  const template = LOG_TEMPLATES[index % LOG_TEMPLATES.length];
  return {
    id: `log-${String(index + 1).padStart(3, "0")}`,
    at: minutesAgo(randomInt(random, 1, 720)),
    level: template?.[1] ?? "info",
    channel: template?.[0] ?? "system",
    service: template?.[2] ?? "api-gateway",
    message: template?.[3] ?? "系统运行正常",
    traceId: `trace-${Math.round(random() * 0xfffff).toString(16).padStart(6, "0")}`,
    tenantName: pickOne(random, ["平台", "云启科技", "星辰银行", "蓝鲸零售", "拓维制造", "光年出行"]),
  };
});

export const slaReport = {
  month: "2026-08",
  target: 99.9,
  actual: 99.94,
  breaches: 1,
  totalIncidents: 4,
  mttrMinutes: 28,
  mtbfHours: 186,
  credits: 0,
};

export const backupStatus = {
  lastFullBackupAt: hoursAgo(7),
  lastIncrementalAt: hoursAgo(1),
  sizeGb: 486,
  retentionDays: 30,
  drDrillAt: hoursAgo(96),
  drDrillResult: "passed" as const,
  rpoMinutes: 15,
  rtoMinutes: 45,
  encrypted: true,
};
