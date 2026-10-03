import type { OrgMember, Organization, UserSource } from "@/types";
import { users } from "./users";
import { createRandom, daysAgo, pickOne, randomInt } from "./seed";

const SURNAMES = [
  "王",
  "李",
  "张",
  "刘",
  "陈",
  "杨",
  "黄",
  "赵",
  "吴",
  "周",
  "徐",
  "孙",
  "马",
  "朱",
  "胡",
  "郭",
  "何",
  "高",
  "林",
  "罗",
  "郑",
  "梁",
  "谢",
  "宋",
  "唐",
  "许",
  "邓",
  "冯",
  "韩",
  "曹",
];

const GIVEN_NAMES = [
  "伟",
  "芳",
  "娜",
  "敏",
  "静",
  "磊",
  "强",
  "洋",
  "艳",
  "勇",
  "军",
  "杰",
  "娟",
  "涛",
  "明",
  "超",
  "秀英",
  "霞",
  "平",
  "刚",
  "桂英",
  "鹏",
  "晨",
  "帆",
  "然",
  "嘉",
  "萱",
  "彤",
  "晗",
  "舟",
];

const TITLE_BY_TYPE: Record<Organization["type"], string[]> = {
  company: ["总经理", "副总经理", "战略总监", "财务负责人", "法务负责人", "董事会秘书"],
  department: [
    "事业部总经理",
    "技术总监",
    "高级架构师",
    "产品负责人",
    "项目经理",
    "数据分析师",
    "质量负责人",
    "合规专员",
  ],
  team: [
    "团队负责人",
    "高级工程师",
    "工程师",
    "算法工程师",
    "前端工程师",
    "后端工程师",
    "测试工程师",
    "运维工程师",
    "产品经理",
    "交互设计师",
  ],
};

const SOURCE_POOL: UserSource[] = [
  "sso-oidc",
  "sso-saml",
  "ldap",
  "scim",
  "invite",
  "local",
  "wecom",
  "feishu",
  "dingtalk",
];

/** 单个组织最多生成的成员数量上限，避免详情页一次渲染过大的数据集。 */
const MEMBER_CAP = 240;

function hashOf(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toMember(user: (typeof users)[number]): OrgMember {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    status: user.status,
    source: user.source,
    mfaEnabled: user.mfaEnabled,
    joinedAt: user.createdAt,
    lastActiveAt: user.lastLoginAt,
  };
}

/**
 * 组织的直属成员花名册。
 * 真实用户数据挂在锚点组织上，其余成员按组织 ID 确定性生成，
 * 保证同一组织每次渲染结果一致。
 */
export function getOrgMembers(org: Organization, cap = MEMBER_CAP): OrgMember[] {
  const random = createRandom(hashOf(org.id) % 100_000);
  const members: OrgMember[] = users
    .filter((user) => user.orgId === org.id)
    .map((user) => toMember(user));

  const target = Math.min(Math.max(org.memberCount, members.length), cap);
  for (let index = members.length; index < target; index += 1) {
    const name = `${pickOne(random, SURNAMES)}${pickOne(random, GIVEN_NAMES)}`;
    const pinyin = `member${String(index + 1).padStart(3, "0")}`;
    const statusRoll = random();
    members.push({
      id: `${org.id}-m${String(index + 1).padStart(3, "0")}`,
      name,
      email: `${pinyin}@${org.code.toLowerCase().replace(/[^a-z0-9-]/g, "")}.example.com`,
      title: pickOne(random, TITLE_BY_TYPE[org.type]),
      status:
        statusRoll > 0.93
          ? "disabled"
          : statusRoll > 0.88
            ? "invited"
            : statusRoll > 0.85
              ? "locked"
              : "active",
      source: pickOne(random, SOURCE_POOL),
      mfaEnabled: random() > 0.35,
      joinedAt: daysAgo(randomInt(random, 5, 900), randomInt(random, 9, 20)),
      lastActiveAt: daysAgo(randomInt(random, 0, 45), randomInt(random, 8, 22)),
    });
  }

  return members;
}
