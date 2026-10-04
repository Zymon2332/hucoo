import type { AuditLog, TraceSpan } from "@/types";
import { createRandom, minutesAgo, pickOne, randomInt } from "./seed";
import { tenants } from "./tenants";
import { users } from "./users";

interface AuditAction {
  action: string;
  label: string;
  resourceType: string;
  detail: string;
  risk: AuditLog["riskLevel"];
}

const AUDIT_ACTIONS: AuditAction[] = [
  { action: "tenant.update", label: "更新租户配置", resourceType: "租户", detail: "调整租户套餐与配额上限", risk: "medium" },
  { action: "tenant.suspend", label: "暂停租户", resourceType: "租户", detail: "因欠费暂停租户服务", risk: "high" },
  { action: "user.invite", label: "邀请成员", resourceType: "用户", detail: "发送邀请邮件并分配默认角色", risk: "low" },
  { action: "user.disable", label: "禁用成员", resourceType: "用户", detail: "离职流程触发的账号禁用", risk: "medium" },
  { action: "role.grant", label: "授予角色", resourceType: "角色", detail: "为成员授予租户管理员角色", risk: "high" },
  { action: "role.revoke", label: "回收角色", resourceType: "角色", detail: "回收临时权限（到期自动）", risk: "medium" },
  { action: "model.publish", label: "上架平台模型", resourceType: "平台模型", detail: "将模型可见范围调整为公开", risk: "medium" },
  { action: "model.approve", label: "通过模型接入申请", resourceType: "自定义模型", detail: "审核通过 BYOK 接入申请", risk: "high" },
  { action: "model.reject", label: "拒绝模型接入申请", resourceType: "自定义模型", detail: "因数据流向材料不足驳回", risk: "low" },
  { action: "model.disable", label: "禁用自定义模型", resourceType: "自定义模型", detail: "验证失败后自动禁用", risk: "high" },
  { action: "key.rotate", label: "轮换 BYOK 密钥", resourceType: "模型密钥", detail: "完成季度密钥轮换并更新引用", risk: "high" },
  { action: "key.revoke", label: "撤销密钥", resourceType: "模型密钥", detail: "疑似泄露后紧急撤销", risk: "critical" },
  { action: "tool.register", label: "注册工具", resourceType: "工具", detail: "通过 OpenAPI 导入注册工具", risk: "medium" },
  { action: "tool.approve", label: "通过工具注册", resourceType: "工具", detail: "审核通过并加入白名单", risk: "high" },
  { action: "tool.policy.update", label: "更新命令策略", resourceType: "命令策略", detail: "新增 deny 规则", risk: "high" },
  { action: "mcp.create", label: "新增 MCP Server", resourceType: "MCP", detail: "注册 Streamable HTTP 服务", risk: "medium" },
  { action: "mcp.disable", label: "停用 MCP Server", resourceType: "MCP", detail: "健康检查连续失败自动停用", risk: "medium" },
  { action: "agent.publish", label: "上架 Agent 模板", resourceType: "Agent 模板", detail: "模板通过审核并上架市场", risk: "medium" },
  { action: "agent.rollback", label: "回滚 Agent 版本", resourceType: "Agent 模板", detail: "灰度指标劣化触发回滚", risk: "high" },
  { action: "project.policy.update", label: "更新项目策略", resourceType: "项目", detail: "开启敏感文件保护", risk: "medium" },
  { action: "sandbox.recycle", label: "回收沙箱", resourceType: "沙箱", detail: "空闲超时自动回收", risk: "low" },
  { action: "sandbox.scan", label: "镜像漏洞扫描", resourceType: "沙箱镜像", detail: "扫描发现高危漏洞 3 个", risk: "high" },
  { action: "billing.invoice.issue", label: "开具发票", resourceType: "发票", detail: "月度账单开票", risk: "low" },
  { action: "budget.update", label: "调整预算", resourceType: "预算", detail: "季度预算追加审批通过", risk: "medium" },
  { action: "audit.export", label: "导出审计日志", resourceType: "审计日志", detail: "导出近 90 天日志用于合规检查", risk: "medium" },
  { action: "dlp.rule.update", label: "更新 DLP 规则", resourceType: "DLP", detail: "新增银行卡号阻断规则", risk: "high" },
  { action: "security.ip.block", label: "封禁来源 IP", resourceType: "IP 策略", detail: "封禁异常来源网段", risk: "high" },
  { action: "alert.ack", label: "确认告警", resourceType: "告警", detail: "值班人员确认成本告警", risk: "low" },
  { action: "experiment.start", label: "启动实验", resourceType: "实验", detail: "启动成本路由 A/B 实验", risk: "medium" },
  { action: "experiment.stop", label: "停止实验", resourceType: "实验", detail: "审批链实验回滚", risk: "medium" },
  { action: "integration.install", label: "安装集成", resourceType: "集成", detail: "安装 GitHub 代码仓库集成", risk: "medium" },
  { action: "setting.update", label: "修改系统设置", resourceType: "系统设置", detail: "开启强制多因素认证", risk: "high" },
  { action: "sso.update", label: "更新 SSO 配置", resourceType: "身份源", detail: "调整 OIDC 断言映射", risk: "high" },
  { action: "scim.sync", label: "触发 SCIM 同步", resourceType: "目录同步", detail: "增量同步 42 名成员", risk: "low" },
  { action: "auth.login", label: "登录控制台", resourceType: "会话", detail: "通过 SSO 登录管理控制台", risk: "low" },
  { action: "auth.denied", label: "越权访问被拒绝", resourceType: "权限", detail: "尝试访问未授权项目被拒绝", risk: "high" },
];

export const auditLogs: AuditLog[] = Array.from({ length: 64 }).map((_, index) => {
  const random = createRandom(61_000 + index * 29);
  const action =
    AUDIT_ACTIONS[randomInt(random, 0, AUDIT_ACTIONS.length - 1)] ?? AUDIT_ACTIONS[0]!;
  const tenant = tenants[randomInt(random, 0, tenants.length - 1)];
  const actor = users[randomInt(random, 0, users.length - 1)];
  const result =
    action.action === "auth.denied" ? "denied" : random() > 0.94 ? "failure" : "success";
  const actorType = random() > 0.86 ? (random() > 0.5 ? "system" : "service-account") : random() > 0.9 ? "api-key" : "user";
  return {
    id: `audit-${String(index + 1).padStart(3, "0")}`,
    at: minutesAgo(randomInt(random, 2, 4_320)),
    actorName: actorType === "system" ? "系统" : actorType === "user" ? (actor?.name ?? "—") : actorType === "service-account" ? "ci-deploy-bot" : "ak_live_9f2c",
    actorEmail: actorType === "user" ? (actor?.email ?? "—") : actorType === "system" ? "system@agent-platform.cn" : "bot@cloudnova.cn",
    actorType,
    tenantName: tenant?.name ?? "—",
    action: action.action,
    actionLabel: action.label,
    resourceType: action.resourceType,
    resourceName: pickOne(random, [
      `${tenant?.name ?? "平台"} 主配置`,
      "gpt-4.1-finance-gw",
      "claude-sonnet-code",
      "terminal.execute",
      "filesystem-mcp",
      "coding-assistant v2.3.1",
      "Agent 门户前端",
      "node20-standard",
      "值班邮件组",
      "allowCustomModels",
    ]),
    result,
    ip: `203.0.113.${randomInt(random, 2, 240)}`,
    location: pickOne(random, ["上海", "北京", "深圳", "杭州", "成都", "天津"]),
    userAgent: pickOne(random, ["Chrome/131 · macOS", "Edge/130 · Windows", "Safari/18 · macOS", "内部 CLI/1.8", "服务账号 SDK"]),
    riskLevel: action.risk,
    detail: action.detail,
  };
});

export const traceSpans: TraceSpan[] = Array.from({ length: 18 }).map((_, index) => {
  const random = createRandom(62_000 + index * 19);
  const status = pickOne(random, ["ok", "ok", "ok", "ok", "slow", "error"]) as TraceSpan["status"];
  return {
    id: `span-${String(index + 1).padStart(3, "0")}`,
    traceId: `trace-${Math.round(random() * 0xfffff).toString(16).padStart(6, "0")}`,
    span: pickOne(random, [
      "gateway.receive",
      "auth.verify",
      "policy.evaluate",
      "model.route",
      "model.invoke",
      "tool.call",
      "mcp.call",
      "sandbox.exec",
      "guardrail.check",
      "usage.record",
    ]),
    service: pickOne(random, ["api-gateway", "policy-engine", "model-router", "tool-runner", "mcp-bridge", "sandbox-pool", "usage-collector"]),
    status,
    durationMs: status === "slow" ? randomInt(random, 1_800, 4_800) : status === "error" ? randomInt(random, 120, 900) : randomInt(random, 12, 620),
    startedAt: minutesAgo(randomInt(random, 1, 180)),
    model: pickOne(random, ["gpt-4.1", "claude-sonnet-4.5", "qwen3-235b-a22b", "deepseek-v3.2", "-"]),
    tokens: randomInt(random, 0, 8_400),
  };
});

export const auditActionOptions = Array.from(
  auditLogs.reduce((map, log) => {
    map.set(log.actionLabel, log.action);
    return map;
  }, new Map<string, string>()),
).map(([label, value]) => ({ label, value }));
