"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Blocks,
  Cable,
  CheckCircle2,
  CircleAlert,
  Copy,
  KeyRound,
  Link2,
  PlugZap,
  Plus,
  Radio,
  RefreshCw,
  ShieldQuestion,
  Terminal,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { RowActions } from "@/components/common/row-actions";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { integrations as integrationSeed, webhookEndpoints as webhookSeed } from "@/lib/mock-data/ops";
import { formatDate, formatPercent, formatRelativeTime, truncate } from "@/lib/utils";
import type { Integration, WebhookEndpoint } from "@/types";

const CATEGORY_LABEL: Record<Integration["category"], string> = {
  git: "代码仓库",
  im: "即时通讯",
  project: "项目协作",
  cicd: "CI/CD",
  observability: "可观测性",
  oauth: "OAuth 应用",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, text]) => ({ value, label: text }));

const INTEGRATION_STATUS_LABEL: Record<Integration["status"], string> = {
  connected: "已连接",
  disconnected: "未连接",
  error: "异常",
  pending: "待授权",
};

const INTEGRATION_STATUS_OPTIONS = Object.entries(INTEGRATION_STATUS_LABEL).map(([value, text]) => ({
  value,
  label: text,
}));

const REAUTH_SCOPES = [
  "repo",
  "pull_request",
  "workflow",
  "read_repository",
  "chat:write",
  "im:message",
  "issue:write",
  "dashboard:read",
  "event:read",
];

const SDK_ITEMS: { name: string; version: string; command: string; note: string; icon: typeof Cable }[] = [
  {
    name: "REST API",
    version: "v2",
    command: "curl -H \"Authorization: Bearer $AGT_TOKEN\" https://api.agent-platform.cn/v2/models",
    note: "默认 600 请求/分钟/租户，突发上限 1200。",
    icon: Blocks,
  },
  {
    name: "Node SDK",
    version: "1.8.2",
    command: "npm install @agent-platform/sdk",
    note: "支持流式响应与工具调用回调。",
    icon: Cable,
  },
  {
    name: "Python SDK",
    version: "1.6.4",
    command: "pip install agent-platform",
    note: "兼容 Python 3.9+，内置异步客户端。",
    icon: Cable,
  },
  {
    name: "Java SDK",
    version: "1.4.0",
    command: "mvn dependency:get -Dartifact=cn.agentplatform:agent-sdk:1.4.0",
    note: "需要 JDK 17+，提供 Spring Boot Starter。",
    icon: Cable,
  },
  {
    name: "Go SDK",
    version: "1.2.1",
    command: "go get github.com/agent-platform/sdk-go",
    note: "零依赖，支持 context 取消与重试策略。",
    icon: Cable,
  },
  {
    name: "CLI",
    version: "3.1.0",
    command: "brew install agent-platform/tap/cli",
    note: "支持本地网关、密钥管理与批量导出。",
    icon: Terminal,
  },
  {
    name: "IDE 插件",
    version: "2.2.5",
    command: "code --install-extension agent-platform.agent-copilot",
    note: "适用于 VS Code 与 JetBrains 系列。",
    icon: Blocks,
  },
];

const EVENT_DESCRIPTIONS: Record<string, string> = {
  "audit.created": "产生新的审计日志时触发。",
  "alert.fired": "告警规则命中并开始告警时触发。",
  "approval.decided": "审批单通过或拒绝时触发。",
  "usage.daily": "每日用量汇总生成后触发。",
  "tenant.updated": "租户配置或状态变更时触发。",
  "invoice.issued": "月度发票开具时触发。",
  push: "代码仓库发生推送时触发。",
  pull_request: "Pull Request 创建或更新时触发。",
  merge_request: "Merge Request 变更时触发。",
  "issue.created": "工单或需求创建时触发。",
  "issue.updated": "工单或需求更新时触发。",
  "build.started": "流水线开始构建时触发。",
  "build.finished": "流水线构建完成时触发。",
  "workflow_run": "GitHub Actions 工作流运行时触发。",
  alert: "平台内部告警事件。",
  approval: "平台内部审批事件。",
  "daily-report": "运营日报生成事件。",
  onboarding: "租户开通流程事件。",
};

const webhookSchema = z.object({
  name: z.string().min(2, "名称至少 2 个字符").max(40, "名称过长"),
  url: z.string().url("请输入合法的 URL"),
  events: z.array(z.string()).min(1, "至少选择一个事件"),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

function randomSecret() {
  const chars = "0123456789abcdef";
  let value = "";
  for (let index = 0; index < 8; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)] ?? "0";
  }
  return `whsec_${value}`;
}

export default function IntegrationsPage() {
  const [integrationList, setIntegrationList] = React.useState<Integration[]>(integrationSeed);
  const [webhookList, setWebhookList] = React.useState<WebhookEndpoint[]>(webhookSeed);

  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [detailIntegration, setDetailIntegration] = React.useState<Integration | null>(null);
  const [connectionTarget, setConnectionTarget] = React.useState<Integration | null>(null);
  const [connectionAction, setConnectionAction] = React.useState<"connect" | "disconnect">("connect");
  const [reauthTarget, setReauthTarget] = React.useState<Integration | null>(null);
  const [reauthScopes, setReauthScopes] = React.useState<string[]>([]);

  const [webhookDialogOpen, setWebhookDialogOpen] = React.useState(false);
  const [webhookPauseTarget, setWebhookPauseTarget] = React.useState<WebhookEndpoint | null>(null);
  const [webhookDeleteTarget, setWebhookDeleteTarget] = React.useState<WebhookEndpoint | null>(null);

  const webhookEvents = React.useMemo(
    () =>
      Array.from(
        new Set([
          ...webhookList.flatMap((endpoint) => endpoint.events),
          ...integrationList.flatMap((integration) => integration.events),
        ]),
      ).sort(),
    [webhookList, integrationList],
  );

  const filteredIntegrations = React.useMemo(
    () =>
      integrationList.filter(
        (integration) =>
          (categoryFilter === "all" || integration.category === categoryFilter) &&
          (statusFilter === "all" || integration.status === statusFilter),
      ),
    [integrationList, categoryFilter, statusFilter],
  );

  const stats = React.useMemo(() => {
    const connected = integrationList.filter((item) => item.status === "connected").length;
    const error = integrationList.filter((item) => item.status === "error").length;
    const pending = integrationList.filter((item) => item.status === "pending").length;
    const events = webhookEvents.length;
    const successRate =
      webhookList.length === 0
        ? 100
        : webhookList.reduce((total, item) => total + item.successRate, 0) / webhookList.length;
    return { connected, error, pending, events, successRate };
  }, [integrationList, webhookList, webhookEvents.length]);

  const eventRows = React.useMemo(
    () =>
      webhookEvents.map((event) => {
        const subscribers =
          webhookList.filter((endpoint) => endpoint.events.includes(event)).length +
          integrationList.filter((integration) => integration.events.includes(event)).length;
        return {
          name: event,
          description: EVENT_DESCRIPTIONS[event] ?? "平台对外发布的标准事件。",
          payload: JSON.stringify({
            event,
            id: "evt_9f2c8a",
            at: "2026-09-17T09:30:00+08:00",
            tenant: "云启科技",
          }),
          subscribers,
        };
      }),
    [webhookEvents, webhookList, integrationList],
  );

  const webhookForm = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { name: "", url: "https://", events: ["alert.fired"] },
  });

  React.useEffect(() => {
    if (reauthTarget) {
      setReauthScopes(reauthTarget.scopes);
    } else {
      setReauthScopes([]);
    }
  }, [reauthTarget]);

  const copyCommand = (command: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(command);
    }
    toast.success("已复制安装命令");
  };

  const startConnection = (integration: Integration, action: "connect" | "disconnect") => {
    setConnectionTarget(integration);
    setConnectionAction(action);
  };

  const confirmConnection = () => {
    if (!connectionTarget) return;
    const nextStatus: Integration["status"] = connectionAction === "connect" ? "connected" : "disconnected";
    setIntegrationList((list) =>
      list.map((item) =>
        item.id === connectionTarget.id
          ? { ...item, status: nextStatus, lastSyncAt: new Date().toISOString() }
          : item,
      ),
    );
    toast.success(
      connectionAction === "connect"
        ? `已连接「${connectionTarget.name}」`
        : `已断开「${connectionTarget.name}」`,
    );
    setConnectionTarget(null);
  };

  const confirmReauth = () => {
    if (!reauthTarget) return;
    setIntegrationList((list) =>
      list.map((item) =>
        item.id === reauthTarget.id
          ? { ...item, scopes: reauthScopes, status: "connected", lastSyncAt: new Date().toISOString() }
          : item,
      ),
    );
    toast.success(`已更新「${reauthTarget.name}」的授权范围`);
    setReauthTarget(null);
  };

  const submitWebhook = (values: WebhookFormValues) => {
    const endpoint: WebhookEndpoint = {
      id: `wh-${String(webhookList.length + 1).padStart(2, "0")}`,
      name: values.name,
      url: values.url,
      events: values.events,
      secretPrefix: randomSecret(),
      status: "active",
      successRate: 100,
      lastDeliveryAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    setWebhookList((list) => [endpoint, ...list]);
    toast.success(`已创建 Webhook「${values.name}」，密钥仅显示一次`);
    setWebhookDialogOpen(false);
    webhookForm.reset();
  };

  const integrationColumns = React.useMemo<ColumnDef<Integration, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "集成",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">{row.original.provider}</p>
          </div>
        ),
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: "供应商",
        cell: ({ row }) => <span className="text-xs">{row.original.provider}</span>,
      },
      {
        id: "category",
        accessorKey: "category",
        header: "分类",
        cell: ({ row }) => <Badge variant="secondary">{CATEGORY_LABEL[row.original.category]}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} label={INTEGRATION_STATUS_LABEL[row.original.status]} />
        ),
      },
      {
        id: "scopes",
        header: "授权范围",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.scopes.slice(0, 3).map((scope) => (
              <Badge key={scope} variant="outline" className="font-mono">
                {scope}
              </Badge>
            ))}
            {row.original.scopes.length > 3 ? (
              <Badge variant="neutral">+{row.original.scopes.length - 3}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: "installedBy",
        accessorKey: "installedBy",
        header: "安装人",
        cell: ({ row }) => <span className="text-2xs">{row.original.installedBy}</span>,
      },
      {
        id: "lastSyncAt",
        accessorKey: "lastSyncAt",
        header: "最后同步",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">{formatRelativeTime(row.original.lastSyncAt)}</span>
        ),
      },
      {
        id: "version",
        accessorKey: "version",
        header: "版本",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{row.original.version}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailIntegration(row.original)}
            extraItems={[
              row.original.status === "connected"
                ? {
                    label: "断开连接",
                    destructive: true,
                    onSelect: () => startConnection(row.original, "disconnect"),
                  }
                : { label: "连接", onSelect: () => startConnection(row.original, "connect") },
              { label: "重新授权", onSelect: () => setReauthTarget(row.original) },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const webhookColumns = React.useMemo<ColumnDef<WebhookEndpoint, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "名称",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: "url",
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.url}>
            {truncate(row.original.url, 38)}
          </span>
        ),
      },
      {
        id: "events",
        header: "事件",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.events.map((event) => (
              <Badge key={event} variant="outline" className="font-mono">
                {event}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "secretPrefix",
        accessorKey: "secretPrefix",
        header: "密钥前缀",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.secretPrefix}…</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) =>
          row.original.status === "active" ? (
            <StatusBadge status="enabled" label="投递中" />
          ) : row.original.status === "paused" ? (
            <StatusBadge status="paused" />
          ) : (
            <StatusBadge status="failing" />
          ),
      },
      {
        id: "successRate",
        accessorKey: "successRate",
        header: "成功率",
        cell: ({ row }) => (
          <span
            className={
              row.original.successRate < 90
                ? "num text-xs text-red-600 dark:text-red-400"
                : "num text-xs"
            }
          >
            {formatPercent(row.original.successRate, 1)}
          </span>
        ),
      },
      {
        id: "lastDeliveryAt",
        accessorKey: "lastDeliveryAt",
        header: "最后投递",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {formatRelativeTime(row.original.lastDeliveryAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            extraItems={[
              { label: "测试投递", onSelect: () => toast.success(`已向「${row.original.name}」测试投递` ) },
              row.original.status === "paused"
                ? {
                    label: "恢复投递",
                    onSelect: () => {
                      setWebhookList((list) =>
                        list.map((item) =>
                          item.id === row.original.id ? { ...item, status: "active" } : item,
                        ),
                      );
                      toast.success(`已恢复「${row.original.name}」投递`);
                    },
                  }
                : { label: "暂停投递", onSelect: () => setWebhookPauseTarget(row.original) },
            ]}
            onDelete={() => setWebhookDeleteTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  const eventColumns = React.useMemo<
    ColumnDef<{ name: string; description: string; payload: string; subscribers: number }, unknown>[]
  >(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "事件名",
        cell: ({ row }) => <span className="font-mono text-2xs font-medium">{row.original.name}</span>,
      },
      {
        id: "description",
        accessorKey: "description",
        header: "说明",
        cell: ({ row }) => <span className="text-xs">{row.original.description}</span>,
      },
      {
        id: "payload",
        accessorKey: "payload",
        header: "Payload 预览",
        cell: ({ row }) => (
          <code className="text-muted-foreground block max-w-[22rem] truncate font-mono text-2xs" title={row.original.payload}>
            {row.original.payload}
          </code>
        ),
      },
      {
        id: "subscribers",
        accessorKey: "subscribers",
        header: "订阅数",
        cell: ({ row }) => <span className="num text-xs">{row.original.subscribers}</span>,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        description="管理第三方集成、Webhook 回调、开放 API/SDK 与事件总线订阅关系。"
        title="集成与开放"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已触发全部集成同步（演示）")}
            >
              <RefreshCw />
              全部同步
            </Button>
            <Button size="sm" onClick={() => setWebhookDialogOpen(true)}>
              <Plus />
              新建 Webhook
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="已连接" value={stats.connected} icon={Link2} tone="success" />
        <StatCard label="异常" value={stats.error} icon={CircleAlert} tone="danger" />
        <StatCard label="待授权" value={stats.pending} icon={ShieldQuestion} tone="warning" />
        <StatCard label="Webhook 端点" value={webhookList.length} icon={Webhook} />
        <StatCard label="事件订阅数" value={stats.events} icon={Radio} />
        <StatCard
          label="24h 投递成功率"
          value={stats.successRate}
          unit="%"
          icon={CheckCircle2}
          tone="success"
        />
      </StatCardGrid>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">
            <PlugZap />
            集成
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="api">
            <Terminal />
            API 与 SDK
          </TabsTrigger>
          <TabsTrigger value="events">
            <Radio />
            事件总线
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-3">
          <FilterBar
            activeCount={[categoryFilter, statusFilter].filter((value) => value !== "all").length}
            onReset={() => {
              setCategoryFilter("all");
              setStatusFilter("all");
            }}
          >
            <FilterSelect
              label="分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
            />
            <FilterSelect
              label="状态"
              value={statusFilter}
              onChange={setStatusFilter}
              options={INTEGRATION_STATUS_OPTIONS}
            />
          </FilterBar>

          <DataTable
            columns={integrationColumns}
            data={filteredIntegrations}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索集成名称、供应商、安装人…"
            onRowClick={(row) => setDetailIntegration(row)}
            emptyTitle="没有符合条件的集成"
          />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-3">
          <DataTable
            columns={webhookColumns}
            data={webhookList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索 Webhook 名称、URL、事件…"
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setWebhookDialogOpen(true)}>
                <Plus />
                新建 Webhook
              </Button>
            }
            emptyTitle="还没有 Webhook 端点"
          />
        </TabsContent>

        <TabsContent value="api" className="space-y-3">
          <SectionHeader
            title="开放能力"
            description="通过 REST API、官方 SDK、CLI 与 IDE 插件接入平台能力，所有调用均按租户维度限流。"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SDK_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.name} className="gap-0 py-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <CardTitle>{item.name}</CardTitle>
                          <p className="text-muted-foreground font-mono text-2xs">{item.version}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-2xs" title={item.command}>
                        {item.command}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`复制 ${item.name} 安装命令`}
                        onClick={() => copyCommand(item.command)}
                      >
                        <Copy />
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-2xs">{item.note}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-3">
          <DataTable
            columns={eventColumns}
            data={eventRows}
            getRowId={(row) => row.name}
            searchPlaceholder="搜索事件名、说明…"
            emptyTitle="还没有事件订阅"
          />
        </TabsContent>
      </Tabs>

      <DetailSheet
        open={detailIntegration !== null}
        onOpenChange={(open) => {
          if (!open) setDetailIntegration(null);
        }}
        title={detailIntegration?.name ?? "集成详情"}
        description={detailIntegration ? `${detailIntegration.provider} · ${CATEGORY_LABEL[detailIntegration.category]}` : undefined}
        footer={
          detailIntegration ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setReauthTarget(detailIntegration)}>
                <KeyRound />
                重新授权
              </Button>
              {detailIntegration.status === "connected" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => startConnection(detailIntegration, "disconnect")}
                >
                  断开连接
                </Button>
              ) : (
                <Button size="sm" onClick={() => startConnection(detailIntegration, "connect")}>
                  连接
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {detailIntegration ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={detailIntegration.status}
                label={INTEGRATION_STATUS_LABEL[detailIntegration.status]}
              />
              <Badge variant="secondary">{CATEGORY_LABEL[detailIntegration.category]}</Badge>
              <Badge variant="outline">v{detailIntegration.version}</Badge>
            </div>

            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="集成 ID" mono>
                  {detailIntegration.id}
                </DetailRow>
                <DetailRow label="供应商">{detailIntegration.provider}</DetailRow>
                <DetailRow label="安装人">{detailIntegration.installedBy}</DetailRow>
                <DetailRow label="安装时间">
                  <span className="num">{formatDate(detailIntegration.installedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="最后同步">
                  <span className="num">{formatDate(detailIntegration.lastSyncAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="版本" mono>
                  {detailIntegration.version}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="授权范围">
              <div className="flex flex-wrap gap-1">
                {detailIntegration.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="font-mono">
                    {scope}
                  </Badge>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="订阅事件">
              <div className="flex flex-wrap gap-1">
                {detailIntegration.events.map((event) => (
                  <Badge key={event} variant="secondary" className="font-mono">
                    {event}
                  </Badge>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="回调地址">
              <code className="text-muted-foreground block break-all rounded-md border border-border bg-muted/40 p-2.5 font-mono text-2xs">
                {detailIntegration.webhookUrl}
              </code>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建 Webhook</DialogTitle>
            <DialogDescription>平台会向指定 URL POST 事件 JSON，并使用签名密钥进行校验。</DialogDescription>
          </DialogHeader>
          <Form {...webhookForm}>
            <form onSubmit={webhookForm.handleSubmit(submitWebhook)} className="space-y-4">
              <FormField
                control={webhookForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：审计同步" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={webhookForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>回调 URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://siem.corp.internal/hooks/audit" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>仅支持 HTTPS，需返回 2xx 视为投递成功。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={webhookForm.control}
                name="events"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>订阅事件</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {webhookEvents.map((event) => {
                        const checked = field.value.includes(event);
                        return (
                          <label
                            key={event}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-2xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                field.onChange(
                                  value === true
                                    ? [...field.value, event]
                                    : field.value.filter((item) => item !== event),
                                )
                              }
                            />
                            {event}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert variant="warning">
                <KeyRound />
                <AlertTitle>签名密钥仅显示一次</AlertTitle>
                <AlertDescription>
                  创建成功后会生成 whsec_ 前缀的签名密钥，请立即保存到密钥管理系统，页面刷新后无法再次查看。
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setWebhookDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建 Webhook
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reauthTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReauthTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>重新授权 · {reauthTarget?.name ?? ""}</DialogTitle>
            <DialogDescription>调整授权范围后需重新完成 OAuth 授权，旧令牌将立即失效。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-medium">授权范围</Label>
            <div className="grid grid-cols-2 gap-2">
              {REAUTH_SCOPES.map((scope) => {
                const checked = reauthScopes.includes(scope);
                return (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-2xs"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setReauthScopes((scopes) =>
                          value === true ? [...scopes, scope] : scopes.filter((item) => item !== scope),
                        )
                      }
                    />
                    {scope}
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReauthTarget(null)}>
              取消
            </Button>
            <Button size="sm" onClick={confirmReauth} disabled={reauthScopes.length === 0}>
              重新授权
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={connectionTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConnectionTarget(null);
        }}
        title={
          connectionAction === "connect"
            ? `连接集成「${connectionTarget?.name ?? ""}」？`
            : `断开集成「${connectionTarget?.name ?? ""}」？`
        }
        description={
          connectionAction === "connect"
            ? "连接后平台会立即拉取该集成的事件与权限，并按授权范围同步数据。"
            : "断开后依赖该集成的自动化流程将停止，历史同步数据保留但不再更新。"
        }
        confirmLabel={connectionAction === "connect" ? "确认连接" : "确认断开"}
        variant={connectionAction === "connect" ? "default" : "destructive"}
        onConfirm={confirmConnection}
      />

      <ConfirmDialog
        open={webhookPauseTarget !== null}
        onOpenChange={(open) => {
          if (!open) setWebhookPauseTarget(null);
        }}
        title={`暂停 Webhook「${webhookPauseTarget?.name ?? ""}」？`}
        description="暂停期间事件将被丢弃且不重试，恢复后仅接收新的投递。"
        confirmLabel="暂停投递"
        onConfirm={() => {
          if (!webhookPauseTarget) return;
          setWebhookList((list) =>
            list.map((item) => (item.id === webhookPauseTarget.id ? { ...item, status: "paused" } : item)),
          );
          toast.success(`已暂停「${webhookPauseTarget.name}」`);
          setWebhookPauseTarget(null);
        }}
      />

      <ConfirmDialog
        open={webhookDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setWebhookDeleteTarget(null);
        }}
        title={`删除 Webhook「${webhookDeleteTarget?.name ?? ""}」？`}
        description="删除后无法恢复，密钥与投递记录将一并清除。"
        confirmLabel="确认删除"
        onConfirm={() => {
          if (!webhookDeleteTarget) return;
          setWebhookList((list) => list.filter((item) => item.id !== webhookDeleteTarget.id));
          toast.success(`已删除「${webhookDeleteTarget.name}」`);
          setWebhookDeleteTarget(null);
        }}
      />
    </PageContainer>
  );
}
