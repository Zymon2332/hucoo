"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageContainer } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { OrgTreePanel } from "@/components/organizations/org-tree-panel";
import { OrgPathBar } from "@/components/organizations/org-path-bar";
import { OrgDetailPanel, type OrgDetailTab } from "@/components/organizations/org-detail-panel";
import { OrgFormDialog, type OrgFormValues } from "@/components/organizations/org-form-dialog";
import { CURRENT_USER } from "@/components/layout/user-menu";
import { tenants, organizations as orgSeed } from "@/lib/mock-data/tenants";
import {
  buildOrgIndex,
  defaultExpandedIds,
  expandPathTo,
  flattenOrgRows,
  orgPathOf,
  searchOrgTree,
} from "@/lib/org-tree";
import { buildOrgPermissions, type OrgCapability, type OrgRole } from "@/lib/permissions";
import { createOrgActivity, seedOrgActivities, type OrgActivity } from "@/lib/org-activity";
import { formatNumber, sleep } from "@/lib/utils";
import type { Organization } from "@/types";

const TAB_VALUES: OrgDetailTab[] = ["overview", "members", "children", "governance"];

function normalizeTab(value: string | null): OrgDetailTab {
  return TAB_VALUES.includes(value as OrgDetailTab) ? (value as OrgDetailTab) : "overview";
}

/** 新建节点的 ID 沿用「父级-序号」的既有格式，避免与种子数据冲突。 */
function nextOrgId(parentId: string | null, sequence: number) {
  const suffix = `9${String(sequence).padStart(2, "0")}`;
  return parentId ? `${parentId}-${suffix}` : `org-${suffix}`;
}

export function OrganizationsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [orgList, setOrgList] = React.useState<Organization[]>(orgSeed);
  // index 必须先于 selectedId 计算：首屏默认选中第一个根组织，SSR 与客户端结果一致，避免闪一下空态
  const index = React.useMemo(() => buildOrgIndex(orgList), [orgList]);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    () => searchParams.get("org") ?? index.roots[0]?.id ?? null,
  );
  const [tab, setTab] = React.useState<OrgDetailTab>(() => normalizeTab(searchParams.get("tab")));
  const [role, setRole] = React.useState<OrgRole>("platform-admin");
  const [query, setQuery] = React.useState("");
  const [activities, setActivities] = React.useState<OrgActivity[]>(() =>
    orgSeed.flatMap((org) => seedOrgActivities(org)),
  );
  const [liveMessage, setLiveMessage] = React.useState("");

  const [loadedIds, setLoadedIds] = React.useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [parentForCreate, setParentForCreate] = React.useState<string | null>(null);
  const [formPending, setFormPending] = React.useState(false);
  const [savingBasics, setSavingBasics] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Organization | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const sequenceRef = React.useRef(0);
  const initialisedRef = React.useRef(false);

  const permissions = React.useMemo(() => buildOrgPermissions(role), [role]);
  const search = React.useMemo(() => searchOrgTree(index, query), [index, query]);
  const rows = React.useMemo(
    () => flattenOrgRows(index, { expandedIds, search }),
    [index, expandedIds, search],
  );
  const selected = selectedId ? (index.nodeById.get(selectedId) ?? null) : null;
  const path = React.useMemo(() => orgPathOf(index, selectedId), [index, selectedId]);
  const editing = editingId ? (index.nodeById.get(editingId) ?? null) : null;
  const presetParent = parentForCreate ? (index.nodeById.get(parentForCreate) ?? null) : null;

  // 首次进入展开根节点，避免左树是空的一片
  React.useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    setExpandedIds(defaultExpandedIds(index));
  }, [index]);

  // 只在首屏兜底一次：URL 里的组织不存在（或缺失）时回落到第一个根组织。
  // 之后允许「全部组织」把选中项清空，此时右侧展示引导态而不是重新选中某个节点。
  const fallbackUsedRef = React.useRef(false);
  React.useEffect(() => {
    if (fallbackUsedRef.current) return;
    fallbackUsedRef.current = true;
    if (selectedId && index.nodeById.has(selectedId)) return;
    setSelectedId(index.roots[0]?.id ?? null);
  }, [index, selectedId]);

  // 选中深层节点时自动展开其祖先路径
  React.useEffect(() => {
    if (!selectedId) return;
    setExpandedIds((prev) => expandPathTo(index, selectedId, prev));
  }, [index, selectedId]);

  // 搜索命中后自动展开命中路径；用户仍可手动折叠，改关键词会重新展开
  React.useEffect(() => {
    if (!search || search.expandIds.size === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of search.expandIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [search]);

  // 懒加载：为「已展开但未加载」的节点拉取下级组织
  React.useEffect(() => {
    const pending = [...expandedIds].filter(
      (id) => !loadedIds.has(id) && (index.childrenByParent.get(id)?.length ?? 0) > 0,
    );
    if (pending.length === 0) return;
    let cancelled = false;
    setLoadingIds((prev) => new Set([...prev, ...pending]));
    void sleep(260).then(() => {
      if (cancelled) return;
      setLoadedIds((prev) => new Set([...prev, ...pending]));
      setLoadingIds((prev) => {
        const next = new Set(prev);
        for (const id of pending) next.delete(id);
        return next;
      });
      setLiveMessage(`已加载 ${pending.length} 个组织的下级组织`);
    });
    return () => {
      cancelled = true;
    };
  }, [expandedIds, index, loadedIds]);

  // 选中项与标签页写入 URL，便于分享与刷新还原
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedId) params.set("org", selectedId);
    else params.delete("org");
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const next = params.toString();
    if (next === searchParams.toString()) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectedId, tab]);

  const pushActivity = React.useCallback(
    (org: Organization, action: string, detail: string, tone: OrgActivity["tone"] = "success") => {
      setActivities((prev) => [
        createOrgActivity(org, { action, detail, role, actor: CURRENT_USER.name, tone }),
        ...prev,
      ]);
    },
    [role],
  );

  const guard = React.useCallback(
    (capability: OrgCapability) => {
      if (permissions.can(capability)) return true;
      toast.error("操作已被权限策略拦截", {
        description: permissions.denyReason(capability) ?? undefined,
      });
      return false;
    },
    [permissions],
  );

  const handleToggle = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = React.useCallback((id: string) => {
    setSelectedId(id);
    setLiveMessage(`已定位到组织 ${id}`);
  }, []);

  const handleExpandAll = React.useCallback(() => {
    const ids = new Set<string>();
    for (const [id, children] of index.childrenByParent) {
      if (children.length > 0) ids.add(id);
    }
    setExpandedIds(ids);
    setLiveMessage(`已展开全部 ${ids.size} 个可展开组织，正在加载下级`);
    toast.info(`正在展开全部 ${formatNumber(ids.size)} 个组织`, {
      description: "视图中只渲染可视区域的节点，可放心展开。",
    });
  }, [index]);

  const handleCollapseAll = React.useCallback(() => {
    setExpandedIds(new Set());
    setLiveMessage("已折叠全部组织");
  }, []);

  const openCreate = React.useCallback(
    (parent: Organization | null) => {
      if (!guard("create")) return;
      setEditingId(null);
      setParentForCreate(parent?.id ?? null);
      setDialogOpen(true);
    },
    [guard],
  );

  const openEdit = React.useCallback(
    (org: Organization) => {
      if (!guard("edit")) return;
      setEditingId(org.id);
      setParentForCreate(null);
      setDialogOpen(true);
    },
    [guard],
  );

  const handleSubmit = React.useCallback(
    (values: OrgFormValues) => {
      setFormPending(true);
      void sleep(500).then(() => {
        setFormPending(false);
        setDialogOpen(false);
        const tenantName = tenants.find((tenant) => tenant.id === values.tenantId)?.name ?? "—";
        const parentId = values.parentId || null;
        const now = new Date().toISOString();

        if (editing) {
          const updated: Organization = {
            ...editing,
            name: values.name,
            owner: values.owner,
            tenantId: values.tenantId,
            tenantName,
            type: values.type,
            parentId,
            updatedAt: now,
          };
          setOrgList((list) => list.map((org) => (org.id === updated.id ? updated : org)));
          pushActivity(
            updated,
            "更新组织信息",
            `名称 / 负责人 / 类型更新为「${values.name}」「${values.owner}」「${values.type}」`,
          );
          toast.success(`已更新组织「${values.name}」`);
          if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
          setEditingId(null);
          return;
        }

        sequenceRef.current += 1;
        const id = nextOrgId(parentId, sequenceRef.current);
        const created: Organization = {
          id,
          tenantId: values.tenantId,
          tenantName,
          code: `ORG-${id.replace(/^org-/, "")}`,
          name: values.name,
          type: values.type,
          parentId,
          owner: values.owner,
          description: "新建组织，尚未补充业务描述。",
          memberCount: 0,
          projectCount: 0,
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        setOrgList((list) => [...list, created]);
        if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
        setSelectedId(id);
        setTab("overview");
        pushActivity(
          created,
          "新建组织",
          parentId ? `在「${presetParent?.name ?? parentId}」下创建` : "创建为顶层组织",
        );
        toast.success(`已创建组织「${values.name}」`, {
          description: "已自动跳转到新组织的详情页。",
        });
      });
    },
    [editing, presetParent, pushActivity],
  );

  const handleSaveBasics = React.useCallback(
    (patch: { owner: string; description: string }) => {
      if (!selected || !guard("edit")) return;
      setSavingBasics(true);
      const target = selected;
      void sleep(450).then(() => {
        setSavingBasics(false);
        setOrgList((list) =>
          list.map((org) =>
            org.id === target.id
              ? {
                  ...org,
                  owner: patch.owner,
                  description: patch.description,
                  updatedAt: new Date().toISOString(),
                }
              : org,
          ),
        );
        pushActivity(
          target,
          "更新负责人与描述",
          `负责人「${target.owner}」→「${patch.owner}」，描述已更新`,
        );
        toast.success("已保存组织信息");
      });
    },
    [guard, pushActivity, selected],
  );

  const applyStatus = React.useCallback(
    (org: Organization, status: Organization["status"], silent = false) => {
      setOrgList((list) => list.map((item) => (item.id === org.id ? { ...item, status } : item)));
      if (silent) return;
      setLiveMessage(status === "archived" ? `已归档「${org.name}」` : `已恢复「${org.name}」`);
    },
    [],
  );

  const handleArchive = React.useCallback(
    (org: Organization) => {
      if (!guard("archive")) return;
      const previous = org.status;
      applyStatus(org, "archived");
      pushActivity(org, "归档组织", "组织被归档，成员与项目归属保持不变", "warning");
      toast.success(`已归档「${org.name}」`, {
        description: "归档后仍可查看，编辑与成员管理将被限制。",
        action: {
          label: "撤销",
          onClick: () => {
            applyStatus(org, previous);
            pushActivity(org, "撤销归档", "恢复了组织的正常状态", "info");
            toast.info(`已撤销归档「${org.name}」`);
          },
        },
      });
    },
    [applyStatus, guard, pushActivity],
  );

  const handleRestore = React.useCallback(
    (org: Organization) => {
      if (!guard("restore")) return;
      applyStatus(org, "active");
      pushActivity(org, "恢复组织", "组织已恢复正常状态，重新出现在可选范围中", "info");
      toast.success(`已恢复「${org.name}」`);
    },
    [applyStatus, guard, pushActivity],
  );

  const confirmDelete = React.useCallback(() => {
    if (!deleteTarget || !guard("delete")) return;
    const target = deleteTarget;
    const parentId = target.parentId;
    setDeletePending(true);
    void sleep(420).then(() => {
      setDeletePending(false);
      setDeleteTarget(null);
      setOrgList((list) =>
        list
          .filter((org) => org.id !== target.id)
          // 下级组织自动上移一级，与确认弹窗中的说明保持一致
          .map((org) => (org.parentId === target.id ? { ...org, parentId } : org)),
      );
      setSelectedId(parentId ?? index.roots.find((org) => org.id !== target.id)?.id ?? null);
      pushActivity(target, "删除组织", "组织被删除，其下级组织已上移一级", "danger");
      toast.success(`已删除组织「${target.name}」`);
    });
  }, [deleteTarget, guard, index.roots, pushActivity]);

  const handleInviteMember = React.useCallback(() => {
    if (!selected || !guard("manage-members")) return;
    pushActivity(selected, "邀请成员", "已生成邀请链接并发送至组织负责人", "info");
    toast.success(`已生成「${selected.name}」的成员邀请链接`, {
      description: "演示环境：邀请链接不会真正发出。",
    });
  }, [guard, pushActivity, selected]);

  const handleExport = React.useCallback(() => {
    if (!guard("export")) return;
    toast.success(`已导出 ${formatNumber(index.nodeById.size)} 个组织（演示）`, {
      description: selected ? `范围：${selected.name} 及其下级组织` : "范围：全部组织",
    });
    if (selected) pushActivity(selected, "导出组织数据", "导出组织与成员清单为 CSV", "info");
  }, [guard, index.nodeById.size, pushActivity, selected]);

  return (
    <PageContainer className="gap-3 lg:h-full lg:px-7 lg:py-4">
      <OrgPathBar
        title="组织架构"
        description="左树定位 · 右侧管理 · 懒加载与虚拟滚动 · 操作受身份权限控制"
        index={index}
        path={path}
        query={query}
        onQueryChange={setQuery}
        matchCount={search ? search.matchIds.size : null}
        onNavigate={(id) => setSelectedId(id)}
        role={role}
        onRoleChange={(next) => {
          setRole(next);
          setLiveMessage("已切换权限视角");
        }}
        canCreate={permissions.can("create")}
        createDenyReason={permissions.denyReason("create")}
        onCreate={() => openCreate(null)}
        canExport={permissions.can("export")}
        exportDenyReason={permissions.denyReason("export")}
        onExport={handleExport}
      />

      <div className="grid min-h-0 gap-3 lg:flex-1 lg:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)]">
        <OrgTreePanel
          index={index}
          rows={rows}
          selectedId={selectedId}
          query={query}
          onQueryChange={setQuery}
          search={search}
          expandedIds={expandedIds}
          loadingIds={loadingIds}
          onSelect={handleSelect}
          onToggle={handleToggle}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onCreate={() => openCreate(selected)}
          canCreate={permissions.can("create")}
          createDenyReason={permissions.denyReason("create")}
          liveMessage={liveMessage}
          className="h-[34svh] min-h-[13rem] lg:h-full"
        />

        <OrgDetailPanel
          org={selected}
          index={index}
          permissions={permissions}
          activities={activities}
          tab={tab}
          onTabChange={setTab}
          onNavigate={handleSelect}
          onEdit={() => selected && openEdit(selected)}
          onCreateChild={() => openCreate(selected)}
          onArchive={() => selected && handleArchive(selected)}
          onRestore={() => selected && handleRestore(selected)}
          onDelete={() => {
            if (selected && guard("delete")) setDeleteTarget(selected);
          }}
          saving={savingBasics}
          onSaveBasics={handleSaveBasics}
          onInviteMember={handleInviteMember}
          className="h-[72svh] lg:h-full"
        />
      </div>

      <OrgFormDialog
        open={dialogOpen}
        editing={editing}
        parentForCreate={presetParent}
        index={index}
        pending={formPending}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setParentForCreate(null);
          }
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除组织「${deleteTarget?.name ?? ""}」？`}
        description={
          deleteTarget
            ? `该组织有 ${index.childrenByParent.get(deleteTarget.id)?.length ?? 0} 个直属下级组织，删除后它们会上移一级挂到「${
                deleteTarget.parentId
                  ? (index.nodeById.get(deleteTarget.parentId)?.name ?? "上级组织")
                  : "顶层"
              }」。操作不可撤销。`
            : ""
        }
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
