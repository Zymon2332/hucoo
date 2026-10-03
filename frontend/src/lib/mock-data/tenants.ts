import type { Organization, OrganizationType, QuotaSnapshot, Tenant, TenantPlan, TenantStatus } from "@/types";
import { createRandom, daysAgo, daysFromNow, pickOne, randomFloat, randomInt } from "./seed";

interface TenantSeed {
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  region: string;
  owner: string;
  email: string;
  expiresInDays: number;
  tags: string[];
  flags: [boolean, boolean, boolean, boolean];
}

const TENANT_SEEDS: TenantSeed[] = [
  {
    name: "云启科技",
    slug: "cloudnova",
    plan: "enterprise",
    status: "active",
    region: "华东-上海",
    owner: "陈立",
    email: "chenli@cloudnova.cn",
    expiresInDays: 210,
    tags: ["战略客户", "金融科技"],
    flags: [true, true, false, true],
  },
  {
    name: "星辰银行",
    slug: "stellarbank",
    plan: "enterprise",
    status: "active",
    region: "华北-北京",
    owner: "赵敏",
    email: "zhaomin@stellarbank.com",
    expiresInDays: 320,
    tags: ["金融", "等保三级"],
    flags: [true, true, false, false],
  },
  {
    name: "蓝鲸零售",
    slug: "bluewhale",
    plan: "business",
    status: "active",
    region: "华南-深圳",
    owner: "林嘉",
    email: "linjia@bluewhale.com",
    expiresInDays: 96,
    tags: ["零售", "高并发"],
    flags: [true, true, false, true],
  },
  {
    name: "山海医疗",
    slug: "shanhai-health",
    plan: "business",
    status: "trial",
    region: "华东-杭州",
    owner: "吴桐",
    email: "wutong@shanhai.health",
    expiresInDays: 18,
    tags: ["医疗", "试用转正"],
    flags: [true, false, false, false],
  },
  {
    name: "极光教育",
    slug: "aurora-edu",
    plan: "team",
    status: "active",
    region: "华东-南京",
    owner: "周越",
    email: "zhouyue@aurora-edu.cn",
    expiresInDays: 142,
    tags: ["教育"],
    flags: [false, true, false, true],
  },
  {
    name: "拓维制造",
    slug: "tuowei-mfg",
    plan: "enterprise",
    status: "active",
    region: "华中-武汉",
    owner: "郑海",
    email: "zhenghai@tuowei.com",
    expiresInDays: 265,
    tags: ["工业", "本地模型"],
    flags: [true, true, true, false],
  },
  {
    name: "光年出行",
    slug: "lightyear-mobility",
    plan: "business",
    status: "active",
    region: "华北-天津",
    owner: "孙倩",
    email: "sunqian@lightyear.io",
    expiresInDays: 74,
    tags: ["出行", "实时"],
    flags: [true, true, false, true],
  },
  {
    name: "拾光传媒",
    slug: "shiguang-media",
    plan: "team",
    status: "trial",
    region: "西南-成都",
    owner: "何笑",
    email: "hexiao@shiguang.media",
    expiresInDays: 11,
    tags: ["内容", "试用"],
    flags: [false, false, false, true],
  },
  {
    name: "天穹保险",
    slug: "skyvault-ins",
    plan: "enterprise",
    status: "active",
    region: "华东-上海",
    owner: "马骏",
    email: "majun@skyvault.com",
    expiresInDays: 180,
    tags: ["保险", "合规严格"],
    flags: [true, true, false, false],
  },
  {
    name: "溪流能源",
    slug: "brook-energy",
    plan: "business",
    status: "suspended",
    region: "西北-西安",
    owner: "范宇",
    email: "fanyu@brook-energy.cn",
    expiresInDays: 30,
    tags: ["能源", "欠费"],
    flags: [false, false, false, false],
  },
  {
    name: "木星电商",
    slug: "jupiter-commerce",
    plan: "team",
    status: "active",
    region: "华南-广州",
    owner: "邓可",
    email: "dengke@jupiter.shop",
    expiresInDays: 118,
    tags: ["电商", "大促"],
    flags: [false, true, false, true],
  },
  {
    name: "恒宇物流",
    slug: "hengyu-logistics",
    plan: "enterprise",
    status: "expired",
    region: "华北-北京",
    owner: "方岩",
    email: "fangyan@hengyu-logistics.com",
    expiresInDays: -12,
    tags: ["物流", "待续费"],
    flags: [true, true, false, false],
  },
];

const CAPACITY: Record<TenantPlan, [number, number, number, number, number]> = {
  free: [2_000_000, 20_000, 20, 5, 2_000],
  team: [20_000_000, 200_000, 200, 20, 20_000],
  business: [200_000_000, 1_500_000, 1_000, 80, 120_000],
  enterprise: [1_200_000_000, 8_000_000, 5_000, 300, 600_000],
};

function buildQuota(plan: TenantPlan, random: () => number, scale: number): QuotaSnapshot {
  const [tokens, calls, storage, concurrency, cost] = CAPACITY[plan];
  return {
    tokens: { used: Math.round(tokens * scale * randomFloat(random, 0.4, 0.95, 3)), limit: tokens, unit: "tokens" },
    calls: { used: Math.round(calls * scale * randomFloat(random, 0.35, 0.92, 3)), limit: calls, unit: "次" },
    storage: { used: randomInt(random, Math.round(storage * 0.3), storage), limit: storage, unit: "GB" },
    concurrency: {
      used: randomInt(random, 5, Math.max(6, Math.round(concurrency * 0.7))),
      limit: concurrency,
      unit: "并发",
    },
    cost: { used: Number((cost * scale * randomFloat(random, 0.3, 0.98)).toFixed(2)), limit: cost, unit: "CNY" },
  };
}

export const tenants: Tenant[] = TENANT_SEEDS.map((seed, index) => {
  const random = createRandom(1000 + index * 37);
  const userCount = randomInt(random, 8, seed.plan === "enterprise" ? 480 : 90);
  const projectCount = randomInt(random, 2, seed.plan === "enterprise" ? 46 : 14);
  const agentCount = randomInt(random, 3, seed.plan === "enterprise" ? 38 : 12);
  const monthlyCalls = randomInt(random, 18_000, seed.plan === "enterprise" ? 2_600_000 : 220_000);
  const monthlyTokens = Math.round(monthlyCalls * randomFloat(random, 1_800, 4_600, 0));

  return {
    id: `tn-${String(index + 1).padStart(2, "0")}`,
    name: seed.name,
    slug: seed.slug,
    plan: seed.plan,
    status: seed.status,
    region: seed.region,
    ownerName: seed.owner,
    ownerEmail: seed.email,
    seats: randomInt(random, Math.max(10, userCount - 6), userCount + 60),
    userCount,
    projectCount,
    agentCount,
    monthlyCalls,
    monthlyTokens,
    monthlyCost: Number(((monthlyTokens / 1000) * randomFloat(random, 0.014, 0.024)).toFixed(2)),
    expiresAt: daysFromNow(seed.expiresInDays),
    createdAt: daysAgo(randomInt(random, 120, 900), randomInt(random, 9, 18)),
    ssoEnabled: random() > 0.4,
    allowCustomModels: seed.flags[0],
    allowByok: seed.flags[1],
    allowLocalModels: seed.flags[2],
    allowSharedModels: seed.flags[3],
    tags: seed.tags,
    quota: buildQuota(seed.plan, random, seed.plan === "enterprise" ? randomFloat(random, 0.4, 0.8) : 0.6),
  };
});

export function getTenantById(id: string) {
  return tenants.find((tenant) => tenant.id === id);
}

export function getTenantName(id: string) {
  return getTenantById(id)?.name ?? "—";
}

/**
 * 组织树种子：[名称, 类型, 上级, 租户, 需要扩展的下级组织数量]
 * 「扩展数量」用于生成足够深的层级（约 500 个节点），
 * 让左侧树能够真实体现懒加载与虚拟滚动。
 */
const ORG_SEEDS: [string, OrganizationType, string | null, string, number][] = [
  ["云启科技集团", "company", null, "tn-01", 138],
  ["智能引擎事业部", "department", "org-01", "tn-01", 14],
  ["风控平台部", "department", "org-01", "tn-01", 12],
  ["Agent 平台组", "team", "org-02", "tn-01", 5],
  ["数据智能组", "team", "org-02", "tn-01", 4],
  ["星辰银行总行", "company", null, "tn-02", 112],
  ["金融科技部", "department", "org-06", "tn-02", 13],
  ["风控研发组", "team", "org-07", "tn-02", 4],
  ["蓝鲸零售总部", "company", null, "tn-03", 96],
  ["供应链技术部", "department", "org-09", "tn-03", 11],
  ["山海医疗信息中心", "department", null, "tn-04", 17],
  ["极光教育产品部", "department", null, "tn-05", 15],
  ["拓维制造数字化部", "department", null, "tn-06", 16],
  ["光年出行算法部", "department", null, "tn-07", 15],
  ["拾光内容工作室", "team", null, "tn-08", 4],
  ["天穹保险科技部", "department", null, "tn-09", 14],
];

const OWNER_POOL = ["陈立", "赵敏", "林嘉", "吴桐", "周越", "郑海", "孙倩", "何笑", "马骏", "范宇", "邓可", "方岩"];

const DEPT_PREFIX = [
  "基础架构", "数据平台", "算法研发", "平台工程", "质量保障", "安全合规",
  "产品设计", "客户成功", "财务共享", "人力行政", "运维保障", "解决方案",
  "用户体验", "智能应用", "供应链", "风险管理", "合规审计", "业务中台",
  "数据治理", "云原生", "推理加速", "商业化", "国际化", "交付服务",
];

const TEAM_PREFIX = [
  "核心引擎", "推理优化", "数据管道", "前端体验", "后端服务", "模型评测",
  "向量检索", "Agent 编排", "可观测", "成本优化", "密钥管理", "权限治理",
  "接入网关", "调度平台", "离线计算", "实时计算", "测试效能", "交付实施",
  "客户支持", "文档运营", "工具链", "知识库", "灰度发布", "容灾演练",
];

const ORG_DESCRIPTION: Record<OrganizationType, string[]> = {
  company: [
    "集团总部，负责整体战略、预算与合规审批。",
    "一级法人主体，承载对外签约与数据合规责任。",
  ],
  department: [
    "事业部级组织，负责领域内的平台建设与人力编制。",
    "职能部门，承接跨团队的流程、预算与质量管理。",
    "业务部门，负责该领域的交付节奏与资源协调。",
  ],
  team: [
    "一线交付小组，按迭代节奏负责具体模块。",
    "工程小组，负责该方向的研发、联调与值守。",
    "执行小组，承担日常需求排期与上线验证。",
  ],
};

const MAX_ORG_DEPTH = 6;

/** 组织类型随层级收敛：公司 → 部门 → 团队，层级过深时不再新增部门。 */
function childTypeOf(parentType: OrganizationType, childDepth: number, random: () => number): OrganizationType {
  if (parentType === "company") return "department";
  if (parentType === "department") {
    if (childDepth >= 3) return "team";
    return random() < 0.4 ? "department" : "team";
  }
  return "team";
}

function pickOrgName(type: OrganizationType, cursor: number, used: Set<string>): string {
  const prefixPool = type === "team" ? TEAM_PREFIX : DEPT_PREFIX;
  const suffix = type === "team" ? (cursor % 5 === 0 ? "小组" : "组") : "部";
  for (let step = 0; step < prefixPool.length; step += 1) {
    const candidate = `${prefixPool[(cursor + step) % prefixPool.length]}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefixPool[cursor % prefixPool.length]}${suffix}·${used.size + 1}`;
}

function buildOrganization(
  id: string,
  seed: { name: string; type: OrganizationType; parentId: string | null; tenantId: string },
  random: () => number,
  /** 锚点组织始终为正常状态，归档态只在扩展出来的下级组织上出现 */
  archivable = true,
): Organization {
  const tenant = getTenantById(seed.tenantId);
  const isArchived = archivable && random() > 0.94;
  const createdAt = daysAgo(randomInt(random, 60, 900), randomInt(random, 9, 19));
  return {
    id,
    tenantId: seed.tenantId,
    tenantName: tenant?.name ?? "—",
    code: `ORG-${id.replace(/^org-/, "")}`,
    name: seed.name,
    type: seed.type,
    parentId: seed.parentId,
    owner: pickOne(random, OWNER_POOL),
    description: pickOne(random, ORG_DESCRIPTION[seed.type]),
    memberCount: seed.type === "company" ? randomInt(random, 2, 14) : randomInt(random, 2, 32),
    projectCount: seed.type === "team" ? randomInt(random, 0, 6) : randomInt(random, 1, 18),
    status: isArchived ? "archived" : "active",
    createdAt,
    updatedAt: daysAgo(randomInt(random, 0, 45), randomInt(random, 9, 20)),
  };
}

function buildOrganizationTree(): Organization[] {
  const nodes: Organization[] = [];
  const nodeById = new Map<string, Organization>();
  const depthOf = new Map<string, number>();
  const usedNamesByParent = new Map<string, Set<string>>();

  // 1) 先落地 16 个锚点组织：id 保持 org-01…org-16，与用户 / 租户数据中的引用一致。
  ORG_SEEDS.forEach(([name, type, parentId, tenantId], seedIndex) => {
    const id = `org-${String(seedIndex + 1).padStart(2, "0")}`;
    const node = buildOrganization(
      id,
      { name, type, parentId, tenantId },
      createRandom(2000 + seedIndex * 13),
      false,
    );
    nodes.push(node);
    nodeById.set(id, node);
    depthOf.set(id, parentId ? (depthOf.get(parentId) ?? 0) + 1 : 0);
    usedNamesByParent.set(id, new Set([name]));
  });

  // 2) 再按锚点扩展下级组织，形成一个约 500 节点的深层组织树。
  ORG_SEEDS.forEach((seed, anchorIndex) => {
    const quota = seed[4];
    const tenantId = seed[3];
    const anchor = nodes[anchorIndex];
    if (quota <= 0 || !anchor) return;
    const random = createRandom(9000 + anchorIndex * 71);
    const queue: string[] = [anchor.id];
    let created = 0;

    for (let attempt = 0; attempt < 20_000 && created < quota; attempt += 1) {
      const parentId = queue[attempt % queue.length];
      if (!parentId) continue;
      const parent = nodeById.get(parentId);
      const parentDepth = depthOf.get(parentId) ?? 0;
      if (!parent || parentDepth + 1 >= MAX_ORG_DEPTH) continue;

      const fanout = created < 6 ? randomInt(random, 3, 6) : randomInt(random, 1, 3);
      const used = usedNamesByParent.get(parentId) ?? new Set([parent.name]);
      usedNamesByParent.set(parentId, used);

      for (let child = 0; child < fanout && created < quota; child += 1) {
        const type = childTypeOf(parent.type, parentDepth + 1, random);
        const childName = pickOrgName(type, randomInt(random, 0, 23) + child, used);
        used.add(childName);
        created += 1;
        const childId = `${anchor.id}-${String(created).padStart(3, "0")}`;
        const node = buildOrganization(
          childId,
          { name: childName, type, parentId, tenantId },
          random,
        );
        nodes.push(node);
        nodeById.set(childId, node);
        depthOf.set(childId, parentDepth + 1);
        usedNamesByParent.set(childId, new Set([childName]));
        queue.push(childId);
      }
    }
  });

  return nodes;
}

export const organizations: Organization[] = buildOrganizationTree();
