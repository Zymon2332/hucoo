import type { Approval, ApprovalStatus, ApprovalStep, ApprovalType, RiskLevel } from "@/types";
import { createRandom, hoursAgo, pickOne, pickMany, randomInt } from "./seed";

interface ApprovalSeed {
  type: ApprovalType;
  title: string;
  applicant: string;
  applicantEmail: string;
  tenantName: string;
  tenantId: string;
  risk: RiskLevel;
  status: ApprovalStatus;
  reason: string;
  amount: number | null;
  targetType: string;
  targetName: string;
}

const APPROVAL_SEEDS: ApprovalSeed[] = [
  {
    type: "model-onboarding",
    title: "接入 GPT-4.1 自定义 Endpoint（财务合规网关）",
    applicant: "陈立",
    applicantEmail: "chenli@cloudnova.cn",
    tenantName: "云启科技",
    tenantId: "tn-01",
    risk: "high",
    status: "pending",
    reason: "财务部门需要通过企业网关调用海外模型完成对账摘要，出网域名已收敛到网关出口。",
    amount: 48_000,
    targetType: "自定义模型",
    targetName: "gpt-4.1-finance-gw",
  },
  {
    type: "sensitive-tool",
    title: "为 Agent 平台组开通终端执行工具（生产环境）",
    applicant: "宋茜",
    applicantEmail: "songqian@cloudnova.cn",
    tenantName: "云启科技",
    tenantId: "tn-01",
    risk: "high",
    status: "pending",
    reason: "需要执行构建与回滚脚本，命令范围限定在 npm/pnpm/git 白名单内，禁止 sudo。",
    amount: null,
    targetType: "工具",
    targetName: "terminal.execute",
  },
  {
    type: "high-spend",
    title: "双十一大促期间提高 Token 配额至 4 亿",
    applicant: "林嘉",
    applicantEmail: "linjia@bluewhale.com",
    tenantName: "蓝鲸零售",
    tenantId: "tn-03",
    risk: "medium",
    status: "pending",
    reason: "大促客服 Agent 预计调用量提升 3.2 倍，需要临时提高配额并允许突发并发 200。",
    amount: 320_000,
    targetType: "配额",
    targetName: "bluewhale 租户 Token 配额",
  },
  {
    type: "production-access",
    title: "生产环境模型路由策略修改权限",
    applicant: "孙倩",
    applicantEmail: "sunqian@lightyear.io",
    tenantName: "光年出行",
    tenantId: "tn-07",
    risk: "critical",
    status: "pending",
    reason: "大模型降级演练需要临时修改生产路由，将主模型切换至备用推理集群。",
    amount: null,
    targetType: "权限",
    targetName: "model.routing.write",
  },
  {
    type: "temp-permission",
    title: "临时授予安全审计导出权限（7 天）",
    applicant: "袁莉",
    applicantEmail: "yuanli@stellarbank.com",
    tenantName: "星辰银行",
    tenantId: "tn-02",
    risk: "medium",
    status: "pending",
    reason: "季度合规检查需要导出近 90 天审计日志，权限到期自动回收。",
    amount: null,
    targetType: "临时权限",
    targetName: "audit.export (7d)",
  },
  {
    type: "tool-registration",
    title: "注册内部 CMDB 查询工具",
    applicant: "郑海",
    applicantEmail: "zhenghai@tuowei.com",
    tenantName: "拓维制造",
    tenantId: "tn-06",
    risk: "medium",
    status: "escalated",
    reason: "通过 OpenAPI 导入内网 CMDB 查询接口，仅允许只读 GET，需要网络白名单放行。",
    amount: null,
    targetType: "工具",
    targetName: "cmdb.query",
  },
  {
    type: "agent-publish",
    title: "上架「合同风险审查」Agent 模板到市场",
    applicant: "马骏",
    applicantEmail: "majun@skyvault.com",
    tenantName: "天穹保险",
    tenantId: "tn-09",
    risk: "low",
    status: "pending",
    reason: "内部已灰度 30 天，准确率 94%，希望上架到平台市场供同行业租户使用。",
    amount: null,
    targetType: "Agent 模板",
    targetName: "contract-risk-review",
  },
  {
    type: "model-onboarding",
    title: "接入本地 vLLM 集群（Qwen3-72B）",
    applicant: "郑海",
    applicantEmail: "zhenghai@tuowei.com",
    tenantName: "拓维制造",
    tenantId: "tn-06",
    risk: "low",
    status: "approved",
    reason: "产线数据不出厂区，使用自建推理集群，已完成模型验证与合规基线检查。",
    amount: 0,
    targetType: "自定义模型",
    targetName: "qwen3-72b-local",
  },
  {
    type: "sensitive-tool",
    title: "开通浏览器自动化工具访问公网",
    applicant: "许安",
    applicantEmail: "xuan@cloudnova.cn",
    tenantName: "云启科技",
    tenantId: "tn-01",
    risk: "medium",
    status: "approved",
    reason: "用于抓取公开文档更新知识库，域名白名单限定 12 个官方站点。",
    amount: null,
    targetType: "工具",
    targetName: "browser.navigate",
  },
  {
    type: "high-spend",
    title: "模型验证环境 GPU 预算追加 8 万元",
    applicant: "许安",
    applicantEmail: "xuan@cloudnova.cn",
    tenantName: "云启科技",
    tenantId: "tn-01",
    risk: "medium",
    status: "approved",
    reason: "新增多模态验证项需要 A100 资源，已与财务确认走 Q3 剩余预算。",
    amount: 80_000,
    targetType: "预算",
    targetName: "Q3 模型验证预算",
  },
  {
    type: "production-access",
    title: "申请生产环境 BYOK 密钥托管权限",
    applicant: "钱枫",
    applicantEmail: "qianfeng@stellarbank.com",
    tenantName: "星辰银行",
    tenantId: "tn-02",
    risk: "critical",
    status: "approved",
    reason: "密钥轮换窗口需要临时写入权限，操作双人复核，全程录屏与审计。",
    amount: null,
    targetType: "权限",
    targetName: "model.key.custody",
  },
  {
    type: "model-onboarding",
    title: "接入第三方小模型（客服意图识别）",
    applicant: "钟怡",
    applicantEmail: "zhongyi@bluewhale.com",
    tenantName: "蓝鲸零售",
    tenantId: "tn-03",
    risk: "high",
    status: "rejected",
    reason: "供应商无法提供数据流向证明与等保备案材料，暂不满足接入要求。",
    amount: 12_000,
    targetType: "自定义模型",
    targetName: "intent-mini-v2",
  },
  {
    type: "temp-permission",
    title: "临时导出用户明细数据",
    applicant: "高远",
    applicantEmail: "gaoyuan@cloudnova.cn",
    tenantName: "云启科技",
    tenantId: "tn-01",
    risk: "high",
    status: "rejected",
    reason: "运营活动需要导出用户邮箱做触达，但未提供脱敏方案与用户授权记录。",
    amount: null,
    targetType: "临时权限",
    targetName: "user.export (3d)",
  },
  {
    type: "tool-registration",
    title: "注册生产数据库只读查询工具",
    applicant: "李锐",
    applicantEmail: "lirui@stellarbank.com",
    tenantName: "星辰银行",
    tenantId: "tn-02",
    risk: "critical",
    status: "cancelled",
    reason: "申请人撤回：改用脱敏数据仓库视图后再提交。",
    amount: null,
    targetType: "工具",
    targetName: "db.readonly.query",
  },
];

const APPROVER_POOL = [
  ["赵敏", "租户管理员"],
  ["许安", "模型审核员"],
  ["钱枫", "密钥管理员"],
  ["孙晓", "安全审计"],
  ["汤鹏", "财务"],
  ["陈立", "超级管理员"],
] as const;

function buildChain(random: () => number, status: ApprovalStatus, _submittedAt: string): ApprovalStep[] {
  const size = randomInt(random, 2, 3);
  const approvers = pickMany(random, APPROVER_POOL, size);
  return approvers.map(([approver, role], index) => {
    let stepStatus: ApprovalStep["status"] = "pending";
    if (status === "approved") stepStatus = "approved";
    if (status === "rejected") stepStatus = index === size - 1 ? "rejected" : "approved";
    if (status === "cancelled") stepStatus = index === 0 ? "skipped" : "pending";
    if (status === "escalated") stepStatus = index === 0 ? "approved" : "pending";
    return {
      id: `step-${index + 1}-${Math.round(random() * 100000)}`,
      order: index + 1,
      approver,
      role,
      status: stepStatus,
      decidedAt: stepStatus === "pending" ? null : hoursAgo(randomInt(random, 2, 72)),
      comment:
        stepStatus === "approved"
          ? pickOne(random, ["材料齐全，同意。", "风险可控，附加审计要求后同意。", "已与申请人确认边界，同意。"])
          : stepStatus === "rejected"
            ? pickOne(random, ["缺少数据流向证明，驳回。", "权限范围过大，需拆分后重提。", "合规材料不足。"])
            : null,
    };
  });
}

export const approvals: Approval[] = APPROVAL_SEEDS.map((seed, index) => {
  const random = createRandom(6000 + index * 31);
  const submittedAt = hoursAgo(randomInt(random, 1, 96), randomInt(random, 0, 59));
  const chain = buildChain(random, seed.status, submittedAt);
  const currentStep = Math.max(
    1,
    chain.findIndex((step) => step.status === "pending") + 1 || chain.length,
  );
  return {
    id: `apv-${String(index + 1).padStart(2, "0")}`,
    code: `APV-${String(2026090 + index).padStart(7, "0")}`,
    type: seed.type,
    title: seed.title,
    applicant: seed.applicant,
    applicantEmail: seed.applicantEmail,
    tenantId: seed.tenantId,
    tenantName: seed.tenantName,
    riskLevel: seed.risk,
    status: seed.status,
    reason: seed.reason,
    amount: seed.amount,
    targetType: seed.targetType,
    targetName: seed.targetName,
    submittedAt,
    slaDueAt: new Date(Date.parse(submittedAt) + 24 * 3_600_000).toISOString(),
    currentStep,
    chain,
  };
});

export function getApprovalById(id: string) {
  return approvals.find((approval) => approval.id === id);
}

export const pendingApprovalCount = approvals.filter((approval) => approval.status === "pending").length;
export const approvalSlaBreached = approvals.filter(
  (approval) => approval.status === "pending" && Date.parse(approval.slaDueAt) < Date.parse("2026-09-17T09:30:00+08:00"),
).length;

export const approvalTypeDistribution = Array.from(
  approvals.reduce((map, approval) => {
    map.set(approval.type, (map.get(approval.type) ?? 0) + 1);
    return map;
  }, new Map<ApprovalType, number>()),
).map(([type, count]) => ({ type, count }));
