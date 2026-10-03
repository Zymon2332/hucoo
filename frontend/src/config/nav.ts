import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeCheck,
  Boxes,
  Building2,
  Coins,
  Cpu,
  FileCheck2,
  FlaskConical,
  Gauge,
  GitBranch,
  Handshake,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ListTree,
  Lock,
  Package,
  Plug,
  Receipt,
  Rocket,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wrench,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
  badgeKey?: "pendingApprovals" | "firingAlerts" | "pendingModels";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "总览",
    items: [
      {
        label: "控制台总览",
        href: "/dashboard",
        icon: LayoutDashboard,
        keywords: ["dashboard", "总览", "指标", "概览"],
      },
    ],
  },
  {
    label: "租户与组织",
    items: [
      {
        label: "租户管理",
        href: "/tenants",
        icon: Building2,
        keywords: ["tenant", "租户", "套餐", "配额"],
      },
      {
        label: "组织架构",
        href: "/organizations",
        icon: Boxes,
        keywords: ["org", "组织", "部门", "团队"],
      },
    ],
  },
  {
    label: "用户与权限",
    items: [
      { label: "用户管理", href: "/users", icon: Users, keywords: ["user", "成员", "用户"] },
      {
        label: "身份源 SSO",
        href: "/sso",
        icon: KeyRound,
        keywords: ["sso", "oidc", "saml", "ldap", "scim", "企业微信"],
      },
      { label: "角色管理", href: "/roles", icon: BadgeCheck, keywords: ["role", "角色"] },
      {
        label: "权限矩阵",
        href: "/permissions",
        icon: ShieldCheck,
        keywords: ["permission", "权限", "矩阵", "模拟器"],
      },
      {
        label: "审批中心",
        href: "/approvals",
        icon: ListChecks,
        keywords: ["approval", "审批", "工单"],
        badgeKey: "pendingApprovals",
      },
    ],
  },
  {
    label: "模型治理",
    items: [
      {
        label: "平台模型",
        href: "/models/platform",
        icon: Cpu,
        keywords: ["model", "模型", "上架"],
      },
      {
        label: "模型调用记录",
        href: "/models/calls",
        icon: ListTree,
        keywords: ["call", "调用记录", "日志", "trace", "request", "用户用量", "延迟", "失败"],
      },
      {
        label: "自定义模型",
        href: "/models/custom",
        icon: Server,
        keywords: ["byok", "自定义模型", "本地模型", "接入"],
        badgeKey: "pendingModels",
      },
      {
        label: "模型供应商",
        href: "/models/providers",
        icon: Handshake,
        keywords: ["provider", "供应商", "网关"],
      },
      {
        label: "密钥保险箱",
        href: "/models/keys",
        icon: Lock,
        keywords: ["key", "密钥", "轮换", "撤销"],
      },
      {
        label: "模型验证",
        href: "/models/validation",
        icon: FileCheck2,
        keywords: ["validation", "验证", "连通性"],
      },
      {
        label: "模型路由",
        href: "/models/routing",
        icon: GitBranch,
        keywords: ["routing", "路由", "fallback", "降级"],
      },
    ],
  },
  {
    label: "工具与 MCP",
    items: [
      {
        label: "工具目录",
        href: "/tools",
        icon: Wrench,
        keywords: ["tool", "工具", "openapi", "命令策略"],
      },
      { label: "MCP Server", href: "/mcp", icon: Plug, keywords: ["mcp", "server", "网络策略"] },
    ],
  },
  {
    label: "Agent 与市场",
    items: [
      {
        label: "Agent 模板",
        href: "/agents/templates",
        icon: Package,
        keywords: ["agent", "模板", "提示词"],
      },
      {
        label: "Agent 市场",
        href: "/agents/market",
        icon: Store,
        keywords: ["market", "市场", "上架", "榜单"],
      },
    ],
  },
  {
    label: "项目与运行环境",
    items: [
      {
        label: "项目管理",
        href: "/projects",
        icon: Boxes,
        keywords: ["project", "项目", "仓库", "策略"],
      },
      {
        label: "工作区",
        href: "/workspaces",
        icon: Gauge,
        keywords: ["workspace", "工作区", "资源"],
      },
      {
        label: "沙箱与镜像",
        href: "/sandboxes",
        icon: Server,
        keywords: ["sandbox", "沙箱", "镜像", "漏洞"],
      },
    ],
  },
  {
    label: "用量与计费",
    items: [
      { label: "用量统计", href: "/usage", icon: Activity, keywords: ["usage", "用量", "token"] },
      {
        label: "账单与套餐",
        href: "/billing",
        icon: Receipt,
        keywords: ["billing", "账单", "发票", "套餐"],
      },
      {
        label: "成本与预算",
        href: "/costs",
        icon: Coins,
        keywords: ["cost", "成本", "预算", "成本中心"],
      },
    ],
  },
  {
    label: "安全与审计",
    items: [
      {
        label: "审计日志",
        href: "/audit",
        icon: ScrollText,
        keywords: ["audit", "审计", "日志"],
        badgeKey: "firingAlerts",
      },
      {
        label: "安全策略",
        href: "/security",
        icon: ShieldCheck,
        keywords: ["security", "安全", "dlp", "kms", "ip"],
      },
      {
        label: "合规中心",
        href: "/compliance",
        icon: FileCheck2,
        keywords: ["compliance", "合规", "soc2", "gdpr", "等保"],
      },
    ],
  },
  {
    label: "监控与运维",
    items: [
      {
        label: "监控大盘",
        href: "/monitoring",
        icon: Activity,
        keywords: ["monitoring", "监控", "qps", "日志", "调用链"],
      },
      {
        label: "告警管理",
        href: "/alerts",
        icon: Gauge,
        keywords: ["alert", "告警", "规则", "通知渠道"],
      },
    ],
  },
  {
    label: "集成与开放",
    items: [
      {
        label: "集成中心",
        href: "/integrations",
        icon: Plug,
        keywords: ["integration", "集成", "git", "webhook", "oauth"],
      },
    ],
  },
  {
    label: "运营与实验",
    items: [
      {
        label: "运营中心",
        href: "/operations",
        icon: ShoppingBag,
        keywords: ["operations", "运营", "公告", "工单"],
      },
      {
        label: "实验与发布",
        href: "/experiments",
        icon: FlaskConical,
        keywords: ["experiment", "实验", "灰度", "发布"],
      },
    ],
  },
  {
    label: "系统设置",
    items: [
      {
        label: "系统设置",
        href: "/settings",
        icon: Settings,
        keywords: ["setting", "设置", "品牌", "私有化"],
      },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

export function findNavItemByPath(pathname: string): NavItem | undefined {
  const exact = allNavItems.find((item) => item.href === pathname);
  if (exact) return exact;
  return allNavItems
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function findNavGroupByPath(pathname: string): NavGroup | undefined {
  const item = findNavItemByPath(pathname);
  if (!item) return undefined;
  return navGroups.find((group) => group.items.some((candidate) => candidate.href === item.href));
}

export const quickNavItems: NavItem[] = [
  { label: "租户管理", href: "/tenants", icon: Building2, keywords: [] },
  { label: "审批中心", href: "/approvals", icon: ListChecks, keywords: [] },
  { label: "自定义模型", href: "/models/custom", icon: Server, keywords: [] },
  { label: "密钥保险箱", href: "/models/keys", icon: Lock, keywords: [] },
  { label: "告警管理", href: "/alerts", icon: Gauge, keywords: [] },
  { label: "审计日志", href: "/audit", icon: ScrollText, keywords: [] },
];

export const ICON_FALLBACK = Rocket;
