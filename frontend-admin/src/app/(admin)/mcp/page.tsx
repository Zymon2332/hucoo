"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Download,
  HeartPulse,
  Network,
  Plug,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { ChartCard } from "@/components/common/chart-card";
import { SparkLine } from "@/components/charts";
import { mcpServers as mcpSeed } from "@/lib/mock-data/capability";
import { label } from "@/lib/labels";
import { formatCompact, formatDate, formatNumber, formatRelativeTime, truncate } from "@/lib/utils";
import type { MicroMcpServer } from "@/types";

const TRANSPORT_OPTIONS = [
  { value: "streamable-http", label: "Streamable HTTP" },
  { value: "sse", label: "SSE" },
  { value: "stdio", label: "STDIO" },
];

const AUTH_OPTIONS = [
  { value: "none", label: "无" },
  { value: "api-key", label: "API Key" },
  { value: "oauth", label: "OAuth" },
  { value: "mtls", label: "mTLS" },
];

const STATUS_OPTIONS = [
  { value: "healthy", label: "健康" },
  { value: "degraded", label: "降级" },
  { value: "down", label: "不可用" },
  { value: "unknown", label: "未知" },
];

const mcpSchema = z.object({
  name: z
    .string()
    .min(2, "名称至少 2 个字符")
    .max(60, "名称过长")
    .regex(/^[a-z0-9-]+$/, "名称只能包含小写字母、数字与连字符"),
  endpoint: z
    .string()
    .min(4, "请填写 Endpoint")
    .refine(
      (value) => value.startsWith("stdio://") || /^https?:\/\//.test(value),
      "Endpoint 需以 https:// 或 stdio:// 开头",
    ),
  transport: z.enum(["sse", "streamable-http", "stdio"]),
  authType: z.enum(["none", "api-key", "oauth", "mtls"]),
  allowedDomains: z.string(),
  tags: z.string(),
});

type McpFormValues = z.infer<typeof mcpSchema>;

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseTags = (value: string) =>
  value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const hashOf = (value: string) =>
  value.split("").reduce((accumulator, char) => (accumulator * 31 + char.charCodeAt(0)) % 9973, 7);

const buildTrend = (seed: number, base: number) =>
  Array.from({ length: 14 }, (_, index) => {
    const wave = 0.72 + ((seed + index * 17) % 45) / 100;
    const growth = 1 + index * 0.015;
    return {
      label: `D-${13 - index}`,
      calls: Math.max(0, Math.round(base * wave * growth)),
    };
  });

export default function McpPage() {
  const [mcpList, setMcpList] = React.useState<MicroMcpServer[]>(mcpSeed);
  const [transportFilter, setTransportFilter] = React.useState("all");
  const [authFilter, setAuthFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tagFilter, setTagFilter] = React.useState("all");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingServer, setEditingServer] = React.useState<MicroMcpServer | null>(null);
  const [detailServer, setDetailServer] = React.useState<MicroMcpServer | null>(null);
  const [disableTarget, setDisableTarget] = React.useState<MicroMcpServer | null>(null);

  const tagOptions = React.useMemo(
    () =>
      Array.from(new Set(mcpList.flatMap((server) => server.tags))).map((value) => ({
        value,
        label: value,
      })),
    [mcpList],
  );

  const filtered = React.useMemo(
    () =>
      mcpList.filter(
        (server) =>
          (transportFilter === "all" || server.transport === transportFilter) &&
          (authFilter === "all" || server.authType === authFilter) &&
          (statusFilter === "all" || server.status === statusFilter) &&
          (tagFilter === "all" || server.tags.includes(tagFilter)),
      ),
    [mcpList, transportFilter, authFilter, statusFilter, tagFilter],
  );

  const activeFilterCount = [transportFilter, authFilter, statusFilter, tagFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = mcpList.length;
    const healthy = mcpList.filter((server) => server.status === "healthy").length;
    const degraded = mcpList.filter((server) => server.status === "degraded").length;
    const down = mcpList.filter((server) => server.status === "down").length;
    const tools = mcpList.reduce((sum, server) => sum + server.toolCount, 0);
    const calls = mcpList.reduce((sum, server) => sum + server.calls24h, 0);
    return { total, healthy, degraded, down, tools, calls };
  }, [mcpList]);

  const form = useForm<McpFormValues>({
    resolver: zodResolver(mcpSchema),
    defaultValues: {
      name: "",
      endpoint: "https://mcp.agent-platform.cn/",
      transport: "streamable-http",
      authType: "oauth",
      allowedDomains: "",
      tags: "自建",
    },
  });

  React.useEffect(() => {
    if (editingServer) {
      form.reset({
        name: editingServer.name,
        endpoint: editingServer.endpoint,
        transport: editingServer.transport,
        authType: editingServer.authType,
        allowedDomains: editingServer.allowedDomains.join("\n"),
        tags: editingServer.tags.join("、"),
      });
    } else {
      form.reset({
        name: "",
        endpoint: "https://mcp.agent-platform.cn/",
        transport: "streamable-http",
        authType: "oauth",
        allowedDomains: "",
        tags: "自建",
      });
    }
  }, [editingServer, form]);

  const onSubmit = (values: McpFormValues) => {
    if (editingServer) {
      setMcpList((list) =>
        list.map((server) =>
          server.id === editingServer.id
            ? {
                ...server,
                name: values.name,
                endpoint: values.endpoint,
                transport: values.transport,
                authType: values.authType,
                allowedDomains: parseLines(values.allowedDomains),
                tags: parseTags(values.tags),
              }
            : server,
        ),
      );
      toast.success(`已更新 MCP Server「${values.name}」`);
      setEditingServer(null);
      return;
    }
    const newServer: MicroMcpServer = {
      id: `mcp-${String(mcpList.length + 1).padStart(2, "0")}`,
      name: values.name,
      endpoint: values.endpoint,
      transport: values.transport,
      authType: values.authType,
      version: "0.1.0",
      status: "unknown",
      toolCount: 0,
      calls24h: 0,
      errorRate: 0,
      latencyP95: 0,
      owner: "当前管理员",
      allowedDomains: parseLines(values.allowedDomains),
      egressLimited: true,
      lastSyncAt: new Date().toISOString(),
      tags: parseTags(values.tags),
    };
    setMcpList((list) => [newServer, ...list]);
    toast.success(`已创建 MCP Server「${values.name}」，请稍后测试连接`);
    setCreateOpen(false);
    form.reset();
  };

  const testConnection = (server: MicroMcpServer) => {
    toast.success(`已向「${server.name}」发起连接测试，请查看健康状态`);
  };

  const toggleStatus = (server: MicroMcpServer) => {
    if (server.status === "down" || server.status === "unknown") {
      setMcpList((list) =>
        list.map((item) => (item.id === server.id ? { ...item, status: "healthy" } : item)),
      );
      toast.success(`已启用「${server.name}」`);
      return;
    }
    setDisableTarget(server);
  };

  const columns = React.useMemo<ColumnDef<MicroMcpServer, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Server",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">{row.original.owner}</p>
          </div>
        ),
      },
      {
        id: "endpoint",
        accessorKey: "endpoint",
        header: "Endpoint",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.endpoint}>
            {truncate(row.original.endpoint, 34)}
          </span>
        ),
      },
      {
        id: "transport",
        accessorKey: "transport",
        header: "传输",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.transport)}</Badge>,
      },
      {
        id: "authType",
        accessorKey: "authType",
        header: "鉴权",
        cell: ({ row }) => <Badge variant="outline">{label(row.original.authType)}</Badge>,
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
        id: "toolCount",
        accessorKey: "toolCount",
        header: "工具数",
        cell: ({ row }) => <span className="num text-xs">{row.original.toolCount}</span>,
      },
      {
        id: "calls24h",
        accessorKey: "calls24h",
        header: "24h 调用",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.calls24h)}</span>,
      },
      {
        id: "errorRate",
        accessorKey: "errorRate",
        header: "错误率",
        cell: ({ row }) => (
          <span
            className={
              row.original.errorRate > 2
                ? "num text-xs text-red-600 dark:text-red-400"
                : "num text-xs"
            }
          >
            {row.original.errorRate.toFixed(2)}%
          </span>
        ),
      },
      {
        id: "latencyP95",
        accessorKey: "latencyP95",
        header: "P95",
        cell: ({ row }) => (
          <span className="num text-xs">{formatNumber(row.original.latencyP95)} ms</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "健康状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "lastSyncAt",
        accessorKey: "lastSyncAt",
        header: "最后同步",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {formatRelativeTime(row.original.lastSyncAt)}
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
            onView={() => setDetailServer(row.original)}
            onEdit={() => setEditingServer(row.original)}
            statusActive={row.original.status !== "down" && row.original.status !== "unknown"}
            onToggleStatus={() => toggleStatus(row.original)}
            extraItems={[{ label: "测试连接", onSelect: () => testConnection(row.original) }]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="MCP Server 管理"
        description="统一纳管 MCP Server 的连接、鉴权、工具暴露与出网限制，并监控调用健康度。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已刷新全部 MCP Server 健康状态（演示）")}
            >
              <RefreshCw />
              刷新
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              新建 Server
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Server 总数" value={stats.total} icon={Server} delta={4.2} />
        <StatCard label="健康" value={stats.healthy} icon={HeartPulse} tone="success" />
        <StatCard label="降级" value={stats.degraded} icon={TriangleAlert} tone="warning" />
        <StatCard label="不可用" value={stats.down} icon={Plug} tone="danger" />
        <StatCard label="工具总数" value={stats.tools} icon={Wrench} />
        <StatCard
          label="24h 调用量"
          value={stats.calls}
          icon={Activity}
          valueFormatter={(value) => formatCompact(value)}
          delta={9.6}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTransportFilter("all");
          setAuthFilter("all");
          setStatusFilter("all");
          setTagFilter("all");
        }}
      >
        <FilterSelect label="传输方式" value={transportFilter} onChange={setTransportFilter} options={TRANSPORT_OPTIONS} />
        <FilterSelect label="鉴权" value={authFilter} onChange={setAuthFilter} options={AUTH_OPTIONS} />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="标签" value={tagFilter} onChange={setTagFilter} options={tagOptions} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索 Server 名称、Endpoint、负责人…"
        onRowClick={(row) => setDetailServer(row)}
        emptyTitle="没有符合条件的 MCP Server"
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            新建 Server
          </Button>
        }
      />

      <Dialog
        open={createOpen || editingServer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingServer(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingServer ? `编辑 Server · ${editingServer.name}` : "新建 MCP Server"}</DialogTitle>
            <DialogDescription>
              保存后平台会拉取该 Server 暴露的工具清单，并按允许域名生成出网白名单。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server 名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：internal-cmdb-mcp" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint</FormLabel>
                      <FormControl>
                        <Input placeholder="https://mcp.agent-platform.cn/…" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription>远程 Server 使用 https://，本地进程使用 stdio://。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>传输方式</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRANSPORT_OPTIONS.map((option) => (
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
                  control={form.control}
                  name="authType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>鉴权方式</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AUTH_OPTIONS.map((option) => (
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
                name="allowedDomains"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>允许访问的域名</FormLabel>
                    <FormControl>
                      <Textarea rows={4} className="font-mono text-2xs" placeholder={"api.github.com\nhooks.slack.com"} {...field} />
                    </FormControl>
                    <FormDescription>每行一个域名，未声明的出站请求会被网络策略拦截。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标签</FormLabel>
                    <FormControl>
                      <Input placeholder="官方、生产、只读（用逗号分隔）" {...field} />
                    </FormControl>
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
                    setEditingServer(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingServer ? "保存修改" : "创建 Server"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailServer !== null}
        onOpenChange={(open) => {
          if (!open) setDetailServer(null);
        }}
        title={detailServer?.name ?? "MCP Server 详情"}
        description={detailServer ? `${label(detailServer.transport)} · ${label(detailServer.authType)}` : undefined}
        footer={
          detailServer ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => testConnection(detailServer)}>
                <RefreshCw />
                测试连接
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingServer(detailServer)}>
                  编辑
                </Button>
                <Button size="sm" onClick={() => toggleStatus(detailServer)}>
                  {detailServer.status === "down" ? "启用 Server" : "停用 Server"}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailServer ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailServer.status} />
              <Badge variant="secondary">{label(detailServer.transport)}</Badge>
              <Badge variant="outline">{label(detailServer.authType)}</Badge>
              {detailServer.egressLimited ? (
                <Badge variant="warning">出网受限</Badge>
              ) : (
                <Badge variant="neutral">出网开放</Badge>
              )}
            </div>

            <DetailSection title="连接信息">
              <DetailGrid>
                <DetailRow label="Server ID" mono>
                  {detailServer.id}
                </DetailRow>
                <DetailRow label="版本" mono>
                  {detailServer.version}
                </DetailRow>
                <DetailRow label="Endpoint" mono>
                  {detailServer.endpoint}
                </DetailRow>
                <DetailRow label="负责人">{detailServer.owner}</DetailRow>
                <DetailRow label="最后同步">
                  <span className="num">{formatDate(detailServer.lastSyncAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="暴露工具">
                  <span className="num">{detailServer.toolCount}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="调用统计" description="近 14 天调用量走势">
              <DetailGrid columns={3}>
                <DetailRow label="24h 调用">
                  <span className="num">{formatCompact(detailServer.calls24h)}</span>
                </DetailRow>
                <DetailRow label="错误率">
                  <span className="num">{detailServer.errorRate.toFixed(2)}%</span>
                </DetailRow>
                <DetailRow label="P95 延迟">
                  <span className="num">{formatNumber(detailServer.latencyP95)} ms</span>
                </DetailRow>
              </DetailGrid>
              <ChartCard title="调用趋势" contentClassName="pt-1">
                <SparkLine
                  data={buildTrend(hashOf(detailServer.id), detailServer.calls24h / 14)}
                  dataKey="calls"
                  height={64}
                />
              </ChartCard>
            </DetailSection>

            <DetailSection title="允许访问的域名">
              {detailServer.allowedDomains.length === 0 ? (
                <p className="text-muted-foreground text-2xs">未声明允许域名，所有出站请求将被拒绝。</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {detailServer.allowedDomains.map((domain) => (
                    <Badge key={domain} variant="outline" className="font-mono">
                      {domain}
                    </Badge>
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection title="标签">
              <div className="flex flex-wrap gap-1">
                {detailServer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="出网限制">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
                <span className="flex items-center gap-2">
                  <Network className="text-muted-foreground size-3.5" />
                  仅允许白名单域名出站
                </span>
                <StatusBadge status={detailServer.egressLimited ? "enabled" : "disabled"} />
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
        title={`停用 MCP Server「${disableTarget?.name ?? ""}」？`}
        description={
          <span className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            停用后引用该 Server 工具的 Agent 会在调用时返回工具不可用，正在执行的会话会在下一轮对话生效。
          </span>
        }
        confirmLabel="停用 Server"
        onConfirm={() => {
          if (!disableTarget) return;
          setMcpList((list) =>
            list.map((item) => (item.id === disableTarget.id ? { ...item, status: "down" } : item)),
          );
          toast.success(`已停用「${disableTarget.name}」`);
          setDisableTarget(null);
        }}
      />

      <div className="text-muted-foreground flex items-center gap-2 text-2xs">
        <Download className="size-3.5" />
        <span>数据为本地静态演示数据，所有变更仅保存在当前页面。</span>
      </div>
    </PageContainer>
  );
}
