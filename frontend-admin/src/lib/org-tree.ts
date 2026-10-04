import type { Organization, OrganizationType } from "@/types";

/**
 * 组织树的纯函数视图层：把扁平的 Organization[] 索引成便于
 * 「左树定位 + 右详情」使用的各种映射，避免在组件里反复遍历。
 */

export type OrgMatchField = "name" | "code" | "owner" | "id";

export const ORG_MATCH_FIELD_LABEL: Record<OrgMatchField, string> = {
  name: "名称",
  code: "编码",
  owner: "负责人",
  id: "ID",
};

export const ORG_TYPE_ORDER: Record<OrganizationType, number> = {
  company: 0,
  department: 1,
  team: 2,
};

/**
 * 组织类型文案。
 * 注意不能复用 LABELS：那里的 team / business 等键属于租户套餐语义。
 */
export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  company: "公司",
  department: "部门",
  team: "团队",
};

export const ORG_TYPE_OPTIONS = (Object.keys(ORG_TYPE_LABEL) as OrganizationType[]).map(
  (value) => ({
    value,
    label: ORG_TYPE_LABEL[value],
  }),
);

export interface OrgSubtreeStats {
  /** 含自身在内的节点总数 */
  nodeCount: number;
  /** 不含自身的下级组织数量 */
  descendantCount: number;
  /** 含下级的成员总数 */
  memberCount: number;
  /** 含下级的项目总数 */
  projectCount: number;
}

export interface OrgTreeIndex {
  nodeById: Map<string, Organization>;
  childrenByParent: Map<string, Organization[]>;
  parentById: Map<string, string | null>;
  depthById: Map<string, number>;
  statsById: Map<string, OrgSubtreeStats>;
  roots: Organization[];
  maxDepth: number;
  typeCounts: Record<OrganizationType, number>;
  totalMembers: number;
  totalProjects: number;
}

export interface OrgRow {
  org: Organization;
  depth: number;
  hasChildren: boolean;
  childCount: number;
  descendantCount: number;
  /** aria-setsize / aria-posinset，基于当前可见的兄弟节点计算 */
  setSize: number;
  posInSet: number;
  /** 搜索命中，用于高亮与说明命中字段 */
  matched: boolean;
  matchField?: OrgMatchField;
}

export interface OrgSearchResult {
  query: string;
  matchIds: Set<string>;
  /** 命中节点的全部祖先，用于自动展开路径 */
  expandIds: Set<string>;
  fieldById: Map<string, OrgMatchField>;
  /** 受搜索影响的节点（命中 + 命中路径上的祖先） */
  visibleIds: Set<string>;
}

function compareOrg(a: Organization, b: Organization): number {
  const typeDelta = ORG_TYPE_ORDER[a.type] - ORG_TYPE_ORDER[b.type];
  if (typeDelta !== 0) return typeDelta;
  return a.name.localeCompare(b.name, "zh-CN");
}

export function buildOrgIndex(organizations: Organization[]): OrgTreeIndex {
  const nodeById = new Map<string, Organization>();
  const childrenByParent = new Map<string, Organization[]>();
  const parentById = new Map<string, string | null>();
  const depthById = new Map<string, number>();
  const statsById = new Map<string, OrgSubtreeStats>();
  const typeCounts: Record<OrganizationType, number> = { company: 0, department: 0, team: 0 };

  for (const org of organizations) {
    nodeById.set(org.id, org);
    parentById.set(org.id, org.parentId);
    typeCounts[org.type] += 1;
  }

  for (const org of organizations) {
    if (!org.parentId || !nodeById.has(org.parentId)) continue;
    const siblings = childrenByParent.get(org.parentId) ?? [];
    siblings.push(org);
    childrenByParent.set(org.parentId, siblings);
  }
  for (const siblings of childrenByParent.values()) siblings.sort(compareOrg);

  const roots = organizations.filter((org) => !org.parentId || !nodeById.has(org.parentId));
  roots.sort(compareOrg);

  // 自顶向下算深度（父节点一定先于子节点被访问）
  const queue = roots.map((org) => org.id);
  for (const root of roots) depthById.set(root.id, 0);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    if (!id) continue;
    const depth = depthById.get(id) ?? 0;
    for (const child of childrenByParent.get(id) ?? []) {
      depthById.set(child.id, depth + 1);
      queue.push(child.id);
    }
  }

  // 自底向上汇总子树统计
  let totalMembers = 0;
  let totalProjects = 0;
  for (const org of organizations) {
    totalMembers += org.memberCount;
    totalProjects += org.projectCount;
  }
  const stack = [...organizations].sort(
    (a, b) => (depthById.get(b.id) ?? 0) - (depthById.get(a.id) ?? 0),
  );
  for (const org of stack) {
    let nodeCount = 1;
    let memberCount = org.memberCount;
    let projectCount = org.projectCount;
    for (const child of childrenByParent.get(org.id) ?? []) {
      const childStats = statsById.get(child.id);
      if (!childStats) continue;
      nodeCount += childStats.nodeCount;
      memberCount += childStats.memberCount;
      projectCount += childStats.projectCount;
    }
    statsById.set(org.id, {
      nodeCount,
      descendantCount: nodeCount - 1,
      memberCount,
      projectCount,
    });
  }

  const maxDepth = organizations.length
    ? Math.max(...organizations.map((org) => depthById.get(org.id) ?? 0))
    : 0;

  return {
    nodeById,
    childrenByParent,
    parentById,
    depthById,
    statsById,
    roots,
    maxDepth,
    typeCounts,
    totalMembers,
    totalProjects,
  };
}

export function orgPathOf(index: OrgTreeIndex, id: string | null): Organization[] {
  if (!id) return [];
  const path: Organization[] = [];
  let cursor: string | null = id;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    const node = index.nodeById.get(cursor);
    if (!node) break;
    path.unshift(node);
    cursor = index.parentById.get(cursor) ?? null;
  }
  return path;
}

export function searchOrgTree(index: OrgTreeIndex, query: string): OrgSearchResult | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;

  const matchIds = new Set<string>();
  const expandIds = new Set<string>();
  const visibleIds = new Set<string>();
  const fieldById = new Map<string, OrgMatchField>();

  for (const org of index.nodeById.values()) {
    const hits: [OrgMatchField, string][] = [
      ["name", org.name],
      ["code", org.code],
      ["owner", org.owner],
      ["id", org.id],
    ];
    const hit = hits.find(([, value]) => value.toLowerCase().includes(needle));
    if (!hit) continue;

    matchIds.add(org.id);
    visibleIds.add(org.id);
    fieldById.set(org.id, hit[0]);

    let cursor = index.parentById.get(org.id) ?? null;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      expandIds.add(cursor);
      visibleIds.add(cursor);
      cursor = index.parentById.get(cursor) ?? null;
    }
  }

  return { query, matchIds, expandIds, fieldById, visibleIds };
}

export interface FlattenOptions {
  expandedIds: ReadonlySet<string>;
  search?: OrgSearchResult | null;
}

export function flattenOrgRows(index: OrgTreeIndex, options: FlattenOptions): OrgRow[] {
  const { expandedIds, search } = options;
  const rows: OrgRow[] = [];
  const visible = search?.visibleIds ?? null;

  // 搜索无命中时返回空列表，让树面板展示「没有匹配的组织」引导态，
  // 而不是继续显示与关键词无关的根节点。
  if (search && search.matchIds.size === 0) return rows;

  const walk = (orgs: Organization[], depth: number, visibleSiblings: Organization[]) => {
    visibleSiblings.forEach((org, siblingIndex) => {
      const children = index.childrenByParent.get(org.id) ?? [];
      const childCount = children.length;
      const stats = index.statsById.get(org.id);
      const isExpanded = expandedIds.has(org.id);

      rows.push({
        org,
        depth,
        hasChildren: childCount > 0,
        childCount,
        descendantCount: stats?.descendantCount ?? 0,
        setSize: visibleSiblings.length,
        posInSet: siblingIndex + 1,
        matched: Boolean(search?.matchIds.has(org.id)),
        matchField: search?.fieldById.get(org.id),
      });

      if (!isExpanded || childCount === 0) return;
      const nextSiblings = visible ? children.filter((child) => visible.has(child.id)) : children;
      if (nextSiblings.length === 0) return;
      walk(nextSiblings, depth + 1, nextSiblings);
    });
  };

  walk(index.roots, 0, index.roots);
  return rows;
}

/** 左侧树的默认展开层级：只展开根节点，其余保持懒加载。 */
export function defaultExpandedIds(index: OrgTreeIndex): Set<string> {
  const ids = new Set<string>();
  for (const root of index.roots) {
    if ((index.childrenByParent.get(root.id) ?? []).length > 0) ids.add(root.id);
  }
  return ids;
}

/** 展开到指定节点，保证它在树中可见。 */
export function expandPathTo(index: OrgTreeIndex, id: string, current: Set<string>): Set<string> {
  const next = new Set(current);
  let cursor = index.parentById.get(id) ?? null;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    next.add(cursor);
    cursor = index.parentById.get(cursor) ?? null;
  }
  return next;
}
