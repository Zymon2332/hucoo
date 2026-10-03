import type { Organization } from "@/types";
import { createRandom, daysAgo, hoursAgo, pickOne, randomInt } from "@/lib/mock-data/seed";
import type { OrgRole } from "@/lib/permissions";

export type OrgActivityTone = "success" | "warning" | "danger" | "info";

export interface OrgActivity {
  id: string;
  orgId: string;
  at: string;
  actor: string;
  role: OrgRole;
  action: string;
  detail: string;
  tone: OrgActivityTone;
}

const HISTORY_ACTION: { action: string; detail: string; tone: OrgActivityTone }[] = [
  { action: "变更负责人", detail: "负责人由「周越」变更为「陈立」", tone: "info" },
  { action: "新增下级组织", detail: "新建下级组织并继承租户配额策略", tone: "success" },
  { action: "调整成员归属", detail: "12 名成员从其他组织迁入本组织", tone: "info" },
  { action: "更新组织描述", detail: "补充业务范围与对接人信息", tone: "info" },
  { action: "归档下级组织", detail: "下级组织因业务调整被归档", tone: "warning" },
  { action: "导出组织数据", detail: "导出该组织及其下级的成员清单", tone: "info" },
];

/** 为组织生成确定性的历史操作记录，保证同一组织每次渲染一致。 */
export function seedOrgActivities(org: Organization): OrgActivity[] {
  const random = createRandom(org.id.length * 977 + org.name.length * 31);
  const count = randomInt(random, 3, 5);
  return Array.from({ length: count }).map((_, index) => {
    const template = pickOne(random, HISTORY_ACTION);
    return {
      id: `${org.id}-seed-${index}`,
      orgId: org.id,
      at:
        index < 2
          ? hoursAgo(randomInt(random, 2, 20) + index * 7, randomInt(random, 0, 59))
          : daysAgo(randomInt(random, 2, 40) + index, randomInt(random, 9, 19)),
      actor: pickOne(random, ["陈立", "赵敏", "林嘉", "系统同步", "SCIM 目录同步"]),
      role: pickOne(random, ["platform-admin", "tenant-admin", "org-manager"] as OrgRole[]),
      action: template.action,
      detail: template.detail,
      tone: template.tone,
    };
  });
}

let activitySequence = 0;

/** 本次会话内产生的操作记录（仅存于前端状态）。 */
export function createOrgActivity(
  org: Organization,
  input: {
    action: string;
    detail: string;
    role: OrgRole;
    actor: string;
    tone?: OrgActivityTone;
  },
): OrgActivity {
  activitySequence += 1;
  return {
    id: `${org.id}-live-${Date.now()}-${activitySequence}`,
    orgId: org.id,
    at: new Date().toISOString(),
    actor: input.actor,
    role: input.role,
    action: input.action,
    detail: input.detail,
    tone: input.tone ?? "success",
  };
}
