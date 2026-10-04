export const LABELS: Record<string, string> = {
  // 套餐
  free: "免费版",
  team: "团队版",
  business: "商业版",
  enterprise: "企业版",
  // 组织
  company: "公司",
  department: "部门",
  // 用户来源
  "sso-oidc": "OIDC SSO",
  "sso-saml": "SAML SSO",
  ldap: "LDAP",
  scim: "SCIM 同步",
  invite: "邮件邀请",
  local: "本地账号",
  wecom: "企业微信",
  feishu: "飞书",
  dingtalk: "钉钉",
  // 角色范围
  platform: "平台级",
  tenant: "租户级",
  organization: "组织级",
  project: "项目级",
  // 权限动作
  read: "查看",
  write: "编辑",
  delete: "删除",
  approve: "审批",
  execute: "执行",
  admin: "管理",
  // 审批类型
  "model-onboarding": "模型接入",
  "production-access": "生产权限",
  "sensitive-tool": "敏感工具",
  "high-spend": "大额消耗",
  "temp-permission": "临时权限",
  "tool-registration": "工具注册",
  "agent-publish": "Agent 上架",
  // 模型能力
  chat: "对话",
  reasoning: "推理",
  vision: "视觉",
  audio: "语音",
  embedding: "向量",
  rerank: "重排序",
  "tool-calling": "工具调用",
  "json-mode": "JSON 模式",
  "long-context": "长上下文",
  // 供应商类型
  "open-source": "开源模型",
  gateway: "企业网关",
  // 模型接入方式
  byok: "BYOK 自有密钥",
  "custom-endpoint": "自定义 Endpoint",
  // 数据流向
  "in-region": "境内就近",
  domestic: "境内",
  overseas: "境外",
  unknown: "未确认",
  // 费用归属
  shared: "共同承担",
  // 路由策略
  cost: "成本优先",
  latency: "延迟优先",
  availability: "可用性优先",
  quality: "质量优先",
  "round-robin": "轮询",
  // 工具分类
  file: "文件读写",
  terminal: "终端执行",
  search: "搜索",
  git: "Git 操作",
  browser: "浏览器",
  http: "HTTP API",
  database: "数据库",
  custom: "自定义",
  // 工具来源
  builtin: "内置",
  marketplace: "市场",
  openapi: "OpenAPI 导入",
  // Agent 分类
  coding: "编码",
  review: "代码审查",
  testing: "测试",
  ops: "运维",
  data: "数据分析",
  writing: "文档写作",
  support: "客户支持",
  // 市场
  paid: "付费",
  internal: "内部",
  // 项目
  frontend: "前端",
  backend: "后端",
  research: "研究",
  // 工作区 / 沙箱
  "deny-all": "全部禁止",
  allowlist: "白名单",
  "proxy-only": "仅代理",
  // 传输
  sse: "SSE",
  "streamable-http": "Streamable HTTP",
  stdio: "STDIO",
  // 鉴权
  "api-key": "API Key",
  oauth: "OAuth",
  mtls: "mTLS",
  none: "无",
  // 告警类型
  "permission-change": "权限变更",
  "model-unavailable": "模型不可用",
  security: "安全",
  quota: "配额",
  // 渠道
  email: "邮件",
  slack: "Slack",
  webhook: "Webhook",
  sms: "短信",
  // 集成分类
  im: "即时通讯",
  cicd: "CI/CD",
  observability: "可观测性",
  // 实验
  "feature-flag": "功能开关",
  "ab-test": "A/B 实验",
  "rolling-release": "灰度发布",
  shadow: "影子模式",
  // 释放策略
  canary: "金丝雀",
  "blue-green": "蓝绿",
  rolling: "滚动",
  // 数据保留
  "auto-delete": "自动删除",
  anonymize: "匿名化",
  archive: "归档",
  manual: "人工审批",
  // 合规框架
  SOC2: "SOC 2",
  GDPR: "GDPR",
  ISO27001: "ISO 27001",
  "等保2.0": "等保 2.0",
  "PCI-DSS": "PCI DSS",
  // 沙箱基线
  cis: "CIS Benchmark",
  "pci-dss": "PCI-DSS 基线",
  "internal-baseline": "内部基线",
  // 计费方式
  invoice: "对公转账",
  card: "信用卡",
  wire: "电汇",
  alipay: "支付宝",
  balance: "余额抵扣",
  // 风险 / 严重度
  "prompt-injection": "提示注入",
  jailbreak: "越狱攻击",
  pii: "个人隐私",
  illegal: "违规内容",
  toxicity: "有害内容",
  credential: "凭据泄露",
  financial: "金融数据",
  "source-code": "源码外泄",
  // 协议
  "sse-only": "仅 SSE",
};

export function label(code: string): string {
  return LABELS[code] ?? code;
}

export const RISK_LABEL: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};
