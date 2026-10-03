"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, KeyRound, Plus, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { apiKeys as apiKeySeed, serviceAccounts as serviceAccountSeed, ssoConfigs as ssoSeed, users } from "@/lib/mock-data/users";
import { tenants } from "@/lib/mock-data/tenants";
import type { ApiKeyRecord, ServiceAccount, SsoConfig } from "@/types";
import { formatCompact, formatDate, formatNumber, formatRelativeTime } from "@/lib/utils";

const NOW = Date.parse("2026-09-17T09:30:00+08:00");
const THIRTY_DAYS = 30 * 86_400_000;

const SSO_PROVIDER_LABEL: Record<SsoConfig["provider"], string> = {
  oidc: "OIDC",
  saml: "SAML 2.0",
  ldap: "LDAP",
  wecom: "企业微信",
  feishu: "飞书",
  dingtalk: "钉钉",
};

const PROVIDER_OPTIONS = (Object.keys(SSO_PROVIDER_LABEL) as SsoConfig["provider"][]).map((value) => ({
  value,
  label: SSO_PROVIDER_LABEL[value],
}));

const SCOPE_OPTIONS = [
  { value: "model:invoke", label: "model:invoke" },
  { value: "tool:invoke", label: "tool:invoke" },
  { value: "project:read", label: "project:read" },
  { value: "usage:read", label: "usage:read" },
  { value: "audit:read", label: "audit:read" },
  { value: "billing:read", label: "billing:read" },
  { value: "sandbox:execute", label: "sandbox:execute" },
];

const RATE_LIMIT_OPTIONS = ["60 rpm", "240 rpm", "1200 rpm", "6000 rpm"];

const configSchema = z.object({
  name: z.string().min(2, "名称至少 2 个字符").max(40, "名称过长"),
  provider: z.enum(["oidc", "saml", "ldap", "wecom", "feishu", "dingtalk"]),
  domain: z.string().min(3, "请输入域名").max(80, "域名过长"),
  issuer: z.string().min(1, "请输入 Issuer"),
  clientId: z.string().min(1, "请输入 Client ID"),
  metadataUrl: z.string(),
  scimEnabled: z.boolean(),
  jitProvisioning: z.boolean(),
  enforced: z.boolean(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

const accountSchema = z.object({
  name: z
    .string()
    .min(2, "名称至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "仅允许小写字母、数字与连字符"),
  type: z.enum(["service-account", "machine-identity"]),
  tenantName: z.string().min(1, "请选择租户"),
  owner: z.string().min(1, "请选择负责人"),
  scopes: z.array(z.string()).min(1, "请至少选择一个范围"),
  expiresInDays: z.coerce.number().int().min(1, "有效期至少 1 天").max(730, "有效期最长 730 天"),
});

type AccountFormValues = z.infer<typeof accountSchema>;

const keySchema = z.object({
  name: z.string().min(2, "名称至少 2 个字符").max(40, "名称过长"),
  owner: z.string().min(1, "请选择归属人"),
  scopes: z.array(z.string()).min(1, "请至少选择一个范围"),
  rateLimit: z.string().min(1, "请选择限流策略"),
  expiresInDays: z.coerce.number().int().min(1, "有效期至少 1 天").max(730, "有效期最长 730 天"),
});

type KeyFormValues = z.infer<typeof keySchema>;

function generateSecret(): string {
  const chars = "0123456789abcdef";
  let value = "";
  for (let index = 0; index < 40; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)] ?? "0";
  }
  return `ak_live_${value}`;
}

export default function SsoPage() {
  const [configs, setConfigs] = React.useState<SsoConfig[]>(ssoSeed);
  const [accounts, setAccounts] = React.useState<ServiceAccount[]>(serviceAccountSeed);
  const [keys, setKeys] = React.useState<ApiKeyRecord[]>(apiKeySeed);

  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] = React.useState<SsoConfig | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = React.useState(false);
  const [deleteAccountTarget, setDeleteAccountTarget] = React.useState<ServiceAccount | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = React.useState(false);
  const [createdSecret, setCreatedSecret] = React.useState<string | null>(null);
  const [revokeKeyTarget, setRevokeKeyTarget] = React.useState<ApiKeyRecord | null>(null);
  const [syncingId, setSyncingId] = React.useState<string | null>(null);

  const configForm = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: "",
      provider: "oidc",
      domain: "",
      issuer: "",
      clientId: "",
      metadataUrl: "",
      scimEnabled: true,
      jitProvisioning: true,
      enforced: false,
    },
  });

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "service-account",
      tenantName: tenants[0]?.name ?? "",
      owner: users[0]?.name ?? "",
      scopes: ["model:invoke"],
      expiresInDays: 180,
    },
  });

  const keyForm = useForm<KeyFormValues>({
    resolver: zodResolver(keySchema),
    defaultValues: {
      name: "",
      owner: users[0]?.name ?? "",
      scopes: ["model:invoke"],
      rateLimit: "240 rpm",
      expiresInDays: 180,
    },
  });

  React.useEffect(() => {
    if (editingConfig) {
      configForm.reset({
        name: editingConfig.name,
        provider: editingConfig.provider,
        domain: editingConfig.domain,
        issuer: editingConfig.issuer,
        clientId: editingConfig.clientId,
        metadataUrl: editingConfig.metadataUrl,
        scimEnabled: editingConfig.scimEnabled,
        jitProvisioning: editingConfig.jitProvisioning,
        enforced: editingConfig.enforced,
      });
    } else {
      configForm.reset({
        name: "",
        provider: "oidc",
        domain: "",
        issuer: "",
        clientId: "",
        metadataUrl: "",
        scimEnabled: true,
        jitProvisioning: true,
        enforced: false,
      });
    }
  }, [editingConfig, configForm]);

  const stats = React.useMemo(() => {
    const enabled = configs.filter((config) => config.status === "enabled").length;
    const syncedUsers = configs.reduce((total, config) => total + config.syncedUsers, 0);
    const failed = configs.filter((config) => config.syncStatus === "failed").length;
    const expiringKeys = keys.filter((key) => {
      if (key.status === "revoked" || key.status === "expired") return false;
      const expires = Date.parse(key.expiresAt);
      return expires > NOW && expires - NOW <= THIRTY_DAYS;
    }).length;
    return { enabled, syncedUsers, failed, expiringKeys };
  }, [configs, keys]);

  const scimConfigs = React.useMemo(
    () => configs.filter((config) => config.scimEnabled),
    [configs],
  );

  const toggleConfigFlag = (
    config: SsoConfig,
    field: "scimEnabled" | "jitProvisioning" | "enforced",
    labelText: string,
  ) => {
    setConfigs((list) =>
      list.map((item) => (item.id === config.id ? { ...item, [field]: !item[field] } : item)),
    );
    toast.success(`${config.name} 已${config[field] ? "关闭" : "开启"}${labelText}`);
  };

  const handleConfigSubmit = (values: ConfigFormValues) => {
    if (editingConfig) {
      setConfigs((list) =>
        list.map((config) => (config.id === editingConfig.id ? { ...config, ...values } : config)),
      );
      toast.success(`已保存「${values.name}」的身份源配置`);
      setEditingConfig(null);
      setConfigDialogOpen(false);
      return;
    }

    const newConfig: SsoConfig = {
      id: `sso-${String(configs.length + 1).padStart(2, "0")}`,
      ...values,
      status: "configuring",
      syncedUsers: 0,
      lastSyncAt: new Date().toISOString(),
      syncStatus: "idle",
    };
    setConfigs((list) => [newConfig, ...list]);
    toast.success(`已创建身份源「${values.name}」`);
    setConfigDialogOpen(false);
    configForm.reset();
  };

  const handleAccountSubmit = (values: AccountFormValues) => {
    const newAccount: ServiceAccount = {
      id: `sa-${String(accounts.length + 1).padStart(2, "0")}`,
      name: values.name,
      type: values.type,
      tenantName: values.tenantName,
      owner: values.owner,
      scopes: values.scopes,
      status: "active",
      keyCount: 0,
      lastUsedAt: new Date().toISOString(),
      expiresAt: new Date(NOW + values.expiresInDays * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    setAccounts((list) => [newAccount, ...list]);
    toast.success(`已创建服务账号「${values.name}」`);
    setAccountDialogOpen(false);
    accountForm.reset();
  };

  const handleKeySubmit = (values: KeyFormValues) => {
    const secret = generateSecret();
    const newKey: ApiKeyRecord = {
      id: `key-${String(keys.length + 1).padStart(2, "0")}`,
      name: values.name,
      prefix: secret.slice(0, 14),
      owner: values.owner,
      tenantName: users.find((user) => user.name === values.owner)?.tenantName ?? "—",
      scopes: values.scopes,
      status: "active",
      rateLimit: values.rateLimit,
      callCount: 0,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      expiresAt: new Date(NOW + values.expiresInDays * 86_400_000).toISOString(),
    };
    setKeys((list) => [newKey, ...list]);
    setCreatedSecret(secret);
    toast.success(`已创建 API Key「${values.name}」`);
  };

  const confirmRevokeKey = () => {
    if (!revokeKeyTarget) return;
    setKeys((list) =>
      list.map((key) => (key.id === revokeKeyTarget.id ? { ...key, status: "revoked" } : key)),
    );
    toast.success(`已撤销 API Key「${revokeKeyTarget.name}」`);
    setRevokeKeyTarget(null);
  };

  const confirmDeleteAccount = () => {
    if (!deleteAccountTarget) return;
    setAccounts((list) => list.filter((account) => account.id !== deleteAccountTarget.id));
    toast.success(`已删除服务账号「${deleteAccountTarget.name}」`);
    setDeleteAccountTarget(null);
  };

  const syncNow = (config: SsoConfig) => {
    setSyncingId(config.id);
    window.setTimeout(() => {
      setConfigs((list) =>
        list.map((item) =>
          item.id === config.id
            ? { ...item, syncStatus: "success", lastSyncAt: new Date().toISOString() }
            : item,
        ),
      );
      setSyncingId(null);
      toast.success(`已触发「${config.name}」的 SCIM 同步`);
    }, 700);
  };

  const scimColumns = React.useMemo<ColumnDef<SsoConfig, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "目录",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.domain}</p>
          </div>
        ),
      },
      {
        id: "syncStatus",
        accessorKey: "syncStatus",
        header: "同步状态",
        cell: ({ row }) => <StatusBadge status={row.original.syncStatus} />,
      },
      {
        id: "syncedUsers",
        accessorKey: "syncedUsers",
        header: "同步用户",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.syncedUsers)}</span>,
      },
      {
        id: "lastSyncAt",
        accessorKey: "lastSyncAt",
        header: "最后同步",
        cell: ({ row }) => <span className="text-2xs">{formatRelativeTime(row.original.lastSyncAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onEdit={() => {
              setEditingConfig(row.original);
              setConfigDialogOpen(true);
            }}
            extraItems={[
              {
                label: syncingId === row.original.id ? "同步中…" : "立即同步",
                onSelect: () => syncNow(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [syncingId],
  );

  const accountColumns = React.useMemo<ColumnDef<ServiceAccount, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "服务账号",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">
              {row.original.type === "service-account" ? "服务账号" : "机器身份"}
            </p>
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
        id: "owner",
        accessorKey: "owner",
        header: "负责人",
        cell: ({ row }) => <span className="text-xs">{row.original.owner}</span>,
      },
      {
        id: "scopes",
        header: "范围",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.scopes.map((scope) => (
              <Badge key={scope} variant="outline">
                {scope}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "keyCount",
        accessorKey: "keyCount",
        header: "密钥数",
        cell: ({ row }) => <span className="num text-xs">{row.original.keyCount}</span>,
      },
      {
        id: "lastUsedAt",
        accessorKey: "lastUsedAt",
        header: "最后使用",
        cell: ({ row }) => <span className="text-2xs">{formatRelativeTime(row.original.lastUsedAt)}</span>,
      },
      {
        id: "expiresAt",
        accessorKey: "expiresAt",
        header: "过期",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.expiresAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onToggleStatus={() => {
              const next = row.original.status === "disabled" ? "active" : "disabled";
              setAccounts((list) =>
                list.map((account) =>
                  account.id === row.original.id ? { ...account, status: next } : account,
                ),
              );
              toast.success(next === "disabled" ? "已禁用服务账号" : "已启用服务账号");
            }}
            statusActive={row.original.status === "active"}
            onDelete={() => setDeleteAccountTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  const keyColumns = React.useMemo<ColumnDef<ApiKeyRecord, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "名称",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.name}</span>,
      },
      {
        id: "prefix",
        accessorKey: "prefix",
        header: "前缀",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.prefix}…</span>,
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "归属",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.owner}</p>
            <p className="text-muted-foreground text-2xs">{row.original.tenantName}</p>
          </div>
        ),
      },
      {
        id: "scopes",
        header: "范围",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.scopes.map((scope) => (
              <Badge key={scope} variant="outline">
                {scope}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "rateLimit",
        accessorKey: "rateLimit",
        header: "限流",
        cell: ({ row }) => <span className="num text-2xs">{row.original.rateLimit}</span>,
      },
      {
        id: "callCount",
        accessorKey: "callCount",
        header: "调用量",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.callCount)}</span>,
      },
      {
        id: "expiresAt",
        accessorKey: "expiresAt",
        header: "过期",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.expiresAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            statusActive={row.original.status === "active"}
            extraItems={[
              {
                label: "轮换密钥",
                onSelect: () => toast.success(`已发起「${row.original.name}」的密钥轮换`),
              },
            ]}
            onDelete={() => setRevokeKeyTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="身份源与 SSO"
        description="统一管理 OIDC / SAML / LDAP 及企业 IM 身份源、SCIM 目录同步、服务账号与 API Key。"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingConfig(null);
              setConfigDialogOpen(true);
            }}
          >
            <Plus />
            新增身份源
          </Button>
        }
        badges={<Badge variant="secondary">Secrets 仅显示前缀</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-4 2xl:grid-cols-4">
        <StatCard label="已启用身份源" value={stats.enabled} icon={ShieldCheck} tone="success" hint={`共 ${configs.length} 个配置`} />
        <StatCard label="同步用户数" value={stats.syncedUsers} icon={Users} valueFormatter={formatNumber} delta={2.1} />
        <StatCard label="同步失败" value={stats.failed} icon={AlertTriangle} tone={stats.failed > 0 ? "danger" : "success"} hint="需要检查凭据或网络" />
        <StatCard label="即将到期密钥" value={stats.expiringKeys} icon={KeyRound} tone="warning" hint="30 天内到期" />
      </StatCardGrid>

      <Tabs defaultValue="sources">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sources">身份源</TabsTrigger>
          <TabsTrigger value="scim">SCIM 同步状态</TabsTrigger>
          <TabsTrigger value="accounts">服务账号</TabsTrigger>
          <TabsTrigger value="keys">API Key</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {configs.map((config) => (
              <div key={config.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{config.name}</p>
                      <Badge variant="secondary">{SSO_PROVIDER_LABEL[config.provider]}</Badge>
                      <StatusBadge status={config.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 font-mono text-2xs">{config.domain}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setEditingConfig(config);
                      setConfigDialogOpen(true);
                    }}
                  >
                    配置
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["scimEnabled", "SCIM"],
                      ["jitProvisioning", "JIT 开户"],
                      ["enforced", "强制 SSO"],
                    ] as const
                  ).map(([field, labelText]) => (
                    <div key={field} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5">
                      <span className="text-2xs">{labelText}</span>
                      <Switch
                        checked={config[field]}
                        onCheckedChange={() => toggleConfigFlag(config, field, labelText)}
                      />
                    </div>
                  ))}
                </div>

                <div className="text-muted-foreground mt-3 flex items-center justify-between text-2xs">
                  <span className="num">同步用户 {formatNumber(config.syncedUsers)}</span>
                  <span>最后同步 {formatRelativeTime(config.lastSyncAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scim">
          <DataTable
            columns={scimColumns}
            data={scimConfigs}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索目录或域名…"
            pageSize={8}
            emptyTitle="没有启用 SCIM 的身份源"
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">服务账号与机器身份用于自动化流程，密钥独立于用户账号。</p>
            <Button size="sm" onClick={() => setAccountDialogOpen(true)}>
              <Plus />
              新建服务账号
            </Button>
          </div>
          <DataTable
            columns={accountColumns}
            data={accounts}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索服务账号、租户、负责人…"
            pageSize={8}
            emptyTitle="暂无服务账号"
          />
        </TabsContent>

        <TabsContent value="keys" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">Secret 明文仅在创建时展示一次，列表仅保留前缀。</p>
            <Button
              size="sm"
              onClick={() => {
                setCreatedSecret(null);
                keyForm.reset();
                setKeyDialogOpen(true);
              }}
            >
              <Plus />
              创建 API Key
            </Button>
          </div>
          <DataTable
            columns={keyColumns}
            data={keys}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索名称、归属、前缀…"
            pageSize={8}
            emptyTitle="暂无 API Key"
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={configDialogOpen}
        onOpenChange={(open) => {
          setConfigDialogOpen(open);
          if (!open) setEditingConfig(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingConfig ? `编辑身份源 · ${editingConfig.name}` : "新增身份源"}</DialogTitle>
            <DialogDescription>配置仅保存在本地状态，用于演示身份源的接入与切换流程。</DialogDescription>
          </DialogHeader>
          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(handleConfigSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={configForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>显示名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：云启科技 OIDC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={configForm.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>协议</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDER_OPTIONS.map((option) => (
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
                <FormField
                  control={configForm.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>域名</FormLabel>
                      <FormControl>
                        <Input placeholder="example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={configForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input placeholder="agent-platform-admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={configForm.control}
                name="issuer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuer</FormLabel>
                    <FormControl>
                      <Input placeholder="https://sso.example.com/realms/agent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={configForm.control}
                name="metadataUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metadata URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://sso.example.com/.well-known/openid-configuration" {...field} />
                    </FormControl>
                    <FormDescription>留空或填写 - 表示不使用元数据自动发现。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["scimEnabled", "SCIM 同步"],
                    ["jitProvisioning", "JIT 开户"],
                    ["enforced", "强制 SSO"],
                  ] as const
                ).map(([field, labelText]) => (
                  <FormField
                    key={field}
                    control={configForm.control}
                    name={field}
                    render={({ field: formField }) => (
                      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <span className="text-2xs">{labelText}</span>
                        <Switch checked={formField.value} onCheckedChange={formField.onChange} />
                      </div>
                    )}
                  />
                ))}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfigDialogOpen(false);
                    setEditingConfig(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingConfig ? "保存配置" : "创建身份源"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>新建服务账号</DialogTitle>
            <DialogDescription>服务账号用于 CI/CD、数据管道等自动化场景，遵循最小权限原则。</DialogDescription>
          </DialogHeader>
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={accountForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>账号名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：ci-deploy-bot" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={accountForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="service-account">服务账号</SelectItem>
                          <SelectItem value="machine-identity">机器身份</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={accountForm.control}
                  name="tenantName"
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
                            <SelectItem key={tenant.id} value={tenant.name}>
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
                  control={accountForm.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>负责人</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.slice(0, 12).map((user) => (
                            <SelectItem key={user.id} value={user.name}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={accountForm.control}
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
              </div>
              <FormField
                control={accountForm.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>权限范围</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SCOPE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-2xs"
                        >
                          <Checkbox
                            checked={field.value.includes(option.value)}
                            onCheckedChange={(value) => {
                              field.onChange(
                                value === true
                                  ? [...field.value, option.value]
                                  : field.value.filter((item) => item !== option.value),
                              );
                            }}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setAccountDialogOpen(false)}>
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

      <Dialog
        open={keyDialogOpen}
        onOpenChange={(open) => {
          setKeyDialogOpen(open);
          if (!open) setCreatedSecret(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>创建 API Key</DialogTitle>
            <DialogDescription>创建后明文仅展示一次，请立即复制到密钥管理系统。</DialogDescription>
          </DialogHeader>
          {createdSecret ? (
            <div className="space-y-4">
              <Alert variant="warning">
                <AlertTriangle />
                <AlertTitle>请立即复制，关闭后无法再次查看</AlertTitle>
                <AlertDescription className="font-mono break-all">{createdSecret}</AlertDescription>
              </Alert>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-muted-foreground text-2xs">前缀（用于后续识别）</span>
                <span className="font-mono text-2xs">{createdSecret.slice(0, 14)}…</span>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success("已复制明文到剪贴板（演示）")}
                >
                  复制明文
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setKeyDialogOpen(false);
                    setCreatedSecret(null);
                    keyForm.reset();
                  }}
                >
                  我已保存
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...keyForm}>
              <form onSubmit={keyForm.handleSubmit(handleKeySubmit)} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={keyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key 名称</FormLabel>
                        <FormControl>
                          <Input placeholder="例如：prod-agent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={keyForm.control}
                    name="owner"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>归属人</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.slice(0, 12).map((user) => (
                              <SelectItem key={user.id} value={user.name}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={keyForm.control}
                    name="rateLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>限流</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RATE_LIMIT_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                </div>
                <FormField
                  control={keyForm.control}
                  name="scopes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>权限范围</FormLabel>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SCOPE_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-2xs"
                          >
                            <Checkbox
                              checked={field.value.includes(option.value)}
                              onCheckedChange={(value) => {
                                field.onChange(
                                  value === true
                                    ? [...field.value, option.value]
                                    : field.value.filter((item) => item !== option.value),
                                );
                              }}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" size="sm" onClick={() => setKeyDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit" size="sm">
                    创建
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeKeyTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeKeyTarget(null);
        }}
        title={`撤销 API Key「${revokeKeyTarget?.name ?? ""}」？`}
        description="撤销后使用该 Key 的调用会立即失败，且无法恢复。"
        confirmLabel="确认撤销"
        onConfirm={confirmRevokeKey}
      />

      <ConfirmDialog
        open={deleteAccountTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAccountTarget(null);
        }}
        title={`删除服务账号「${deleteAccountTarget?.name ?? ""}」？`}
        description="删除后该服务账号关联的密钥将全部失效，操作不可撤销。"
        confirmLabel="确认删除"
        onConfirm={confirmDeleteAccount}
      />
    </PageContainer>
  );
}
