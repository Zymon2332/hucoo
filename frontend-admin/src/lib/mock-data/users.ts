import type { ApiKeyRecord, ServiceAccount, SsoConfig, User, UserSource, UserStatus } from "@/types";
import { createRandom, daysAgo, daysFromNow, fingerprint, hoursAgo, pickOne, randomInt } from "./seed";
import { organizations } from "./tenants";
import { roles } from "./roles";

interface UserSeed {
  name: string;
  email: string;
  tenantId: string;
  orgId: string;
  roleIds: string[];
  status: UserStatus;
  source: UserSource;
  title: string;
  department: string;
  mfa: boolean;
}

const USER_SEEDS: UserSeed[] = [
  { name: "陈立", email: "chenli@cloudnova.cn", tenantId: "tn-01", orgId: "org-01", roleIds: ["role-01"], status: "active", source: "sso-oidc", title: "平台负责人", department: "智能引擎事业部", mfa: true },
  { name: "许安", email: "xuan@cloudnova.cn", tenantId: "tn-01", orgId: "org-04", roleIds: ["role-03"], status: "active", source: "sso-oidc", title: "模型审核员", department: "Agent 平台组", mfa: true },
  { name: "宋茜", email: "songqian@cloudnova.cn", tenantId: "tn-01", orgId: "org-04", roleIds: ["role-09"], status: "active", source: "sso-oidc", title: "高级工程师", department: "Agent 平台组", mfa: false },
  { name: "高远", email: "gaoyuan@cloudnova.cn", tenantId: "tn-01", orgId: "org-05", roleIds: ["role-08"], status: "invited", source: "invite", title: "运营经理", department: "数据智能组", mfa: false },
  { name: "赵敏", email: "zhaomin@stellarbank.com", tenantId: "tn-02", orgId: "org-06", roleIds: ["role-02"], status: "active", source: "sso-saml", title: "金融科技部总经理", department: "金融科技部", mfa: true },
  { name: "钱枫", email: "qianfeng@stellarbank.com", tenantId: "tn-02", orgId: "org-08", roleIds: ["role-04"], status: "active", source: "sso-saml", title: "密钥管理员", department: "风控研发组", mfa: true },
  { name: "孙晓", email: "sunxiao@stellarbank.com", tenantId: "tn-02", orgId: "org-08", roleIds: ["role-05"], status: "active", source: "ldap", title: "安全审计", department: "风控研发组", mfa: true },
  { name: "李锐", email: "lirui@stellarbank.com", tenantId: "tn-02", orgId: "org-07", roleIds: ["role-09"], status: "locked", source: "sso-saml", title: "研发工程师", department: "金融科技部", mfa: false },
  { name: "林嘉", email: "linjia@bluewhale.com", tenantId: "tn-03", orgId: "org-09", roleIds: ["role-02"], status: "active", source: "wecom", title: "技术负责人", department: "供应链技术部", mfa: true },
  { name: "钟怡", email: "zhongyi@bluewhale.com", tenantId: "tn-03", orgId: "org-10", roleIds: ["role-06"], status: "active", source: "wecom", title: "财务BP", department: "供应链技术部", mfa: false },
  { name: "吴桐", email: "wutong@shanhai.health", tenantId: "tn-04", orgId: "org-11", roleIds: ["role-02"], status: "active", source: "dingtalk", title: "信息中心主任", department: "信息中心", mfa: true },
  { name: "周越", email: "zhouyue@aurora-edu.cn", tenantId: "tn-05", orgId: "org-12", roleIds: ["role-02", "role-06"], status: "active", source: "feishu", title: "产品总监", department: "产品部", mfa: false },
  { name: "郑海", email: "zhenghai@tuowei.com", tenantId: "tn-06", orgId: "org-13", roleIds: ["role-01"], status: "active", source: "scim", title: "数字化负责人", department: "数字化部", mfa: true },
  { name: "孙倩", email: "sunqian@lightyear.io", tenantId: "tn-07", orgId: "org-14", roleIds: ["role-03"], status: "active", source: "sso-oidc", title: "算法平台负责人", department: "算法部", mfa: true },
  { name: "何笑", email: "hexiao@shiguang.media", tenantId: "tn-08", orgId: "org-15", roleIds: ["role-02"], status: "pending", source: "invite", title: "内容负责人", department: "内容工作室", mfa: false },
  { name: "马骏", email: "majun@skyvault.com", tenantId: "tn-09", orgId: "org-16", roleIds: ["role-02", "role-05"], status: "active", source: "sso-saml", title: "科技部总经理", department: "科技部", mfa: true },
  { name: "范宇", email: "fanyu@brook-energy.cn", tenantId: "tn-10", orgId: "org-01", roleIds: ["role-09"], status: "disabled", source: "local", title: "数据工程师", department: "数据组", mfa: false },
  { name: "邓可", email: "dengke@jupiter.shop", tenantId: "tn-11", orgId: "org-03", roleIds: ["role-02"], status: "active", source: "feishu", title: "技术负责人", department: "电商技术部", mfa: true },
  { name: "方岩", email: "fangyan@hengyu-logistics.com", tenantId: "tn-12", orgId: "org-01", roleIds: ["role-02"], status: "active", source: "sso-oidc", title: "IT 总监", department: "IT 部", mfa: false },
  { name: "雷蕾", email: "leilei@cloudnova.cn", tenantId: "tn-01", orgId: "org-04", roleIds: ["role-09", "role-07"], status: "active", source: "sso-oidc", title: "前端工程师", department: "Agent 平台组", mfa: false },
  { name: "汤鹏", email: "tangpeng@cloudnova.cn", tenantId: "tn-01", orgId: "org-03", roleIds: ["role-06"], status: "active", source: "sso-oidc", title: "财务分析师", department: "风控平台部", mfa: true },
  { name: "袁莉", email: "yuanli@stellarbank.com", tenantId: "tn-02", orgId: "org-07", roleIds: ["role-07"], status: "active", source: "ldap", title: "合规专员", department: "金融科技部", mfa: true },
];

const roleNameById = new Map(roles.map((role) => [role.id, role.name]));
const orgById = new Map(organizations.map((org) => [org.id, org]));

export const users: User[] = USER_SEEDS.map((seed, index) => {
  const random = createRandom(3000 + index * 17);
  const org = orgById.get(seed.orgId);
  const tenantId = seed.tenantId;
  const tenantName =
    {
      "tn-01": "云启科技",
      "tn-02": "星辰银行",
      "tn-03": "蓝鲸零售",
      "tn-04": "山海医疗",
      "tn-05": "极光教育",
      "tn-06": "拓维制造",
      "tn-07": "光年出行",
      "tn-08": "拾光传媒",
      "tn-09": "天穹保险",
      "tn-10": "溪流能源",
      "tn-11": "木星电商",
      "tn-12": "恒宇物流",
    }[tenantId] ?? "—";

  return {
    id: `usr-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    email: seed.email,
    phone: `1${randomInt(random, 3, 9)}${String(randomInt(random, 100000000, 999999999))}`,
    tenantId,
    tenantName,
    orgId: seed.orgId,
    orgName: org?.name ?? "—",
    department: seed.department,
    title: seed.title,
    roles: seed.roleIds,
    roleNames: seed.roleIds.map((id) => roleNameById.get(id) ?? id),
    status: seed.status,
    source: seed.source,
    mfaEnabled: seed.mfa,
    lastLoginAt: seed.status === "invited" || seed.status === "pending" ? daysAgo(randomInt(random, 20, 60)) : hoursAgo(randomInt(random, 1, 240), randomInt(random, 0, 59)),
    createdAt: daysAgo(randomInt(random, 30, 800), randomInt(random, 9, 19)),
    apiKeyCount: seed.status === "active" ? randomInt(random, 0, 6) : 0,
    deviceCount: seed.status === "active" ? randomInt(random, 1, 4) : 0,
  };
});

export function getUserById(id: string) {
  return users.find((user) => user.id === id);
}

export const ssoConfigs: SsoConfig[] = [
  {
    id: "sso-01",
    provider: "oidc",
    name: "云启科技 OIDC",
    status: "enabled",
    domain: "cloudnova.cn",
    issuer: "https://sso.cloudnova.cn/realms/agent",
    clientId: "agent-platform-admin",
    metadataUrl: "https://sso.cloudnova.cn/realms/agent/.well-known/openid-configuration",
    scimEnabled: true,
    jitProvisioning: true,
    enforced: true,
    syncedUsers: 268,
    lastSyncAt: hoursAgo(2),
    syncStatus: "success",
  },
  {
    id: "sso-02",
    provider: "saml",
    name: "星辰银行 SAML 2.0",
    status: "enabled",
    domain: "stellarbank.com",
    issuer: "https://sts.stellarbank.com/adfs",
    clientId: "urn:agent:stellarbank",
    metadataUrl: "https://sts.stellarbank.com/FederationMetadata/2007-06/FederationMetadata.xml",
    scimEnabled: true,
    jitProvisioning: false,
    enforced: true,
    syncedUsers: 412,
    lastSyncAt: hoursAgo(6),
    syncStatus: "success",
  },
  {
    id: "sso-03",
    provider: "ldap",
    name: "星辰银行内网 LDAP",
    status: "enabled",
    domain: "corp.stellarbank.com",
    issuer: "ldaps://ldap.stellarbank.com:636",
    clientId: "cn=agent,ou=svc,dc=corp,dc=stellarbank,dc=com",
    metadataUrl: "-",
    scimEnabled: false,
    jitProvisioning: true,
    enforced: false,
    syncedUsers: 96,
    lastSyncAt: hoursAgo(30),
    syncStatus: "failed",
  },
  {
    id: "sso-04",
    provider: "wecom",
    name: "蓝鲸零售企业微信",
    status: "enabled",
    domain: "bluewhale.com",
    issuer: "https://qyapi.weixin.qq.com",
    clientId: "ww9f2c1a8b7e",
    metadataUrl: "-",
    scimEnabled: true,
    jitProvisioning: true,
    enforced: false,
    syncedUsers: 182,
    lastSyncAt: hoursAgo(1),
    syncStatus: "success",
  },
  {
    id: "sso-05",
    provider: "feishu",
    name: "极光教育飞书",
    status: "enabled",
    domain: "aurora-edu.cn",
    issuer: "https://open.feishu.cn",
    clientId: "cli_a1b2c3d4",
    metadataUrl: "-",
    scimEnabled: false,
    jitProvisioning: true,
    enforced: false,
    syncedUsers: 74,
    lastSyncAt: hoursAgo(4),
    syncStatus: "running",
  },
  {
    id: "sso-06",
    provider: "dingtalk",
    name: "山海医疗钉钉",
    status: "configuring",
    domain: "shanhai.health",
    issuer: "https://oapi.dingtalk.com",
    clientId: "ding9x8y7z",
    metadataUrl: "-",
    scimEnabled: false,
    jitProvisioning: false,
    enforced: false,
    syncedUsers: 0,
    lastSyncAt: daysAgo(2),
    syncStatus: "idle",
  },
  {
    id: "sso-07",
    provider: "oidc",
    name: "拓维制造 OIDC",
    status: "error",
    domain: "tuowei.com",
    issuer: "https://id.tuowei.com",
    clientId: "tuowei-agent-admin",
    metadataUrl: "https://id.tuowei.com/.well-known/openid-configuration",
    scimEnabled: true,
    jitProvisioning: false,
    enforced: true,
    syncedUsers: 132,
    lastSyncAt: hoursAgo(52),
    syncStatus: "failed",
  },
  {
    id: "sso-08",
    provider: "oidc",
    name: "天穹保险 OIDC",
    status: "disabled",
    domain: "skyvault.com",
    issuer: "https://login.skyvault.com/oauth2",
    clientId: "skyvault-admin",
    metadataUrl: "https://login.skyvault.com/oauth2/.well-known/openid-configuration",
    scimEnabled: false,
    jitProvisioning: false,
    enforced: false,
    syncedUsers: 208,
    lastSyncAt: daysAgo(45),
    syncStatus: "idle",
  },
];

export const serviceAccounts: ServiceAccount[] = [
  { id: "sa-01", name: "ci-deploy-bot", type: "service-account", tenantName: "云启科技", owner: "陈立", scopes: ["project:write", "sandbox:execute"], status: "active", keyCount: 2, lastUsedAt: minutesAgoSafe(18), expiresAt: daysFromNow(180), createdAt: daysAgo(220) },
  { id: "sa-02", name: "billing-exporter", type: "service-account", tenantName: "云启科技", owner: "汤鹏", scopes: ["billing:read"], status: "active", keyCount: 1, lastUsedAt: minutesAgoSafe(240), expiresAt: daysFromNow(60), createdAt: daysAgo(150) },
  { id: "sa-03", name: "risk-scan-runner", type: "machine-identity", tenantName: "星辰银行", owner: "孙晓", scopes: ["audit:read", "model:validate"], status: "active", keyCount: 3, lastUsedAt: minutesAgoSafe(42), expiresAt: daysFromNow(365), createdAt: daysAgo(310) },
  { id: "sa-04", name: "k8s-operator", type: "machine-identity", tenantName: "蓝鲸零售", owner: "林嘉", scopes: ["sandbox:admin"], status: "active", keyCount: 1, lastUsedAt: minutesAgoSafe(9), expiresAt: daysFromNow(90), createdAt: daysAgo(120) },
  { id: "sa-05", name: "data-pipeline", type: "service-account", tenantName: "拓维制造", owner: "郑海", scopes: ["usage:read", "cost:read"], status: "disabled", keyCount: 0, lastUsedAt: daysAgo(31), expiresAt: daysFromNow(120), createdAt: daysAgo(400) },
  { id: "sa-06", name: "agent-gateway", type: "machine-identity", tenantName: "光年出行", owner: "孙倩", scopes: ["model:invoke", "tool:invoke"], status: "active", keyCount: 4, lastUsedAt: minutesAgoSafe(3), expiresAt: daysFromNow(200), createdAt: daysAgo(260) },
  { id: "sa-07", name: "legacy-sync", type: "service-account", tenantName: "恒宇物流", owner: "方岩", scopes: ["tenant:read"], status: "expired", keyCount: 1, lastUsedAt: daysAgo(64), expiresAt: daysAgo(12), createdAt: daysAgo(720) },
  { id: "sa-08", name: "market-publisher", type: "service-account", tenantName: "拾光传媒", owner: "何笑", scopes: ["agent:publish"], status: "active", keyCount: 1, lastUsedAt: hoursAgo(7), expiresAt: daysFromNow(45), createdAt: daysAgo(60) },
];

export const apiKeys: ApiKeyRecord[] = Array.from({ length: 12 }).map((_, index) => {
  const random = createRandom(4000 + index * 29);
  const user = users[randomInt(random, 0, users.length - 1)];
  const status = index % 7 === 0 ? "revoked" : index % 5 === 0 ? "rotating" : index % 11 === 0 ? "expired" : "active";
  return {
    id: `key-${String(index + 1).padStart(2, "0")}`,
    name: `${
      pickOne(random, ["prod", "staging", "dev", "ci", "local", "batch", "gateway", "sandbox"])
    }-${pickOne(random, ["agent", "runner", "sync", "etl", "ops", "eval"])}`,
    prefix: `ak_live_${fingerprint(5000 + index).replace("sk-…", "").slice(0, 6)}`,
    owner: user?.name ?? "—",
    tenantName: user?.tenantName ?? "—",
    scopes: pickOne(random, [
      ["model:invoke", "tool:invoke"],
      ["project:read", "usage:read"],
      ["audit:read"],
      ["billing:read", "cost:read"],
      ["sandbox:execute"],
    ]) as string[],
    status,
    rateLimit: pickOne(random, ["60 rpm", "240 rpm", "1200 rpm", "6000 rpm"]),
    callCount: randomInt(random, 1_200, 2_400_000),
    createdAt: daysAgo(randomInt(random, 20, 400)),
    lastUsedAt: status === "revoked" ? daysAgo(randomInt(random, 30, 90)) : hoursAgo(randomInt(random, 1, 96)),
    expiresAt: daysFromNow(randomInt(random, -20, 400)),
  };
});

function minutesAgoSafe(minutes: number) {
  return new Date(Date.parse("2026-09-17T09:30:00+08:00") - minutes * 60_000).toISOString();
}
