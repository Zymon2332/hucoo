"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Mail,
  ShieldCheck,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge, RiskBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { apiKeys, serviceAccounts, ssoConfigs, users as userSeed } from "@/lib/mock-data/users";
import { permissionModules, permissions, roles } from "@/lib/mock-data/roles";
import { auditLogs } from "@/lib/mock-data/audit";
import { tenants } from "@/lib/mock-data/tenants";
import { createRandom } from "@/lib/mock-data/seed";
import type { AuditLog, SsoConfig, User, UserSource, UserStatus } from "@/types";
import { formatDate, formatPercent, formatRelativeTime } from "@/lib/utils";

const SOURCE_OPTIONS: UserSource[] = [
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

const STATUS_OPTIONS: UserStatus[] = ["active", "invited", "pending", "disabled", "locked"];

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "正常",
  invited: "已邀请",
  pending: "待激活",
  disabled: "已禁用",
  locked: "已锁定",
};

const SSO_PROVIDER_LABEL: Record<SsoConfig["provider"], string> = {
  oidc: "OIDC",
  saml: "SAML 2.0",
  ldap: "LDAP",
  wecom: "企业微信",
  feishu: "飞书",
  dingtalk: "钉钉",
};

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DerivedDevice {
  id: string;
  name: string;
  os: string;
  location: string;
  lastActiveAt: string;
  trusted: boolean;
}

const DEVICE_NAMES = ["MacBook Pro 16\"", "ThinkPad X1 Carbon", "Windows 11 工作站", "iPhone 15 Pro", "iPad Air", "Ubuntu 工作站"];
const DEVICE_OS = ["macOS 15.1", "Windows 11 23H2", "Ubuntu 24.04 LTS", "iOS 18.1", "Android 15"];
const DEVICE_LOCATIONS = ["上海", "北京", "深圳", "杭州", "成都", "天津"];

function buildDevices(user: User): DerivedDevice[] {
  const count = Math.max(0, user.deviceCount);
  let seed = 0;
  for (let index = 0; index < user.id.length; index += 1) {
    seed = (seed * 31 + user.id.charCodeAt(index)) % 2147483647;
  }
  const random = createRandom(seed + 97);
  const now = Date.parse("2026-09-17T09:30:00+08:00");
  return Array.from({ length: count }).map((_, index) => ({
    id: `${user.id}-dev-${index + 1}`,
    name: DEVICE_NAMES[Math.floor(random() * DEVICE_NAMES.length)] ?? DEVICE_NAMES[0]!,
    os: DEVICE_OS[Math.floor(random() * DEVICE_OS.length)] ?? DEVICE_OS[0]!,
    location: DEVICE_LOCATIONS[Math.floor(random() * DEVICE_LOCATIONS.length)] ?? DEVICE_LOCATIONS[0]!,
    lastActiveAt: new Date(now - Math.floor(random() * 72) * 3_600_000).toISOString(),
    trusted: index === 0 ? true : random() > 0.4,
  }));
}

const inviteSchema = z.object({
  emails: z
    .string()
    .min(1, "请输入至少一个邮箱")
    .refine(
      (value) =>
        value
          .split(/[\s,;，；]+/)
          .filter((item) => item.length > 0)
          .every((item) => EMAIL_PATTERN.test(item)),
      "存在格式不正确的邮箱地址",
    ),
  tenantId: z.string().min(1, "请选择租户"),
  roleIds: z.array(z.string()).min(1, "请至少分配一个角色"),
  expiresInDays: z.coerce.number().int().min(1, "有效期至少 1 天").max(90, "有效期最长 90 天"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

const editSchema = z.object({
  name: z.string().min(2, "姓名至少 2 个字符").max(20, "姓名过长"),
  email: z.string().email("请输入合法邮箱"),
  tenantId: z.string().min(1, "请选择租户"),
  status: z.enum(["active", "invited", "pending", "disabled", "locked"]),
  mfaEnabled: z.boolean(),
  roleIds: z.array(z.string()).min(1, "请至少分配一个角色"),
});

type EditFormValues = z.infer<typeof editSchema>;

const importSchema = z.object({
  csv: z.string().min(1, "请粘贴 CSV 内容"),
});

type ImportFormValues = z.infer<typeof importSchema>;

export default function UsersPage() {
  const [userList, setUserList] = React.useState<User[]>(userSeed);
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<User | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [detailUser, setDetailUser] = React.useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);
  const [disableTarget, setDisableTarget] = React.useState<User | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = React.useState(false);
  const [bulkAssignRows, setBulkAssignRows] = React.useState<User[]>([]);
  const [bulkAssignRole, setBulkAssignRole] = React.useState("");
  const clearSelectionRef = React.useRef<() => void>(() => {});

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      emails: "",
      tenantId: tenants[0]?.id ?? "",
      roleIds: [],
      expiresInDays: 7,
    },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      email: "",
      tenantId: tenants[0]?.id ?? "",
      status: "active",
      mfaEnabled: false,
      roleIds: [],
    },
  });

  const importForm = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { csv: "" },
  });

  React.useEffect(() => {
    if (editUser) {
      editForm.reset({
        name: editUser.name,
        email: editUser.email,
        tenantId: editUser.tenantId,
        status: editUser.status,
        mfaEnabled: editUser.mfaEnabled,
        roleIds: editUser.roles,
      });
    }
  }, [editUser, editForm]);

  const roleById = React.useMemo(() => new Map(roles.map((role) => [role.id, role])), []);
  const roleNameById = React.useMemo(() => new Map(roles.map((role) => [role.id, role.name])), []);

  const tenantOptions = React.useMemo(
    () => Array.from(new Set(userList.map((user) => user.tenantId))).map((id) => ({
      value: id,
      label: tenants.find((tenant) => tenant.id === id)?.name ?? id,
    })),
    [userList],
  );

  const roleOptions = React.useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [],
  );

  const statusOptions = React.useMemo(
    () => STATUS_OPTIONS.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
    [],
  );

  const sourceOptions = React.useMemo(
    () => SOURCE_OPTIONS.map((source) => ({ value: source, label: labelOfSource(source) })),
    [],
  );

  const filtered = React.useMemo(
    () =>
      userList.filter(
        (user) =>
          (tenantFilter === "all" || user.tenantId === tenantFilter) &&
          (roleFilter === "all" || user.roles.includes(roleFilter)) &&
          (statusFilter === "all" || user.status === statusFilter) &&
          (sourceFilter === "all" || user.source === sourceFilter),
      ),
    [userList, tenantFilter, roleFilter, statusFilter, sourceFilter],
  );

  const activeFilterCount = [tenantFilter, roleFilter, statusFilter, sourceFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = userList.length;
    const active = userList.filter((user) => user.status === "active").length;
    const pending = userList.filter((user) => user.status === "invited" || user.status === "pending").length;
    const disabled = userList.filter((user) => user.status === "disabled" || user.status === "locked").length;
    const mfaEnabled = userList.filter((user) => user.mfaEnabled).length;
    const tenantsCovered = new Set(userList.map((user) => user.tenantId)).size;
    return {
      total,
      active,
      pending,
      disabled,
      mfaRate: total > 0 ? (mfaEnabled / total) * 100 : 0,
      tenantsCovered,
    };
  }, [userList]);

  const handleInvite = (values: InviteFormValues) => {
    const tenant = tenants.find((item) => item.id === values.tenantId);
    const emails = values.emails
      .split(/[\s,;，；]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const nextUsers: User[] = emails.map((email, index) => {
      const local = email.split("@")[0] ?? email;
      const roleList = values.roleIds.map((id) => roleNameById.get(id) ?? id);
      return {
        id: `usr-${String(userList.length + index + 1).padStart(2, "0")}`,
        name: local,
        email,
        phone: "—",
        tenantId: values.tenantId,
        tenantName: tenant?.name ?? "—",
        orgId: "",
        orgName: "—",
        department: "—",
        title: "待补充",
        roles: values.roleIds,
        roleNames: roleList,
        status: "invited",
        source: "invite",
        mfaEnabled: false,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        apiKeyCount: 0,
        deviceCount: 0,
      };
    });

    setUserList((list) => [...nextUsers, ...list]);
    toast.success(`已向 ${nextUsers.length} 个邮箱发送邀请，有效期 ${values.expiresInDays} 天`);
    setInviteOpen(false);
    inviteForm.reset();
  };

  const handleEdit = (values: EditFormValues) => {
    if (!editUser) return;
    const tenant = tenants.find((item) => item.id === values.tenantId);
    const roleList = values.roleIds.map((id) => roleNameById.get(id) ?? id);
    setUserList((list) =>
      list.map((user) =>
        user.id === editUser.id
          ? {
              ...user,
              name: values.name,
              email: values.email,
              tenantId: values.tenantId,
              tenantName: tenant?.name ?? user.tenantName,
              roles: values.roleIds,
              roleNames: roleList,
              status: values.status,
              mfaEnabled: values.mfaEnabled,
            }
          : user,
      ),
    );
    toast.success(`已更新用户「${values.name}」`);
    setEditUser(null);
  };

  const handleImport = (values: ImportFormValues) => {
    const lines = values.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const rows = lines.length > 0 && /邮箱|email/i.test(lines[0] ?? "") ? lines.length - 1 : lines.length;
    toast.success(`已解析 ${rows} 条成员记录并加入导入队列（演示）`);
    setImportOpen(false);
    importForm.reset();
  };

  const toggleUserStatus = (user: User) => {
    if (user.status === "disabled" || user.status === "locked") {
      setUserList((list) => list.map((item) => (item.id === user.id ? { ...item, status: "active" } : item)));
      toast.success(`已启用「${user.name}」`);
      return;
    }
    setDisableTarget(user);
  };

  const confirmDisable = () => {
    if (!disableTarget) return;
    setUserList((list) =>
      list.map((item) => (item.id === disableTarget.id ? { ...item, status: "disabled" } : item)),
    );
    toast.success(`已禁用「${disableTarget.name}」，其会话已失效`);
    setDisableTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setUserList((list) => list.filter((user) => user.id !== deleteTarget.id));
      toast.success(`已删除用户「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 400);
  };

  const batchDisable = (rows: User[], clear: () => void) => {
    setUserList((list) =>
      list.map((user) =>
        rows.some((row) => row.id === user.id) ? { ...user, status: "disabled" } : user,
      ),
    );
    toast.success(`已批量禁用 ${rows.length} 名成员`);
    clear();
  };

  const confirmBulkAssign = () => {
    const role = roleById.get(bulkAssignRole);
    if (!role) {
      toast.error("请选择要分配的角色");
      return;
    }
    setUserList((list) =>
      list.map((user) =>
        bulkAssignRows.some((row) => row.id === user.id)
          ? {
              ...user,
              roles: user.roles.includes(role.id) ? user.roles : [...user.roles, role.id],
              roleNames: user.roleNames.includes(role.name) ? user.roleNames : [...user.roleNames, role.name],
            }
          : user,
      ),
    );
    toast.success(`已为 ${bulkAssignRows.length} 名成员追加「${role.name}」角色`);
    clearSelectionRef.current();
    setBulkAssignOpen(false);
    setBulkAssignRows([]);
  };

  const columns = React.useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "成员",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/users/${row.original.id}`}
              className="hover:text-primary text-xs font-medium transition-colors"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.name}
            </Link>
            <p className="text-muted-foreground truncate font-mono text-2xs">{row.original.email}</p>
          </div>
        ),
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs">{row.original.tenantName}</span>,
      },
      {
        id: "orgName",
        accessorKey: "orgName",
        header: "组织 / 部门",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.orgName}</p>
            <p className="text-muted-foreground text-2xs">{row.original.department}</p>
          </div>
        ),
      },
      {
        id: "roles",
        header: "角色",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roleNames.length > 0 ? (
              row.original.roleNames.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-2xs">—</span>
            )}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} label={STATUS_LABEL[row.original.status]} />,
      },
      {
        id: "source",
        accessorKey: "source",
        header: "来源",
        cell: ({ row }) => <Badge variant="outline">{labelOfSource(row.original.source)}</Badge>,
      },
      {
        id: "mfaEnabled",
        header: "MFA",
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge status={row.original.mfaEnabled ? "enabled" : "disabled"} />
        ),
      },
      {
        id: "lastLoginAt",
        accessorKey: "lastLoginAt",
        header: "最后登录",
        cell: ({ row }) => <span className="text-2xs">{formatRelativeTime(row.original.lastLoginAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailUser(row.original)}
            onEdit={() => setEditUser(row.original)}
            onToggleStatus={() => toggleUserStatus(row.original)}
            statusActive={row.original.status !== "disabled" && row.original.status !== "locked"}
            onDelete={() => setDeleteTarget(row.original)}
            extraItems={[
              { label: "重置 MFA", onSelect: () => toast.success(`已发送 MFA 重置链接给「${row.original.name}」`) },
              { label: "查看权限", onSelect: () => setDetailUser(row.original) },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="用户管理"
        description="管理平台成员的账号、角色、来源与 MFA 状态，支持邀请、批量导入与权限分配。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload />
              批量导入
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus />
              邀请用户
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="总用户" value={stats.total} icon={Users} delta={2.6} />
        <StatCard label="活跃用户" value={stats.active} icon={UserCheck} tone="success" hint="近 30 天有登录" />
        <StatCard label="待激活" value={stats.pending} icon={Mail} tone="info" hint="已邀请或待处理" />
        <StatCard label="已禁用" value={stats.disabled} icon={UserX} tone="danger" hint="含已锁定账号" />
        <StatCard
          label="MFA 开启率"
          value={stats.mfaRate}
          unit="%"
          icon={ShieldCheck}
          valueFormatter={(value) => formatPercent(value, 1)}
          tone="warning"
        />
        <StatCard label="覆盖租户" value={stats.tenantsCovered} icon={Building2} />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTenantFilter("all");
          setRoleFilter("all");
          setStatusFilter("all");
          setSourceFilter("all");
        }}
      >
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
        <FilterSelect label="角色" value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
        <FilterSelect label="来源" value={sourceFilter} onChange={setSourceFilter} options={sourceOptions} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索姓名、邮箱、部门…"
        enableRowSelection
        onRowClick={(row) => setDetailUser(row)}
        bulkActions={(rows, clear) => {
          clearSelectionRef.current = clear;
          return (
            <>
              <Button variant="ghost" size="xs" onClick={() => batchDisable(rows, clear)}>
                <UserX />
                批量禁用
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setBulkAssignRows(rows);
                  setBulkAssignRole(roles[0]?.id ?? "");
                  setBulkAssignOpen(true);
                }}
              >
                批量分配角色
              </Button>
            </>
          );
        }}
        emptyTitle="没有符合条件的用户"
        emptyAction={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus />
            邀请用户
          </Button>
        }
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>邀请用户</DialogTitle>
            <DialogDescription>支持一次邀请多个邮箱，邀请将按所选角色与有效期发送。</DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱列表</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={"每行一个邮箱，例如：\nzhangsan@example.com\nlisi@example.com"}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>支持换行、逗号、分号分隔，系统会逐行校验格式。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={inviteForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属租户</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择租户" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="expiresInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邀请有效期（天）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={90} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={inviteForm.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分配角色</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {roles.map((role) => {
                        const checked = field.value.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                field.onChange(
                                  value === true
                                    ? [...field.value, role.id]
                                    : field.value.filter((id) => id !== role.id),
                                );
                              }}
                            />
                            <span className="truncate">{role.name}</span>
                            <Badge variant="outline" className="ml-auto">
                              {role.code}
                            </Badge>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  发送邀请
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>编辑用户 · {editUser?.name ?? ""}</DialogTitle>
            <DialogDescription>修改成员的基本信息、状态与角色分配。</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属租户</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>状态</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABEL[status]}
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
                control={editForm.control}
                name="mfaEnabled"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-xs font-medium">强制多因素认证</p>
                      <p className="text-muted-foreground text-2xs">开启后该成员必须使用 MFA 登录。</p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
              <FormField
                control={editForm.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色分配</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {roles.map((role) => {
                        const checked = field.value.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                field.onChange(
                                  value === true
                                    ? [...field.value, role.id]
                                    : field.value.filter((id) => id !== role.id),
                                );
                              }}
                            />
                            <span className="truncate">{role.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditUser(null)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  保存修改
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>批量导入成员</DialogTitle>
            <DialogDescription>粘贴 CSV 内容，首行可为表头（姓名,邮箱,租户,角色）。</DialogDescription>
          </DialogHeader>
          <Form {...importForm}>
            <form onSubmit={importForm.handleSubmit(handleImport)} className="space-y-4">
              <FormField
                control={importForm.control}
                name="csv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV 内容</FormLabel>
                    <FormControl>
                      <Textarea rows={8} placeholder={"姓名,邮箱,租户,角色\n张三,zhangsan@example.com,云启科技,开发者"} {...field} />
                    </FormControl>
                    <FormDescription>
                      预览：
                      <span className="num">
                        {" "}
                        {
                          field.value
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0)
                            .filter((line) => !/邮箱|email/i.test(line)).length
                        }
                      </span>{" "}
                      条记录待导入
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("已下载成员导入模板 members-template.csv（演示）")}
                >
                  下载模板
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" size="sm">
                    开始导入
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量分配角色</DialogTitle>
            <DialogDescription>为已选中的 {bulkAssignRows.length} 名成员追加角色，不会移除已有角色。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs font-medium">选择角色</p>
            <Select value={bulkAssignRole} onValueChange={setBulkAssignRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}（{role.code}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={confirmBulkAssign}>
              确认分配
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserDetailSheet
        user={detailUser}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null);
        }}
      />

      <ConfirmDialog
        open={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
        title={`禁用用户「${disableTarget?.name ?? ""}」？`}
        description="禁用后该成员的登录会话会立即失效，已签发的 API Key 仍可被单独撤销。"
        confirmLabel="确认禁用"
        variant="default"
        onConfirm={confirmDisable}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除用户「${deleteTarget?.name ?? ""}」？`}
        description="删除后该成员的账号、角色关联与个人密钥将被回收，操作不可撤销。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}

function labelOfSource(source: UserSource): string {
  switch (source) {
    case "sso-oidc":
      return "OIDC SSO";
    case "sso-saml":
      return "SAML SSO";
    case "ldap":
      return "LDAP";
    case "scim":
      return "SCIM 同步";
    case "invite":
      return "邮件邀请";
    case "local":
      return "本地账号";
    case "wecom":
      return "企业微信";
    case "feishu":
      return "飞书";
    case "dingtalk":
      return "钉钉";
    default:
      return source;
  }
}

interface UserDetailSheetProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
}

function UserDetailSheet({ user, onOpenChange }: UserDetailSheetProps) {
  const userRoles = React.useMemo(
    () => (user ? roles.filter((role) => user.roles.includes(role.id)) : []),
    [user],
  );
  const allowedIds = React.useMemo(
    () => new Set(userRoles.flatMap((role) => role.permissions)),
    [userRoles],
  );
  const allowedPermissions = React.useMemo(
    () => permissions.filter((permission) => allowedIds.has(permission.id)),
    [allowedIds],
  );
  const userKeys = React.useMemo(
    () => (user ? apiKeys.filter((key) => key.owner === user.name) : []),
    [user],
  );
  const userServiceAccounts = React.useMemo(
    () => (user ? serviceAccounts.filter((account) => account.owner === user.name) : []),
    [user],
  );
  const userAudit = React.useMemo(
    () =>
      user
        ? auditLogs
            .filter((log) => log.actorEmail === user.email || log.actorName === user.name)
            .slice(0, 12)
        : [],
    [user],
  );
  const devices = React.useMemo(() => (user ? buildDevices(user) : []), [user]);
  const ssoConfig = React.useMemo(() => {
    if (!user) return undefined;
    const domain = user.email.split("@")[1];
    return ssoConfigs.find((config) => config.domain === domain || config.domain === "cloudnova.cn");
  }, [user]);

  const permissionGroups = React.useMemo(
    () =>
      permissionModules
        .map((module) => ({
          module,
          items: allowedPermissions.filter((permission) => permission.module === module),
        }))
        .filter((group) => group.items.length > 0),
    [allowedPermissions],
  );

  const auditColumns = React.useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        id: "at",
        accessorKey: "at",
        header: "时间",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.at, "MM-dd HH:mm")}</span>,
      },
      {
        id: "actionLabel",
        accessorKey: "actionLabel",
        header: "操作",
        cell: ({ row }) => <span className="text-xs">{row.original.actionLabel}</span>,
      },
      {
        id: "resourceName",
        accessorKey: "resourceName",
        header: "对象",
        cell: ({ row }) => <span className="text-2xs">{row.original.resourceName}</span>,
      },
      {
        id: "riskLevel",
        accessorKey: "riskLevel",
        header: "风险",
        cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} />,
      },
      {
        id: "result",
        accessorKey: "result",
        header: "结果",
        cell: ({ row }) => <StatusBadge status={row.original.result} />,
      },
    ],
    [],
  );

  return (
    <DetailSheet
      open={user !== null}
      onOpenChange={onOpenChange}
      title={user?.name ?? "用户详情"}
      description={user ? `${user.email} · ${user.tenantName}` : undefined}
      className="sm:max-w-3xl"
      footer={
        user ? (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/users/${user.id}`}>打开完整详情页</Link>
            </Button>
            <Badge variant="outline">{user.title}</Badge>
          </div>
        ) : null
      }
    >
      {user ? (
        <Tabs defaultValue="basic">
          <TabsList className="flex-wrap">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="roles">角色权限</TabsTrigger>
            <TabsTrigger value="keys">API Key</TabsTrigger>
            <TabsTrigger value="devices">设备</TabsTrigger>
            <TabsTrigger value="audit">审计</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <DetailSection title="账号信息">
              <DetailGrid>
                <DetailRow label="用户 ID" mono>
                  {user.id}
                </DetailRow>
                <DetailRow label="状态">
                  <StatusBadge status={user.status} label={STATUS_LABEL[user.status]} />
                </DetailRow>
                <DetailRow label="手机号" mono>
                  {user.phone}
                </DetailRow>
                <DetailRow label="来源">{labelOfSource(user.source)}</DetailRow>
                <DetailRow label="租户">{user.tenantName}</DetailRow>
                <DetailRow label="组织 / 部门">
                  {user.orgName} / {user.department}
                </DetailRow>
                <DetailRow label="职位">{user.title}</DetailRow>
                <DetailRow label="MFA">
                  <StatusBadge status={user.mfaEnabled ? "enabled" : "disabled"} />
                </DetailRow>
                <DetailRow label="创建时间">{formatDate(user.createdAt, "yyyy-MM-dd HH:mm")}</DetailRow>
                <DetailRow label="最后登录">{formatRelativeTime(user.lastLoginAt)}</DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="身份源" description="依据邮箱域名匹配到的 SSO / 目录配置">
              {ssoConfig ? (
                <DetailGrid>
                  <DetailRow label="身份源">{ssoConfig.name}</DetailRow>
                  <DetailRow label="协议">{SSO_PROVIDER_LABEL[ssoConfig.provider]}</DetailRow>
                  <DetailRow label="域名">{ssoConfig.domain}</DetailRow>
                  <DetailRow label="状态">
                    <StatusBadge status={ssoConfig.status} />
                  </DetailRow>
                  <DetailRow label="SCIM 同步">{ssoConfig.scimEnabled ? "已启用" : "未启用"}</DetailRow>
                  <DetailRow label="JIT 开户">{ssoConfig.jitProvisioning ? "已启用" : "未启用"}</DetailRow>
                </DetailGrid>
              ) : (
                <p className="text-muted-foreground text-2xs">未匹配到身份源，该成员可能由本地账号或邮件邀请创建。</p>
              )}
            </DetailSection>

            <DetailSection title="关联服务账号">
              {userServiceAccounts.length > 0 ? (
                <div className="space-y-2">
                  {userServiceAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{account.name}</p>
                        <p className="text-muted-foreground font-mono text-2xs">{account.scopes.join(" · ")}</p>
                      </div>
                      <StatusBadge status={account.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-2xs">该成员名下暂无服务账号。</p>
              )}
            </DetailSection>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="space-y-2">
              {userRoles.map((role) => (
                <div key={role.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{role.name}</span>
                    <Badge variant="outline">{role.code}</Badge>
                    {role.isSystem ? <Badge variant="secondary">系统角色</Badge> : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-2xs">{role.description}</p>
                </div>
              ))}
            </div>
            <DetailSection title="允许的权限" description={`共 ${allowedPermissions.length} 项`}>
              <div className="space-y-3">
                {permissionGroups.map((group) => (
                  <div key={group.module} className="space-y-1.5">
                    <p className="text-muted-foreground text-2xs font-medium">
                      {MODULE_LABEL[group.module] ?? group.module}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((permission) => (
                        <Badge key={permission.id} variant="success">
                          {permission.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          </TabsContent>

          <TabsContent value="keys">
            {userKeys.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>前缀</TableHead>
                    <TableHead>范围</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后使用</TableHead>
                    <TableHead>过期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="text-xs">{key.name}</TableCell>
                      <TableCell className="font-mono text-2xs">{key.prefix}</TableCell>
                      <TableCell className="text-2xs">{key.scopes.join(" · ")}</TableCell>
                      <TableCell>
                        <StatusBadge status={key.status} />
                      </TableCell>
                      <TableCell className="text-2xs">{formatRelativeTime(key.lastUsedAt)}</TableCell>
                      <TableCell className="num text-2xs">{formatDate(key.expiresAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-2xs">该成员暂未创建 API Key。</p>
            )}
          </TabsContent>

          <TabsContent value="devices">
            {devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>设备</TableHead>
                    <TableHead>系统</TableHead>
                    <TableHead>地点</TableHead>
                    <TableHead>最后活跃</TableHead>
                    <TableHead>可信状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="text-xs">{device.name}</TableCell>
                      <TableCell className="text-2xs">{device.os}</TableCell>
                      <TableCell className="text-2xs">{device.location}</TableCell>
                      <TableCell className="text-2xs">{formatRelativeTime(device.lastActiveAt)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={device.trusted ? "verified" : "unverified"}
                          label={device.trusted ? "可信" : "未验证"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-2xs">该成员暂无登录设备记录。</p>
            )}
          </TabsContent>

          <TabsContent value="audit">
            <DataTable
              columns={auditColumns}
              data={userAudit}
              getRowId={(row) => row.id}
              searchPlaceholder="搜索审计记录…"
              pageSize={6}
              emptyTitle="暂无审计记录"
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </DetailSheet>
  );
}
