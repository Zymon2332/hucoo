"use client";

import * as React from "react";
import {
  Archive,
  ArrowUpRight,
  Building2,
  CornerDownRight,
  FolderTree,
  History,
  Layers,
  Lock,
  MousePointerClick,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DetailGrid, DetailRow, DetailSection } from "@/components/common/detail-sheet";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { OrgMembersList } from "@/components/organizations/org-members-list";
import { ORG_TYPE_LABEL, orgPathOf, type OrgTreeIndex } from "@/lib/org-tree";
import {
  ORG_CAPABILITY_LABEL,
  ORG_CAPABILITY_REQUIRED_ROLE,
  ORG_ROLE_LABEL,
  orgStatusRestriction,
  type OrgCapability,
  type OrgPermissionSet,
} from "@/lib/permissions";
import type { OrgActivity, OrgActivityTone } from "@/lib/org-activity";
import type { Organization } from "@/types";
import { cn, formatDate, formatNumber, formatRelativeTime } from "@/lib/utils";

export type OrgDetailTab = "overview" | "members" | "children" | "governance";

const TYPE_ICON = { company: Building2, department: Layers, team: FolderTree } as const;

const TONE_DOT: Record<OrgActivityTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

interface BasicDraft {
  owner: string;
  description: string;
}

interface OrgDetailPanelProps {
  org: Organization | null;
  index: OrgTreeIndex;
  permissions: OrgPermissionSet;
  activities: OrgActivity[];
  tab: OrgDetailTab;
  onTabChange: (tab: OrgDetailTab) => void;
  onNavigate: (id: string) => void;
  onEdit: () => void;
  onCreateChild: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  saving: boolean;
  onSaveBasics: (patch: BasicDraft) => void;
  onInviteMember: () => void;
  className?: string;
}

export function OrgDetailPanel({
  org,
  index,
  permissions,
  activities,
  tab,
  onTabChange,
  onNavigate,
  onEdit,
  onCreateChild,
  onArchive,
  onRestore,
  onDelete,
  saving,
  onSaveBasics,
  onInviteMember,
  className,
}: OrgDetailPanelProps) {
  const [draft, setDraft] = React.useState<BasicDraft>({ owner: "", description: "" });

  React.useEffect(() => {
    setDraft({ owner: org?.owner ?? "", description: org?.description ?? "" });
  }, [org?.id, org?.owner, org?.description]);

  if (!org) {
    return (
      <section
        aria-label="组织详情"
        className={cn(
          "border-border bg-card flex min-h-0 flex-col items-center justify-center rounded-xl border p-6",
          className,
        )}
      >
        <EmptyState
          icon={MousePointerClick}
          title="请选择一个组织"
          description="在左侧组织树中点击任意节点，右侧会展示该组织的概览、成员、下级组织与操作记录。也可以直接搜索组织名称或编码。"
          className="border-0 bg-transparent"
        />
      </section>
    );
  }

  const Icon = TYPE_ICON[org.type];
  const stats = index.statsById.get(org.id);
  const children = index.childrenByParent.get(org.id) ?? [];
  const parent = org.parentId ? (index.nodeById.get(org.parentId) ?? null) : null;
  const path = orgPathOf(index, org.id);
  const depth = index.depthById.get(org.id) ?? 0;
  const orgActivities = activities.filter((item) => item.orgId === org.id).slice(0, 10);

  /** 身份权限 + 组织状态共同决定按钮可用性，禁用时给出可读原因。 */
  const denyReason = (capability: OrgCapability) =>
    orgStatusRestriction(org, capability) ?? permissions.denyReason(capability);
  const isBlocked = (capability: OrgCapability) => denyReason(capability) !== null;

  const ownerError =
    draft.owner.trim().length < 2
      ? "负责人姓名至少 2 个字符"
      : draft.owner.trim().length > 20
        ? "负责人姓名不超过 20 个字符"
        : null;
  const descriptionError = draft.description.length > 80 ? "描述不超过 80 个字符" : null;
  const dirty = draft.owner !== org.owner || draft.description !== org.description;
  const canEdit = !isBlocked("edit");
  const formInvalid = Boolean(ownerError || descriptionError);

  return (
    <section
      aria-label="组织详情"
      className={cn("border-border bg-card flex min-h-0 flex-col rounded-xl border", className)}
    >
      <header className="border-border flex flex-col gap-2 border-b px-3.5 py-3">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <h2 className="font-display truncate text-base font-semibold">{org.name}</h2>
              <Badge variant="secondary">{ORG_TYPE_LABEL[org.type]}</Badge>
              <StatusBadge status={org.status} />
            </div>
            <p className="text-muted-foreground text-2xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono">{org.code}</span>
              <span aria-hidden>·</span>
              <span>{org.tenantName}</span>
              <span aria-hidden>·</span>
              <span>
                第 {depth + 1} 层 / 共 {index.maxDepth + 1} 层
              </span>
              <span aria-hidden>·</span>
              <span>
                负责人 {org.owner} · 直属 {formatNumber(org.memberCount)} 人
              </span>
              {permissions.denied.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3" />
                  当前身份「{ORG_ROLE_LABEL[permissions.role]}」有 {permissions.denied.length}{" "}
                  项操作受限
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit}
              onClick={onEdit}
              title={canEdit ? "编辑组织信息" : (denyReason("edit") ?? undefined)}
              className={cn(!canEdit && "cursor-not-allowed")}
            >
              <Pencil />
              编辑
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBlocked("create")}
              onClick={onCreateChild}
              title={
                isBlocked("create") ? (denyReason("create") ?? undefined) : "在当前组织下新建下级"
              }
              className={cn(isBlocked("create") && "cursor-not-allowed")}
            >
              <Plus />
              新建下级
            </Button>
            {org.status === "active" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBlocked("archive")}
                onClick={onArchive}
                title={isBlocked("archive") ? (denyReason("archive") ?? undefined) : "归档该组织"}
                className={cn(isBlocked("archive") && "cursor-not-allowed")}
              >
                <Archive />
                归档
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBlocked("restore")}
                onClick={onRestore}
                title={isBlocked("restore") ? (denyReason("restore") ?? undefined) : "恢复该组织"}
                className={cn(isBlocked("restore") && "cursor-not-allowed")}
              >
                <RotateCcw />
                恢复
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBlocked("delete")}
              onClick={onDelete}
              title={isBlocked("delete") ? (denyReason("delete") ?? undefined) : "删除该组织"}
              className={cn(isBlocked("delete") && "cursor-not-allowed")}
            >
              <Trash2 />
              删除
            </Button>
          </div>
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as OrgDetailTab)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="border-border border-b px-3.5 py-1.5">
          <TabsList className="h-8">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="members">
              成员
              <span className="num">{formatNumber(org.memberCount)}</span>
            </TabsTrigger>
            <TabsTrigger value="children">
              下级组织
              <span className="num">{children.length}</span>
            </TabsTrigger>
            <TabsTrigger value="governance">操作与权限</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto p-3.5">
          <div className="flex flex-col gap-5">
            <DetailSection
              title="基本信息"
              description="编码与租户信息由同步任务维护，负责人与描述可在此直接修改。"
            >
              <DetailGrid>
                <DetailRow label="组织编码" mono>
                  {org.code}
                </DetailRow>
                <DetailRow label="组织 ID" mono>
                  {org.id}
                </DetailRow>
                <DetailRow label="所属租户">{org.tenantName}</DetailRow>
                <DetailRow label="组织类型">{ORG_TYPE_LABEL[org.type]}</DetailRow>
                <DetailRow label="上级组织">
                  {parent ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(parent.id)}
                      className="text-primary inline-flex cursor-pointer items-center gap-1 hover:underline"
                    >
                      {parent.name}
                      <ArrowUpRight className="size-3" />
                    </button>
                  ) : (
                    "无（顶层组织）"
                  )}
                </DetailRow>
                <DetailRow label="层级深度">
                  <span className="num">{depth + 1}</span> / {index.maxDepth + 1}
                </DetailRow>
                <DetailRow label="创建时间">{formatDate(org.createdAt)}</DetailRow>
                <DetailRow label="最近更新">
                  {formatDate(org.updatedAt, "yyyy-MM-dd HH:mm")}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection
              title="成员与项目"
              description="直属数据来自组织本体，含下级数据由组织树汇总得出。"
            >
              <DetailGrid columns={3}>
                <DetailRow label="直属成员">
                  <span className="num">{formatNumber(org.memberCount)}</span>
                </DetailRow>
                <DetailRow label="直属项目">
                  <span className="num">{org.projectCount}</span>
                </DetailRow>
                <DetailRow label="下级组织">
                  <span className="num">{formatNumber(stats?.descendantCount ?? 0)}</span>
                </DetailRow>
                <DetailRow label="含下级成员">
                  <span className="num">{formatNumber(stats?.memberCount ?? org.memberCount)}</span>
                </DetailRow>
                <DetailRow label="含下级项目">
                  <span className="num">{stats?.projectCount ?? org.projectCount}</span>
                </DetailRow>
                <DetailRow label="人均项目">
                  <span className="num">
                    {org.memberCount > 0 ? (org.projectCount / org.memberCount).toFixed(2) : "0.00"}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="组织路径" description="点击任意层级可快速跳转定位。">
              <nav aria-label="组织层级路径">
                <ol className="flex flex-wrap items-center gap-1.5">
                  {path.map((node, position) => (
                    <li key={node.id} className="flex items-center gap-1.5">
                      {position > 0 ? (
                        <CornerDownRight className="text-muted-foreground size-3" aria-hidden />
                      ) : null}
                      {node.id === org.id ? (
                        <span className="bg-primary/10 text-foreground text-2xs rounded-md px-2 py-1 font-medium">
                          {node.name}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate(node.id)}
                          className="text-muted-foreground hover:bg-accent hover:text-foreground text-2xs cursor-pointer rounded-md px-2 py-1 transition-colors"
                        >
                          {node.name}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </DetailSection>

            <DetailSection
              title="负责人与描述"
              description={
                canEdit
                  ? "修改后点击保存，操作会记录在「操作与权限」中。"
                  : (denyReason("edit") ?? undefined)
              }
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="org-owner" className="text-2xs font-medium">
                    负责人
                  </label>
                  <Input
                    id="org-owner"
                    value={draft.owner}
                    disabled={!canEdit}
                    aria-invalid={ownerError ? true : undefined}
                    aria-describedby={ownerError ? "org-owner-error" : undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, owner: event.target.value }))
                    }
                    className="h-8 max-w-xs text-xs"
                  />
                  {ownerError ? (
                    <p id="org-owner-error" className="text-destructive text-2xs">
                      {ownerError}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="org-description" className="text-2xs font-medium">
                    组织描述
                  </label>
                  <Textarea
                    id="org-description"
                    value={draft.description}
                    disabled={!canEdit}
                    rows={2}
                    maxLength={120}
                    aria-invalid={descriptionError ? true : undefined}
                    aria-describedby={descriptionError ? "org-description-error" : undefined}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="min-h-16 text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {descriptionError ? (
                      <p id="org-description-error" className="text-destructive text-2xs">
                        {descriptionError}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-2xs">
                        {dirty ? "有未保存的修改" : "内容与当前组织一致"}
                      </span>
                    )}
                    <span className="text-muted-foreground num text-2xs">
                      {draft.description.length}/120
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!dirty || formInvalid || saving}
                    onClick={() =>
                      onSaveBasics({
                        owner: draft.owner.trim(),
                        description: draft.description.trim(),
                      })
                    }
                  >
                    {saving ? "保存中…" : "保存修改"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!dirty || saving}
                    onClick={() => setDraft({ owner: org.owner, description: org.description })}
                  >
                    重置
                  </Button>
                </div>
              </div>
            </DetailSection>
          </div>
        </TabsContent>

        <TabsContent value="members" className="flex min-h-0 flex-1 flex-col overflow-hidden p-3.5">
          <OrgMembersList
            org={org}
            subtreeMemberCount={stats?.memberCount ?? org.memberCount}
            canInvite={!isBlocked("manage-members")}
            inviteDenyReason={denyReason("manage-members")}
            onInvite={onInviteMember}
          />
        </TabsContent>

        <TabsContent value="children" className="min-h-0 flex-1 overflow-y-auto p-3.5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-2xs">
                共 <span className="num text-foreground font-medium">{children.length}</span>{" "}
                个直属下级 · 含下级{" "}
                <span className="num text-foreground font-medium">
                  {formatNumber(stats?.descendantCount ?? 0)}
                </span>{" "}
                个组织
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBlocked("create")}
                onClick={onCreateChild}
                title={isBlocked("create") ? (denyReason("create") ?? undefined) : undefined}
                className={cn("ml-auto", isBlocked("create") && "cursor-not-allowed")}
              >
                <Plus />
                新建下级组织
              </Button>
            </div>

            {children.length === 0 ? (
              <EmptyState
                icon={FolderTree}
                title="该组织暂无下级组织"
                description="可以新建下级组织，把成员与项目继续拆分到更细的团队。"
                action={
                  <Button
                    type="button"
                    size="sm"
                    disabled={isBlocked("create")}
                    onClick={onCreateChild}
                  >
                    <Plus />
                    新建下级组织
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-1.5">
                {children.map((child) => {
                  const ChildIcon = TYPE_ICON[child.type];
                  const childStats = index.statsById.get(child.id);
                  return (
                    <li key={child.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(child.id)}
                        className="border-border hover:border-primary/40 hover:bg-accent/50 flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
                      >
                        <ChildIcon
                          className="text-muted-foreground size-3.5 shrink-0"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{child.name}</span>
                          <span className="text-muted-foreground text-2xs block truncate font-mono">
                            {child.code} · 负责人 {child.owner}
                          </span>
                        </span>
                        <span className="text-muted-foreground num text-2xs hidden shrink-0 sm:inline">
                          含下级 {formatNumber(childStats?.memberCount ?? child.memberCount)} 人
                        </span>
                        <Badge variant="outline" className="shrink-0">
                          {ORG_TYPE_LABEL[child.type]}
                        </Badge>
                        <StatusBadge status={child.status} className="shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="governance" className="min-h-0 flex-1 overflow-y-auto p-3.5">
          <div className="flex flex-col gap-5">
            <DetailSection
              title="当前身份"
              description="通过顶部的「权限视角」切换身份，即可看到操作按钮的启用/受限变化。"
            >
              <div className="border-border bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <ShieldCheck className="text-primary size-4" />
                <span className="text-xs font-medium">{ORG_ROLE_LABEL[permissions.role]}</span>
                <Badge variant="success">{permissions.allowed.length} 项允许</Badge>
                <Badge variant={permissions.denied.length > 0 ? "warning" : "secondary"}>
                  {permissions.denied.length} 项受限
                </Badge>
              </div>
            </DetailSection>

            <DetailSection
              title="操作权限"
              description="受限项会说明所需身份；组织已归档时，编辑类操作会额外被限制。"
            >
              <ul className="flex flex-col gap-1.5">
                {(Object.keys(ORG_CAPABILITY_LABEL) as OrgCapability[]).map((capability) => {
                  const reason = denyReason(capability);
                  return (
                    <li
                      key={capability}
                      className="border-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <span className="text-xs">{ORG_CAPABILITY_LABEL[capability]}</span>
                      {reason ? (
                        <>
                          <Badge variant="warning" className="ml-auto shrink-0">
                            受限
                          </Badge>
                          <span className="text-muted-foreground text-2xs w-full sm:w-auto">
                            {reason}
                            <span className="sr-only">
                              （需要{ORG_ROLE_LABEL[ORG_CAPABILITY_REQUIRED_ROLE[capability]]}
                              及以上身份）
                            </span>
                          </span>
                        </>
                      ) : (
                        <Badge variant="success" className="ml-auto shrink-0">
                          允许
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </DetailSection>

            <DetailSection
              title="操作记录"
              description={`最近 ${orgActivities.length} 条与本组织相关的操作，本次会话内的新操作会实时追加。`}
            >
              {orgActivities.length === 0 ? (
                <p className="text-muted-foreground text-2xs">该组织还没有操作记录。</p>
              ) : (
                <ul className="flex flex-col">
                  {orgActivities.map((activity, position) => (
                    <li key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            TONE_DOT[activity.tone],
                          )}
                        />
                        {position < orgActivities.length - 1 ? (
                          <Separator orientation="vertical" className="min-h-4 flex-1" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 pb-3">
                        <p className="flex flex-wrap items-center gap-x-2 text-xs">
                          <span className="font-medium">{activity.action}</span>
                          <span className="text-muted-foreground text-2xs">
                            {activity.actor} · {ORG_ROLE_LABEL[activity.role]}
                          </span>
                          <span className="text-muted-foreground num text-2xs ml-auto">
                            {formatRelativeTime(activity.at)}
                          </span>
                        </p>
                        <p className="text-muted-foreground text-2xs mt-0.5">{activity.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>

            <DetailSection
              title="成员概览"
              description="快速切换身份核对权限后，可回到成员标签页继续操作。"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onTabChange("members")}
                >
                  <Users />
                  查看成员名单
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onTabChange("children")}
                >
                  <FolderTree />
                  查看下级组织
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTabChange("overview")}
                >
                  <History />
                  返回概览
                </Button>
              </div>
            </DetailSection>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
