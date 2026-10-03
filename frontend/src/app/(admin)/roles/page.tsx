"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { permissionModules, permissions, roles as roleSeed } from "@/lib/mock-data/roles";
import { users } from "@/lib/mock-data/users";
import type { Permission, Role } from "@/types";
import { formatDate, formatNumber } from "@/lib/utils";

const MODULE_LABEL: Record<string, string> = {
  tenant: "租户",
  user: "成员与身份",
  model: "模型",
  tool: "工具",
  project: "项目",
  billing: "计费",
  audit: "审计",
  security: "安全",
  monitoring: "监控",
  integration: "集成",
  experiment: "实验",
  setting: "设置",
};

const SCOPE_LABEL: Record<Role["scope"], string> = {
  platform: "平台级",
  tenant: "租户级",
  organization: "组织级",
  project: "项目级",
};

const SCOPE_OPTIONS = (Object.keys(SCOPE_LABEL) as Role["scope"][]).map((value) => ({
  value,
  label: SCOPE_LABEL[value],
}));

const roleSchema = z.object({
  name: z.string().min(2, "角色名称至少 2 个字符").max(20, "角色名称过长"),
  code: z
    .string()
    .min(2, "标识至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "仅允许小写字母、数字与连字符"),
  scope: z.enum(["platform", "tenant", "organization", "project"]),
  description: z.string().min(4, "请填写角色说明").max(200, "说明过长"),
  level: z.coerce.number().int().min(1, "等级至少为 1").max(100, "等级最高为 100"),
  permissions: z.array(z.string()).min(1, "请至少选择一项权限"),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export default function RolesPage() {
  const [roleList, setRoleList] = React.useState<Role[]>(roleSeed);
  const [scopeFilter, setScopeFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<Role | null>(null);
  const [detailRole, setDetailRole] = React.useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Role | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      code: "",
      scope: "project",
      description: "",
      level: 30,
      permissions: [],
    },
  });

  React.useEffect(() => {
    if (editingRole) {
      form.reset({
        name: editingRole.name,
        code: editingRole.code,
        scope: editingRole.scope,
        description: editingRole.description,
        level: editingRole.level,
        permissions: editingRole.permissions,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        scope: "project",
        description: "",
        level: 30,
        permissions: [],
      });
    }
  }, [editingRole, form]);

  const filtered = React.useMemo(
    () =>
      roleList.filter(
        (role) =>
          (scopeFilter === "all" || role.scope === scopeFilter) &&
          (typeFilter === "all" ||
            (typeFilter === "system" ? role.isSystem : !role.isSystem)),
      ),
    [roleList, scopeFilter, typeFilter],
  );

  const activeFilterCount = [scopeFilter, typeFilter].filter((value) => value !== "all").length;

  const stats = React.useMemo(() => {
    const system = roleList.filter((role) => role.isSystem).length;
    const custom = roleList.length - system;
    const coveredUsers = roleList.reduce((total, role) => total + role.userCount, 0);
    return { total: roleList.length, system, custom, coveredUsers };
  }, [roleList]);

  const permissionById = React.useMemo(
    () => new Map(permissions.map((permission) => [permission.id, permission])),
    [],
  );

  const onSubmit = (values: RoleFormValues) => {
    if (editingRole) {
      setRoleList((list) =>
        list.map((role) =>
          role.id === editingRole.id ? { ...role, ...values, updatedAt: new Date().toISOString() } : role,
        ),
      );
      toast.success(`已更新角色「${values.name}」`);
      setEditingRole(null);
      return;
    }

    const newRole: Role = {
      id: `role-${String(roleList.length + 1).padStart(2, "0")}`,
      code: values.code,
      name: values.name,
      description: values.description,
      scope: values.scope,
      level: values.level,
      isSystem: false,
      userCount: 0,
      permissions: values.permissions,
      updatedAt: new Date().toISOString(),
    };
    setRoleList((list) => [newRole, ...list]);
    toast.success(`已创建角色「${values.name}」`);
    setCreateOpen(false);
    form.reset();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setRoleList((list) => list.filter((role) => role.id !== deleteTarget.id));
      toast.success(`已删除角色「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 400);
  };

  const columns = React.useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "角色",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.code}</p>
          </div>
        ),
      },
      {
        id: "scope",
        accessorKey: "scope",
        header: "范围",
        cell: ({ row }) => <Badge variant="secondary">{SCOPE_LABEL[row.original.scope]}</Badge>,
      },
      {
        id: "level",
        accessorKey: "level",
        header: "等级",
        cell: ({ row }) => <span className="num text-xs">{row.original.level}</span>,
      },
      {
        id: "userCount",
        accessorKey: "userCount",
        header: "用户数",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.userCount)}</span>,
      },
      {
        id: "permissionCount",
        header: "权限数",
        enableSorting: false,
        cell: ({ row }) => <span className="num text-xs">{row.original.permissions.length}</span>,
      },
      {
        id: "isSystem",
        header: "类型",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isSystem ? (
            <Badge variant="info">系统角色</Badge>
          ) : (
            <Badge variant="outline">自定义</Badge>
          ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => <span className="text-2xs">{formatDate(row.original.updatedAt, "yyyy-MM-dd HH:mm")}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailRole(row.original)}
            onEdit={() => setEditingRole(row.original)}
            onDuplicate={() => {
              setRoleList((list) => [
                {
                  ...row.original,
                  id: `role-${String(list.length + 1).padStart(2, "0")}`,
                  name: `${row.original.name}（副本）`,
                  code: `${row.original.code}-copy`,
                  isSystem: false,
                  userCount: 0,
                  updatedAt: new Date().toISOString(),
                },
                ...list,
              ]);
              toast.success("已复制角色及其权限配置");
            }}
            disabled={row.original.isSystem}
            onDelete={() => setDeleteTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="角色管理"
        description="维护平台级、租户级与项目级角色，配置其权限集合与继承关系。"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            新建角色
          </Button>
        }
      />

      <StatCardGrid className="xl:grid-cols-4 2xl:grid-cols-4">
        <StatCard label="角色总数" value={stats.total} icon={KeyRound} />
        <StatCard label="系统角色" value={stats.system} icon={ShieldCheck} tone="info" hint="内置，不可删除" />
        <StatCard label="自定义角色" value={stats.custom} icon={Sparkles} tone="success" />
        <StatCard label="覆盖用户" value={stats.coveredUsers} icon={Users} valueFormatter={formatNumber} delta={1.8} />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setScopeFilter("all");
          setTypeFilter("all");
        }}
      >
        <FilterSelect label="范围" value={scopeFilter} onChange={setScopeFilter} options={SCOPE_OPTIONS} />
        <FilterSelect
          label="类型"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "system", label: "系统角色" },
            { value: "custom", label: "自定义角色" },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索角色名称、标识…"
        onRowClick={(row) => setDetailRole(row)}
        emptyTitle="没有符合条件的角色"
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            新建角色
          </Button>
        }
      />

      <Dialog
        open={createOpen || editingRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingRole(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? `编辑角色 · ${editingRole.name}` : "新建角色"}</DialogTitle>
            <DialogDescription>角色与权限配置仅保存在本地状态，用于演示权限编排流程。</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：模型审核员" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色标识</FormLabel>
                      <FormControl>
                        <Input placeholder="model-reviewer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作用范围</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SCOPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem className="sm:max-w-[12rem]">
                    <FormLabel>等级（1–100）</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} {...field} />
                    </FormControl>
                    <FormDescription>数值越大权限越高，用于冲突时的优先级判断。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色说明</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="描述该角色的职责与边界…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>权限配置</FormLabel>
                    <div className="max-h-72 space-y-4 overflow-y-auto rounded-md border border-border p-3">
                      {permissionModules.map((module) => {
                        const modulePermissions = permissions.filter(
                          (permission) => permission.module === module,
                        );
                        return (
                          <div key={module} className="space-y-1.5">
                            <p className="text-muted-foreground text-2xs font-medium">
                              {MODULE_LABEL[module] ?? module}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {modulePermissions.map((permission) => (
                                <label
                                  key={permission.id}
                                  className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 text-2xs"
                                >
                                  <Checkbox
                                    className="mt-0.5"
                                    checked={field.value.includes(permission.id)}
                                    onCheckedChange={(value) => {
                                      field.onChange(
                                        value === true
                                          ? [...field.value, permission.id]
                                          : field.value.filter((id) => id !== permission.id),
                                      );
                                    }}
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate">{permission.name}</span>
                                    {permission.sensitive ? (
                                      <span className="text-muted-foreground block text-2xs">敏感权限</span>
                                    ) : null}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormDescription>
                      已选择 <span className="num">{field.value.length}</span> 项权限
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingRole(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingRole ? "保存修改" : "创建角色"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailRole !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRole(null);
        }}
        title={detailRole?.name ?? "角色详情"}
        description={detailRole ? `${detailRole.code} · ${SCOPE_LABEL[detailRole.scope]}` : undefined}
        footer={
          detailRole ? (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingRole(detailRole)}>
                编辑
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={detailRole.isSystem}
                onClick={() => setDeleteTarget(detailRole)}
              >
                删除角色
              </Button>
            </div>
          ) : null
        }
      >
        {detailRole ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{SCOPE_LABEL[detailRole.scope]}</Badge>
              {detailRole.isSystem ? <Badge variant="info">系统角色</Badge> : <Badge variant="outline">自定义</Badge>}
              <span className="num text-2xs">等级 {detailRole.level}</span>
            </div>

            <DetailSection title="角色说明">
              <p className="text-xs leading-relaxed">{detailRole.description}</p>
              <DetailGrid className="mt-2">
                <DetailRow label="角色 ID" mono>
                  {detailRole.id}
                </DetailRow>
                <DetailRow label="更新时间">
                  {formatDate(detailRole.updatedAt, "yyyy-MM-dd HH:mm")}
                </DetailRow>
                <DetailRow label="覆盖用户">
                  <span className="num">{formatNumber(detailRole.userCount)}</span>
                </DetailRow>
                <DetailRow label="权限数量">
                  <span className="num">{detailRole.permissions.length}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="权限清单" description="按模块分组展示已授予权限">
              <div className="space-y-3">
                {permissionModules.map((module) => {
                  const items = detailRole.permissions
                    .map((id) => permissionById.get(id))
                    .filter((permission): permission is Permission => permission !== undefined)
                    .filter((permission) => permission.module === module);
                  if (items.length === 0) return null;
                  return (
                    <div key={module} className="space-y-1.5">
                      <p className="text-muted-foreground text-2xs font-medium">
                        {MODULE_LABEL[module] ?? module}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((permission) => (
                          <Badge key={permission.id} variant={permission.sensitive ? "warning" : "success"}>
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailSection>

            <DetailSection title="关联用户" description="展示前 5 名拥有该角色的成员">
              <div className="space-y-1.5">
                {users
                  .filter((user) => user.roles.includes(detailRole.id))
                  .slice(0, 5)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
                    >
                      <span>{user.name}</span>
                      <span className="text-muted-foreground text-2xs">{user.tenantName}</span>
                    </div>
                  ))}
                {users.filter((user) => user.roles.includes(detailRole.id)).length === 0 ? (
                  <p className="text-muted-foreground text-2xs">暂无成员拥有该角色。</p>
                ) : null}
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除角色「${deleteTarget?.name ?? ""}」？`}
        description="删除后拥有该角色的成员会立即失去对应权限，请先确认已完成成员迁移。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
