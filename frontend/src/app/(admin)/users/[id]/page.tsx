"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, KeyRound, LogIn, Monitor, Plus, TriangleAlert, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { StatusBadge, RiskBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { DetailGrid, DetailRow } from "@/components/common/detail-sheet";
import { apiKeys, getUserById } from "@/lib/mock-data/users";
import { permissionModules, permissions, roles } from "@/lib/mock-data/roles";
import { auditLogs } from "@/lib/mock-data/audit";
import { createRandom } from "@/lib/mock-data/seed";
import type { ApiKeyRecord, AuditLog, User, UserStatus } from "@/types";
import { formatDate, formatNumber, formatRelativeTime } from "@/lib/utils";

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "正常",
  invited: "已邀请",
  pending: "待激活",
  disabled: "已禁用",
  locked: "已锁定",
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

function hashId(value: string): number {
  let seed = 0;
  for (let index = 0; index < value.length; index += 1) {
    seed = (seed * 31 + value.charCodeAt(index)) % 2147483647;
  }
  return seed;
}

function buildDevices(user: User): DerivedDevice[] {
  const count = Math.max(0, user.deviceCount);
  const random = createRandom(hashId(user.id) + 97);
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

const keyFormSchema = z.object({
  name: z.string().min(2, "名称至少 2 个字符").max(40, "名称过长"),
  scopes: z.array(z.string()).min(1, "请至少选择一个权限范围"),
  expiresInDays: z.coerce.number().int().min(1, "有效期至少 1 天").max(730, "有效期最长 730 天"),
});

type KeyFormValues = z.infer<typeof keyFormSchema>;

const SCOPE_OPTIONS = [
  { value: "model:invoke", label: "model:invoke · 模型调用" },
  { value: "tool:invoke", label: "tool:invoke · 工具调用" },
  { value: "project:read", label: "project:read · 项目只读" },
  { value: "project:write", label: "project:write · 项目编辑" },
  { value: "usage:read", label: "usage:read · 用量只读" },
  { value: "audit:read", label: "audit:read · 审计只读" },
];

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const user = React.useMemo(() => getUserById(params.id), [params.id]);

  const [keyList, setKeyList] = React.useState<ApiKeyRecord[]>([]);
  const [createKeyOpen, setCreateKeyOpen] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKeyRecord | null>(null);

  React.useEffect(() => {
    setKeyList(user ? apiKeys.filter((key) => key.owner === user.name) : []);
  }, [user]);

  const keyForm = useForm<KeyFormValues>({
    resolver: zodResolver(keyFormSchema),
    defaultValues: { name: "", scopes: ["model:invoke"], expiresInDays: 90 },
  });

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

  const deniedPermissions = React.useMemo(
    () => permissions.filter((permission) => !allowedIds.has(permission.id)),
    [allowedIds],
  );

  const userAudit = React.useMemo(
    () =>
      user
        ? auditLogs
            .filter((log) => log.actorEmail === user.email || log.actorName === user.name)
            .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        : [],
    [user],
  );

  const riskOperations = React.useMemo(
    () =>
      userAudit.filter((log) => log.riskLevel === "high" || log.riskLevel === "critical").length,
    [userAudit],
  );

  const loginCount = React.useMemo(() => {
    if (!user) return 0;
    return 30 + (hashId(user.id) % 420);
  }, [user]);

  const devices = React.useMemo(() => (user ? buildDevices(user) : []), [user]);

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
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.actionLabel}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.action}</p>
          </div>
        ),
      },
      {
        id: "resourceName",
        accessorKey: "resourceName",
        header: "对象",
        cell: ({ row }) => <span className="text-2xs">{row.original.resourceName}</span>,
      },
      {
        id: "ip",
        accessorKey: "ip",
        header: "来源 IP",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.ip}</span>,
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

  const handleCreateKey = (values: KeyFormValues) => {
    if (!user) return;
    const suffix = String(hashId(`${user.id}-${values.name}-${keyList.length}`) % 1_000_000).padStart(6, "0");
    const newKey: ApiKeyRecord = {
      id: `key-${user.id}-${keyList.length + 1}`,
      name: values.name,
      prefix: `ak_live_${suffix.slice(0, 6)}`,
      owner: user.name,
      tenantName: user.tenantName,
      scopes: values.scopes,
      status: "active",
      rateLimit: "240 rpm",
      callCount: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + values.expiresInDays * 86_400_000).toISOString(),
    };
    setKeyList((list) => [newKey, ...list]);
    toast.success(`已创建 API Key「${values.name}」，明文仅显示一次`);
    setCreateKeyOpen(false);
    keyForm.reset();
  };

  const confirmRevoke = () => {
    if (!revokeTarget) return;
    setKeyList((list) =>
      list.map((key) => (key.id === revokeTarget.id ? { ...key, status: "revoked" } : key)),
    );
    toast.success(`已撤销 API Key「${revokeTarget.name}」`);
    setRevokeTarget(null);
  };

  if (!user) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" asChild>
            <Link href="/users">
              <ArrowLeft />
              返回用户列表
            </Link>
          </Button>
        </div>
        <Card className="py-10">
          <CardContent>
            <EmptyState
              icon={UserRoundX}
              title="未找到该用户"
              description="用户可能已被删除，或链接不正确。"
              action={
                <Button size="sm" asChild>
                  <Link href="/users">返回用户列表</Link>
                </Button>
              }
              className="border-0"
            />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="xs" asChild>
          <Link href="/users">
            <ArrowLeft />
            返回列表
          </Link>
        </Button>
      </div>

      <PageHeader
        title={user.name}
        description={`${user.email} · ${user.tenantName} · ${user.orgName} / ${user.department}`}
        badges={
          <>
            <StatusBadge status={user.status} label={STATUS_LABEL[user.status]} />
            {user.roleNames.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
            {user.mfaEnabled ? <Badge variant="success">MFA 已开启</Badge> : <Badge variant="warning">MFA 未开启</Badge>}
          </>
        }
        actions={
          <Button size="sm" onClick={() => toast.success(`已向「${user.name}」发送密码重置邮件（演示）`)}>
            重置密码
          </Button>
        }
      />

      <StatCardGrid className="xl:grid-cols-4 2xl:grid-cols-4">
        <StatCard label="API Key 数" value={keyList.length} icon={KeyRound} hint={`账号统计 ${user.apiKeyCount} 个`} />
        <StatCard label="登录设备" value={devices.length} icon={Monitor} tone="info" />
        <StatCard label="登录次数（近 90 天）" value={loginCount} icon={LogIn} valueFormatter={formatNumber} delta={4.5} />
        <StatCard
          label="高风险操作"
          value={riskOperations}
          icon={TriangleAlert}
          tone={riskOperations > 0 ? "danger" : "success"}
          hint="来自审计日志的高/严重风险记录"
        />
      </StatCardGrid>

      <Tabs defaultValue="basic">
        <TabsList className="flex-wrap">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="roles">角色与权限</TabsTrigger>
          <TabsTrigger value="keys">API Key</TabsTrigger>
          <TabsTrigger value="devices">设备</TabsTrigger>
          <TabsTrigger value="audit">审计</TabsTrigger>
          <TabsTrigger value="timeline">操作记录时间线</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3">
          <Card className="gap-0 py-4">
            <CardHeader className="pb-2">
              <CardTitle>账号档案</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailGrid columns={3}>
                <DetailRow label="用户 ID" mono>
                  {user.id}
                </DetailRow>
                <DetailRow label="邮箱">{user.email}</DetailRow>
                <DetailRow label="手机号" mono>
                  {user.phone}
                </DetailRow>
                <DetailRow label="租户">{user.tenantName}</DetailRow>
                <DetailRow label="组织">{user.orgName}</DetailRow>
                <DetailRow label="部门">{user.department}</DetailRow>
                <DetailRow label="职位">{user.title}</DetailRow>
                <DetailRow label="来源">{user.source}</DetailRow>
                <DetailRow label="MFA">{user.mfaEnabled ? "已开启" : "未开启"}</DetailRow>
                <DetailRow label="创建时间">{formatDate(user.createdAt, "yyyy-MM-dd HH:mm")}</DetailRow>
                <DetailRow label="最后登录">{formatRelativeTime(user.lastLoginAt)}</DetailRow>
                <DetailRow label="角色数">
                  <span className="num">{userRoles.length}</span>
                </DetailRow>
              </DetailGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {userRoles.map((role) => (
              <Card key={role.id} className="gap-0 py-4">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    {role.name}
                    <Badge variant="outline">{role.code}</Badge>
                    {role.isSystem ? <Badge variant="secondary">系统角色</Badge> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground text-2xs">{role.description}</p>
                  <div className="flex items-center gap-3 text-2xs">
                    <span className="num">等级 {role.level}</span>
                    <span className="num">{role.permissions.length} 项权限</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="gap-0 py-4">
            <CardHeader className="pb-2">
              <CardTitle>权限清单</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {permissionModules.map((module) => {
                const allowed = allowedPermissions.filter((permission) => permission.module === module);
                const denied = deniedPermissions.filter((permission) => permission.module === module);
                if (allowed.length === 0 && denied.length === 0) return null;
                return (
                  <div key={module} className="space-y-1.5">
                    <p className="text-muted-foreground text-2xs font-medium">
                      {MODULE_LABEL[module] ?? module}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allowed.map((permission) => (
                        <Badge key={permission.id} variant="success">
                          允许 · {permission.name}
                        </Badge>
                      ))}
                      {denied.map((permission) => (
                        <Badge key={permission.id} variant="neutral">
                          拒绝 · {permission.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">
              共 {keyList.length} 个 API Key，明文仅在创建时展示一次，此处仅显示前缀。
            </p>
            <Button size="sm" onClick={() => setCreateKeyOpen(true)}>
              <Plus />
              新建 API Key
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>前缀</TableHead>
                <TableHead>范围</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后使用</TableHead>
                <TableHead>过期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keyList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground text-center text-xs">
                    该用户暂无 API Key
                  </TableCell>
                </TableRow>
              ) : (
                keyList.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="text-xs">{key.name}</TableCell>
                    <TableCell className="font-mono text-2xs">{key.prefix}</TableCell>
                    <TableCell className="text-2xs">{key.scopes.join(" · ")}</TableCell>
                    <TableCell>
                      <StatusBadge status={key.status} />
                    </TableCell>
                    <TableCell className="text-2xs">{formatRelativeTime(key.lastUsedAt)}</TableCell>
                    <TableCell className="num text-2xs">{formatDate(key.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-destructive"
                        disabled={key.status === "revoked"}
                        onClick={() => setRevokeTarget(key)}
                      >
                        撤销
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="devices" className="space-y-3">
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
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center text-xs">
                    暂无登录设备记录
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="audit">
          <DataTable
            columns={auditColumns}
            data={userAudit}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索审计记录…"
            pageSize={8}
            emptyTitle="暂无审计记录"
          />
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="gap-0 py-4">
            <CardHeader className="pb-2">
              <CardTitle>操作记录时间线</CardTitle>
            </CardHeader>
            <CardContent>
              {userAudit.length === 0 ? (
                <p className="text-muted-foreground text-2xs">暂无操作记录。</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {userAudit.slice(0, 12).map((log) => (
                    <li key={log.id} className="relative">
                      <span className="bg-primary absolute -left-[1.30rem] top-1.5 size-2 rounded-full" />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium">{log.actionLabel}</p>
                        <RiskBadge risk={log.riskLevel} />
                        <span className="text-muted-foreground num text-2xs">
                          {formatDate(log.at, "yyyy-MM-dd HH:mm")}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-2xs">
                        {log.resourceName} · {log.ip} · {log.location}
                      </p>
                      <p className="text-muted-foreground text-2xs">{log.detail}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建 API Key</DialogTitle>
            <DialogDescription>创建后明文仅展示一次，请及时保存到密钥管理系统。</DialogDescription>
          </DialogHeader>
          <Form {...keyForm}>
            <form onSubmit={keyForm.handleSubmit(handleCreateKey)} className="space-y-4">
              <FormField
                control={keyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：prod-agent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={keyForm.control}
                name="expiresInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>有效期（天）</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={730} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={keyForm.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>权限范围</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SCOPE_OPTIONS.map((option) => {
                        const checked = field.value.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-2xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                field.onChange(
                                  value === true
                                    ? [...field.value, option.value]
                                    : field.value.filter((item) => item !== option.value),
                                );
                              }}
                            />
                            <span className="truncate">{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormDescription>遵循最小权限原则，仅勾选业务实际需要的范围。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateKeyOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={`撤销 API Key「${revokeTarget?.name ?? ""}」？`}
        description="撤销后使用该 Key 的调用将立即失败，操作不可恢复。"
        confirmLabel="确认撤销"
        onConfirm={confirmRevoke}
      />
    </PageContainer>
  );
}
