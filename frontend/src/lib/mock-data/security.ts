import type {
  ComplianceItem,
  ContentFilterRule,
  DataRetentionPolicy,
  DlpRule,
  IpAllowlistEntry,
  KmsKey,
} from "@/types";
import { createRandom, daysAgo, daysFromNow, pickMany, pickOne, randomInt } from "./seed";

const DLP_SEEDS: [string, string, DlpRule["category"], DlpRule["action"], number][] = [
  ["身份证号识别", "\\b\\d{17}[\\dXx]\\b", "pii", "mask", 1_284],
  ["手机号识别", "\\b1[3-9]\\d{9}\\b", "pii", "mask", 8_642],
  ["银行卡号识别", "\\b\\d{16,19}\\b", "financial", "block", 96],
  ["API Key 泄露", "(sk|ak|ghp)_[A-Za-z0-9]{16,}", "credential", "block", 42],
  ["私钥内容", "-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----", "credential", "block", 7],
  ["数据库连接串", "(postgres|mysql|mongodb)://[^\\s]+", "credential", "block", 18],
  ["源码仓库地址", "git@[\\w.-]+:[\\w./-]+\\.git", "source-code", "warn", 312],
  ["客户订单编号", "\\bORD-\\d{10}\\b", "custom", "log", 5_420],
  ["薪资表字段", "(基本工资|绩效工资|年终奖)", "financial", "block", 24],
  ["医疗诊断关键词", "(诊断结论|病历号|住院号)", "pii", "mask", 168],
];

export const dlpRules: DlpRule[] = DLP_SEEDS.map(([name, pattern, category, action, hitCount], index) => {
  const random = createRandom(51_000 + index * 13);
  return {
    id: `dlp-${String(index + 1).padStart(2, "0")}`,
    name,
    pattern,
    category,
    action,
    scope: pickOne(random, ["全局", "全部租户", "星辰银行", "天穹保险", "生产环境"]),
    enabled: index !== 7,
    hitCount,
    updatedAt: daysAgo(randomInt(random, 1, 90), randomInt(random, 9, 19)),
  };
});

export const kmsKeys: KmsKey[] = [
  { id: "kms-01", name: "平台主密钥", provider: "kms", algorithm: "AES-256-GCM", rotationDays: 90, lastRotatedAt: daysAgo(21), status: "active", custodian: "钱枫", usageCount: 128_400 },
  { id: "kms-02", name: "BYOK 保险箱密钥", provider: "vault", algorithm: "AES-256-GCM + HMAC", rotationDays: 30, lastRotatedAt: daysAgo(6), status: "active", custodian: "钱枫", usageCount: 42_800 },
  { id: "kms-03", name: "审计日志签名密钥", provider: "kms", algorithm: "Ed25519", rotationDays: 180, lastRotatedAt: daysAgo(96), status: "active", custodian: "孙晓", usageCount: 86_200 },
  { id: "kms-04", name: "租户数据加密密钥（星辰银行）", provider: "local-hsm", algorithm: "SM4-GCM", rotationDays: 90, lastRotatedAt: daysAgo(44), status: "rotating", custodian: "赵敏", usageCount: 18_600 },
  { id: "kms-05", name: "沙箱快照加密密钥", provider: "kms", algorithm: "AES-256-GCM", rotationDays: 60, lastRotatedAt: daysAgo(58), status: "active", custodian: "宋茜", usageCount: 32_100 },
  { id: "kms-06", name: "Webhook 签名密钥", provider: "vault", algorithm: "HMAC-SHA256", rotationDays: 30, lastRotatedAt: daysAgo(29), status: "active", custodian: "邓可", usageCount: 9_240 },
  { id: "kms-07", name: "旧版备份密钥", provider: "kms", algorithm: "AES-128-CBC", rotationDays: 365, lastRotatedAt: daysAgo(412), status: "disabled", custodian: "陈立", usageCount: 0 },
  { id: "kms-08", name: "联邦身份断言签名", provider: "vault", algorithm: "RS256", rotationDays: 180, lastRotatedAt: daysAgo(172), status: "rotating", custodian: "马骏", usageCount: 4_860 },
];

export const ipAllowlistEntries: IpAllowlistEntry[] = [
  { id: "ip-01", cidr: "203.0.113.0/24", label: "上海办公出口", scope: "全局", effect: "allow", expiresAt: null, addedBy: "陈立", createdAt: daysAgo(200) },
  { id: "ip-02", cidr: "198.51.100.16/28", label: "北京办公出口", scope: "全局", effect: "allow", expiresAt: null, addedBy: "孙晓", createdAt: daysAgo(180) },
  { id: "ip-03", cidr: "10.20.0.0/16", label: "内网办公网段", scope: "控制台", effect: "deny", expiresAt: null, addedBy: "孙晓", createdAt: daysAgo(160) },
  { id: "ip-04", cidr: "192.0.2.34/32", label: "临时运维跳板机", scope: "生产环境", effect: "allow", expiresAt: daysFromNow(12), addedBy: "宋茜", createdAt: daysAgo(18) },
  { id: "ip-05", cidr: "0.0.0.0/0", label: "默认拒绝", scope: "API", effect: "deny", expiresAt: null, addedBy: "系统", createdAt: daysAgo(400) },
  { id: "ip-06", cidr: "203.0.113.88/32", label: "CI Runner", scope: "API", effect: "allow", expiresAt: null, addedBy: "邓可", createdAt: daysAgo(90) },
  { id: "ip-07", cidr: "45.77.0.0/16", label: "已封禁可疑来源", scope: "全局", effect: "deny", expiresAt: daysFromNow(60), addedBy: "孙晓", createdAt: daysAgo(9) },
  { id: "ip-08", cidr: "198.51.100.200/32", label: "外包驻场（限时）", scope: "控制台", effect: "allow", expiresAt: daysFromNow(5), addedBy: "赵敏", createdAt: daysAgo(25) },
];

const FILTER_SEEDS: [string, ContentFilterRule["category"], ContentFilterRule["action"], ContentFilterRule["severity"], number][] = [
  ["提示注入防护", "prompt-injection", "block", "critical", 284],
  ["越狱指令识别", "jailbreak", "block", "critical", 168],
  ["违规内容过滤", "illegal", "block", "critical", 42],
  ["有害言论过滤", "toxicity", "flag", "high", 126],
  ["输出隐私脱敏", "pii", "mask", "high", 964],
  ["输出合规检查", "custom", "block", "critical", 58],
  ["代码泄露防护", "custom", "flag", "medium", 312],
  ["多轮攻击检测", "jailbreak", "block", "critical", 74],
  ["诱导支付指令", "custom", "block", "high", 9],
  ["自定义黑名单词库", "custom", "mask", "medium", 1_842],
];

export const contentFilterRules: ContentFilterRule[] = FILTER_SEEDS.map(
  ([name, category, action, severity, hitCount], index) => {
    const random = createRandom(52_000 + index * 17);
    return {
      id: `cf-${String(index + 1).padStart(2, "0")}`,
      name,
      stage: pickOne(random, ["input", "output", "both"]) as ContentFilterRule["stage"],
      category,
      action,
      severity,
      hitCount,
      enabled: index !== 8,
      updatedAt: daysAgo(randomInt(random, 1, 120), randomInt(random, 9, 19)),
    };
  },
);

interface ComplianceSeed {
  framework: ComplianceItem["framework"];
  control: string;
  status: ComplianceItem["status"];
  evidence: string;
  dueInDays: number;
}

const COMPLIANCE_SEEDS: ComplianceSeed[] = [
  { framework: "SOC2", control: "CC6.1 逻辑访问控制", status: "compliant", evidence: "权限矩阵导出 + 季度评审记录", dueInDays: 60 },
  { framework: "SOC2", control: "CC6.6 边界防护", status: "compliant", evidence: "网络策略快照 + 渗透测试报告", dueInDays: 45 },
  { framework: "SOC2", control: "CC7.2 安全事件监控", status: "partial", evidence: "告警规则清单（缺少自动分级）", dueInDays: 20 },
  { framework: "SOC2", control: "CC8.1 变更管理", status: "compliant", evidence: "发布流水线记录 + 回滚演练", dueInDays: 90 },
  { framework: "GDPR", control: "Art.15 数据主体访问权", status: "compliant", evidence: "数据导出 API 与工单流程", dueInDays: 120 },
  { framework: "GDPR", control: "Art.17 被遗忘权", status: "partial", evidence: "删除流程已实现，备份清理滞后", dueInDays: 30 },
  { framework: "GDPR", control: "Art.32 处理安全性", status: "compliant", evidence: "KMS 轮换记录与加密说明", dueInDays: 75 },
  { framework: "GDPR", control: "Art.44 跨境传输", status: "non-compliant", evidence: "缺失标准合同条款文件", dueInDays: 14 },
  { framework: "ISO27001", control: "A.8 资产管理", status: "compliant", evidence: "CMDB 资产台账", dueInDays: 60 },
  { framework: "ISO27001", control: "A.12 运行安全", status: "compliant", evidence: "运维 SOP 与备份恢复演练", dueInDays: 40 },
  { framework: "ISO27001", control: "A.14 开发安全", status: "partial", evidence: "SAST 已接入，DAST 待补", dueInDays: 25 },
  { framework: "等保2.0", control: "三级-身份鉴别", status: "compliant", evidence: "双因素与 SSO 配置截图", dueInDays: 100 },
  { framework: "等保2.0", control: "三级-访问控制", status: "compliant", evidence: "权限最小化评审报告", dueInDays: 80 },
  { framework: "等保2.0", control: "三级-安全审计", status: "partial", evidence: "日志留存 180 天，未达 180 天签名", dueInDays: 18 },
  { framework: "PCI-DSS", control: "Req.3 持卡人数据保护", status: "not-applicable", evidence: "平台不存储卡数据", dueInDays: 200 },
];

export const complianceItems: ComplianceItem[] = COMPLIANCE_SEEDS.map((seed, index) => {
  const random = createRandom(53_000 + index * 19);
  return {
    id: `cmp-${String(index + 1).padStart(2, "0")}`,
    framework: seed.framework,
    control: seed.control,
    status: seed.status,
    owner: pickOne(random, ["孙晓", "马骏", "袁莉", "赵敏", "陈立"]),
    evidence: seed.evidence,
    dueAt: daysFromNow(seed.dueInDays),
    lastCheckedAt: daysAgo(randomInt(random, 3, 90), randomInt(random, 9, 19)),
  };
});

export const dataRetentionPolicies: DataRetentionPolicy[] = [
  { id: "dr-01", dataType: "审计日志", retentionDays: 180, deletionMode: "archive", exportEnabled: true, jurisdiction: "境内", updatedAt: daysAgo(30) },
  { id: "dr-02", dataType: "模型调用明细", retentionDays: 90, deletionMode: "anonymize", exportEnabled: true, jurisdiction: "境内", updatedAt: daysAgo(45) },
  { id: "dr-03", dataType: "Prompt / 补全内容", retentionDays: 30, deletionMode: "auto-delete", exportEnabled: false, jurisdiction: "境内", updatedAt: daysAgo(12) },
  { id: "dr-04", dataType: "用户个人信息", retentionDays: 365, deletionMode: "manual", exportEnabled: true, jurisdiction: "境内", updatedAt: daysAgo(60) },
  { id: "dr-05", dataType: "沙箱执行日志", retentionDays: 14, deletionMode: "auto-delete", exportEnabled: false, jurisdiction: "境内", updatedAt: daysAgo(8) },
  { id: "dr-06", dataType: "账单与发票", retentionDays: 1_825, deletionMode: "manual", exportEnabled: true, jurisdiction: "境内", updatedAt: daysAgo(120) },
  { id: "dr-07", dataType: "跨境模型调用记录", retentionDays: 90, deletionMode: "archive", exportEnabled: true, jurisdiction: "跨境", updatedAt: daysAgo(20) },
  { id: "dr-08", dataType: "DLP 命中记录", retentionDays: 180, deletionMode: "archive", exportEnabled: true, jurisdiction: "境内", updatedAt: daysAgo(15) },
];

export const securityPosture = {
  dlpHitsToday: 1_842,
  injectionsBlocked: 284,
  keysDueRotation: kmsKeys.filter((key) => key.status === "rotating").length,
  ipDeniedToday: 96,
  complianceScore: 82,
  openFindings: complianceItems.filter((item) => item.status === "non-compliant" || item.status === "partial").length,
  sessionsActive: 428,
  unauthorizedAttempts: 12,
};

export const watermarkPolicy = {
  enabled: true,
  mode: "不可见水印 + 可见角标",
  traceable: true,
  fields: pickMany(createRandom(54_000), ["租户 ID", "用户 ID", "会话 ID", "时间戳", "模型版本"], 4),
};
