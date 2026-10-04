import type { Organization } from "@/types";

/**
 * 组织架构的操作权限模型。
 * 演示环境下由「权限视角」切换身份，用于验证按钮禁用、原因提示与反馈文案。
 */

export type OrgRole = "platform-admin" | "tenant-admin" | "org-manager" | "auditor";

export type OrgCapability =
  | "create"
  | "edit"
  | "archive"
  | "restore"
  | "delete"
  | "assign-owner"
  | "manage-members"
  | "export"
  | "view-audit";

export interface OrgRoleMeta {
  id: OrgRole;
  label: string;
  description: string;
}

export const ORG_ROLES: OrgRoleMeta[] = [
  {
    id: "platform-admin",
    label: "平台管理员",
    description: "可跨租户新建、归档与删除组织，拥有全部操作权限。",
  },
  {
    id: "tenant-admin",
    label: "租户管理员",
    description: "可维护本租户内的组织与成员，但不能删除组织。",
  },
  {
    id: "org-manager",
    label: "组织负责人",
    description: "只能维护自己负责的组织及其成员，不能新建或归档。",
  },
  {
    id: "auditor",
    label: "只读审计员",
    description: "仅可查看组织信息与操作记录，可导出报表。",
  },
];

export const ORG_ROLE_LABEL: Record<OrgRole, string> = ORG_ROLES.reduce(
  (acc, role) => {
    acc[role.id] = role.label;
    return acc;
  },
  {} as Record<OrgRole, string>,
);

export const ORG_CAPABILITY_LABEL: Record<OrgCapability, string> = {
  create: "新建组织",
  edit: "编辑组织信息",
  archive: "归档组织",
  restore: "恢复组织",
  delete: "删除组织",
  "assign-owner": "变更负责人",
  "manage-members": "管理成员",
  export: "导出组织数据",
  "view-audit": "查看操作记录",
};

/** 每个能力所需的最低身份，用于禁用态的原因说明。 */
export const ORG_CAPABILITY_REQUIRED_ROLE: Record<OrgCapability, OrgRole> = {
  create: "tenant-admin",
  edit: "org-manager",
  archive: "tenant-admin",
  restore: "tenant-admin",
  delete: "platform-admin",
  "assign-owner": "tenant-admin",
  "manage-members": "org-manager",
  export: "auditor",
  "view-audit": "auditor",
};

const CAPABILITIES_BY_ROLE: Record<OrgRole, OrgCapability[]> = {
  "platform-admin": [
    "create",
    "edit",
    "archive",
    "restore",
    "delete",
    "assign-owner",
    "manage-members",
    "export",
    "view-audit",
  ],
  "tenant-admin": [
    "create",
    "edit",
    "archive",
    "restore",
    "assign-owner",
    "manage-members",
    "export",
    "view-audit",
  ],
  "org-manager": ["edit", "manage-members", "view-audit"],
  auditor: ["export", "view-audit"],
};

export interface OrgPermissionSet {
  role: OrgRole;
  can: (capability: OrgCapability) => boolean;
  /** 禁用原因；有权限时返回 null，可直接用于 title / Tooltip 文案。 */
  denyReason: (capability: OrgCapability) => string | null;
  allowed: OrgCapability[];
  denied: OrgCapability[];
}

export function buildOrgPermissions(role: OrgRole): OrgPermissionSet {
  const allowedSet = new Set(CAPABILITIES_BY_ROLE[role]);
  const all = Object.keys(ORG_CAPABILITY_LABEL) as OrgCapability[];
  const can = (capability: OrgCapability) => allowedSet.has(capability);
  return {
    role,
    can,
    denyReason: (capability) =>
      can(capability)
        ? null
        : `需要「${ORG_ROLE_LABEL[ORG_CAPABILITY_REQUIRED_ROLE[capability]]}」及以上身份，当前身份：${ORG_ROLE_LABEL[role]}`,
    allowed: all.filter(can),
    denied: all.filter((capability) => !can(capability)),
  };
}

/**
 * 组织自身状态带来的额外限制（与身份无关）。
 * 例如已归档组织需要先恢复才能编辑。
 */
export function orgStatusRestriction(
  org: Organization | null,
  capability: OrgCapability,
): string | null {
  if (!org) return "请先在左侧选择一个组织";
  if (org.status === "archived" && (capability === "edit" || capability === "manage-members")) {
    return "组织已归档，恢复后才能修改";
  }
  return null;
}
