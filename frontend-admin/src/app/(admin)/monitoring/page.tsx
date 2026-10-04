"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  BadgeCheck,
  Clock,
  Database,
  HardDriveDownload,
  HeartPulse,
  ListOrdered,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartCard } from "@/components/common/chart-card";
import { DataTable } from "@/components/common/data-table";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { RowActions } from "@/components/common/row-actions";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { AreaTrendChart, MultiLineChart } from "@/components/charts";
import { traceSpans } from "@/lib/mock-data/audit";
import {
  backupStatus,
  monitoringMetrics,
  monitoringSeries,
  serviceStatuses,
  slaReport,
  systemLogs,
} from "@/lib/mock-data/monitoring";
import {
  formatCompact,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/utils";
import type { ServiceStatus, SystemLogEntry, TraceSpan } from "@/types";

const CATEGORY_LABEL: Record<ServiceStatus["category"], string> = {
  gateway: "接入网关",
  model: "模型服务",
  tool: "工具执行",
  mcp: "MCP 桥接",
  storage: "存储与审计",
  auth: "身份认证",
};

const CHANNEL_LABEL: Record<SystemLogEntry["channel"], string> = {
  system: "系统",
  audit: "审计",
  model: "模型",
  tool: "工具",
  mcp: "MCP",
  sandbox: "沙箱",
};

const LEVEL_LABEL: Record<SystemLogEntry["level"], string> = {
  debug: "调试",
  info: "信息",
  warn: "警告",
  error: "错误",
  fatal: "致命",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL).map(([value, text]) => ({ value, label: text }));

const SERVICE_STATUS_OPTIONS = [
  { value: "operational", label: "运行正常" },
  { value: "degraded", label: "降级" },
  { value: "outage", label: "服务中断" },
  { value: "maintenance", label: "维护中" },
];

const LEVEL_OPTIONS = Object.entries(LEVEL_LABEL).map(([value, text]) => ({ value, label: text }));
const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABEL).map(([value, text]) => ({ value, label: text }));

const TRACE_STATUS_OPTIONS = [
  { value: "ok", label: "正常" },
  { value: "slow", label: "慢查询" },
  { value: "error", label: "错误" },
];

const SERVICE_FILTER_OPTIONS = Array.from(
  new Set(traceSpans.map((span) => span.service)),
).map((value) => ({ value, label: value }));

interface SlaMetric {
  label: string;
  value: string;
  hint: string;
}

function formatMinutes(value: number) {
  return `${formatNumber(value)} 分钟`;
}

export default function MonitoringPage() {
  const [serviceCategory, setServiceCategory] = React.useState("all");
  const [serviceStatus, setServiceStatus] = React.useState("all");
  const [logLevel, setLogLevel] = React.useState("all");
  const [logChannel, setLogChannel] = React.useState("all");
  const [traceService, setTraceService] = React.useState("all");
  const [traceStatus, setTraceStatus] = React.useState("all");
  const [detailService, setDetailService] = React.useState<ServiceStatus | null>(null);
  const [detailLog, setDetailLog] = React.useState<SystemLogEntry | null>(null);
  const [detailSpan, setDetailSpan] = React.useState<TraceSpan | null>(null);
  const [backupPending, setBackupPending] = React.useState(false);

  const filteredServices = React.useMemo(
    () =>
      serviceStatuses.filter(
        (service) =>
          (serviceCategory === "all" || service.category === serviceCategory) &&
          (serviceStatus === "all" || service.status === serviceStatus),
      ),
    [serviceCategory, serviceStatus],
  );

  const filteredLogs = React.useMemo(
    () =>
      systemLogs.filter(
        (log) =>
          (logLevel === "all" || log.level === logLevel) &&
          (logChannel === "all" || log.channel === logChannel),
      ),
    [logLevel, logChannel],
  );

  const filteredSpans = React.useMemo(
    () =>
      traceSpans.filter(
        (span) =>
          (traceService === "all" || span.service === traceService) &&
          (traceStatus === "all" || span.status === traceStatus),
      ),
    [traceService, traceStatus],
  );

  const traceGroup = React.useMemo(
    () => (detailSpan ? traceSpans.filter((span) => span.traceId === detailSpan.traceId) : []),
    [detailSpan],
  );

  const serviceStats = React.useMemo(() => {
    const degraded = serviceStatuses.filter((service) => service.status === "degraded").length;
    const outage = serviceStatuses.filter((service) => service.status === "outage").length;
    const breach = serviceStatuses.filter((service) => service.uptime30d < service.slaTarget).length;
    const avgUptime =
      serviceStatuses.reduce((total, service) => total + service.uptime30d, 0) /
      (serviceStatuses.length || 1);
    return { degraded, outage, breach, avgUptime };
  }, []);

  React.useEffect(() => {
    if (detailSpan && traceGroup.length === 0) setDetailSpan(null);
  }, [detailSpan, traceGroup.length]);

  const runBackup = () => {
    setBackupPending(true);
    window.setTimeout(() => {
      setBackupPending(false);
      toast.success("已触发全量备份任务，预计 12 分钟内完成");
    }, 600);
  };

  const serviceColumns = React.useMemo<ColumnDef<ServiceStatus, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "服务",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "类别",
        cell: ({ row }) => <Badge variant="secondary">{CATEGORY_LABEL[row.original.category]}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "uptime30d",
        accessorKey: "uptime30d",
        header: "30 天可用率",
        cell: ({ row }) => {
          const met = row.original.uptime30d >= row.original.slaTarget;
          return (
            <div className="flex items-center gap-2">
              <span className="num text-xs">{formatPercent(row.original.uptime30d, 2)}</span>
              <Badge variant={met ? "success" : "danger"}>{met ? "达标" : "未达标"}</Badge>
            </div>
          );
        },
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
        id: "errorRate",
        accessorKey: "errorRate",
        header: "错误率",
        cell: ({ row }) => (
          <span
            className={
              row.original.errorRate > 1
                ? "num text-xs text-red-600 dark:text-red-400"
                : "num text-xs"
            }
          >
            {formatPercent(row.original.errorRate, 2)}
          </span>
        ),
      },
      {
        id: "slaTarget",
        accessorKey: "slaTarget",
        header: "SLA 目标",
        cell: ({ row }) => <span className="num text-xs">{formatPercent(row.original.slaTarget, 2)}</span>,
      },
      {
        id: "lastIncidentAt",
        accessorKey: "lastIncidentAt",
        header: "最后事件",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {row.original.lastIncidentAt ? formatRelativeTime(row.original.lastIncidentAt) : "无"}
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
            onView={() => setDetailService(row.original)}
            extraItems={[
              {
                label: "标记维护",
                onSelect: () => toast.success(`已将「${row.original.name}」标记为维护窗口`),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const logColumns = React.useMemo<ColumnDef<SystemLogEntry, unknown>[]>(
    () => [
      {
        id: "at",
        accessorKey: "at",
        header: "时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.at, "MM-dd HH:mm:ss")}</span>
        ),
      },
      {
        id: "level",
        accessorKey: "level",
        header: "级别",
        cell: ({ row }) => <StatusBadge status={row.original.level} label={LEVEL_LABEL[row.original.level]} />,
      },
      {
        id: "channel",
        accessorKey: "channel",
        header: "通道",
        cell: ({ row }) => <Badge variant="outline">{CHANNEL_LABEL[row.original.channel]}</Badge>,
      },
      {
        id: "service",
        accessorKey: "service",
        header: "服务",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.service}</span>,
      },
      {
        id: "message",
        accessorKey: "message",
        header: "消息",
        cell: ({ row }) => (
          <p className="max-w-[22rem] truncate text-xs" title={row.original.message}>
            {row.original.message}
          </p>
        ),
      },
      {
        id: "traceId",
        accessorKey: "traceId",
        header: "Trace ID",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{row.original.traceId}</span>
        ),
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs">{row.original.tenantName}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => <RowActions onView={() => setDetailLog(row.original)} />,
      },
    ],
    [],
  );

  const spanColumns = React.useMemo<ColumnDef<TraceSpan, unknown>[]>(
    () => [
      {
        id: "traceId",
        accessorKey: "traceId",
        header: "Trace ID",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.traceId}</span>,
      },
      {
        id: "span",
        accessorKey: "span",
        header: "Span",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.span}</span>,
      },
      {
        id: "service",
        accessorKey: "service",
        header: "服务",
        cell: ({ row }) => <span className="text-2xs">{row.original.service}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "durationMs",
        accessorKey: "durationMs",
        header: "耗时",
        cell: ({ row }) => (
          <span
            className={
              row.original.status === "slow"
                ? "num text-xs text-amber-600 dark:text-amber-400"
                : "num text-xs"
            }
          >
            {formatNumber(row.original.durationMs)} ms
          </span>
        ),
      },
      {
        id: "startedAt",
        accessorKey: "startedAt",
        header: "开始时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.startedAt, "MM-dd HH:mm:ss")}</span>
        ),
      },
      {
        id: "model",
        accessorKey: "model",
        header: "模型",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.model}</span>,
      },
      {
        id: "tokens",
        accessorKey: "tokens",
        header: "Token",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.tokens)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => <RowActions onView={() => setDetailSpan(row.original)} />,
      },
    ],
    [],
  );

  const slaMetrics: SlaMetric[] = [
    { label: "本月可用性", value: formatPercent(slaReport.actual, 2), hint: `目标 ${formatPercent(slaReport.target, 2)}` },
    { label: "SLA 违约次数", value: formatNumber(slaReport.breaches), hint: `共 ${slaReport.totalIncidents} 起事件` },
    { label: "MTTR", value: formatMinutes(slaReport.mttrMinutes), hint: "平均恢复时长" },
    { label: "MTBF", value: `${formatNumber(slaReport.mtbfHours)} 小时`, hint: "平均无故障间隔" },
    { label: "RPO", value: formatMinutes(backupStatus.rpoMinutes), hint: "数据恢复点目标" },
    { label: "RTO", value: formatMinutes(backupStatus.rtoMinutes), hint: "业务恢复时间目标" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="监控大盘"
        description="平台级实时指标、服务健康、系统日志、调用链与 SLA 备份状态的统一观测入口。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已刷新实时监控指标（演示）")}
            >
              <RefreshCw />
              刷新
            </Button>
            <Button size="sm" onClick={runBackup} disabled={backupPending}>
              <HardDriveDownload />
              立即备份
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-4 2xl:grid-cols-4">
        <StatCard
          label="实时 QPS"
          value={monitoringMetrics.qps}
          icon={Activity}
          delta={4.6}
          valueFormatter={(value) => formatCompact(value)}
        />
        <StatCard
          label="请求错误率"
          value={monitoringMetrics.errorRate}
          unit="%"
          icon={TriangleAlert}
          delta={0.12}
          invertDelta
          tone="danger"
        />
        <StatCard
          label="P95 延迟"
          value={monitoringMetrics.p95}
          unit="ms"
          icon={Clock}
          delta={-3.4}
          invertDelta
          tone="info"
        />
        <StatCard
          label="P99 延迟"
          value={monitoringMetrics.p99}
          unit="ms"
          icon={Timer}
          delta={2.1}
          invertDelta
          tone="info"
        />
        <StatCard
          label="工具失败率"
          value={monitoringMetrics.toolFailureRate}
          unit="%"
          icon={Wrench}
          delta={-0.8}
          invertDelta
          tone="warning"
        />
        <StatCard
          label="模型可用性"
          value={monitoringMetrics.modelAvailability}
          unit="%"
          icon={BadgeCheck}
          delta={0.4}
          tone="success"
        />
        <StatCard label="活跃会话" value={monitoringMetrics.activeSessions} icon={Users} delta={7.2} />
        <StatCard
          label="队列深度"
          value={monitoringMetrics.queueDepth}
          icon={ListOrdered}
          delta={-12.5}
          invertDelta
          tone="warning"
        />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartCard
          title="QPS 趋势（近 30 天）"
          description="每秒请求数的每日走势"
          className="xl:col-span-2"
        >
          <AreaTrendChart
            data={monitoringSeries}
            xKey="date"
            height={280}
            series={[{ key: "qps", name: "QPS", color: "var(--chart-1)" }]}
            valueFormatter={(value) => formatCompact(value)}
          />
        </ChartCard>

        <ChartCard title="模型可用性（近 30 天）" description="按日统计的模型调用可用率">
          <AreaTrendChart
            data={monitoringSeries}
            xKey="date"
            height={280}
            series={[{ key: "modelAvailability", name: "可用性（%）", color: "var(--chart-2)" }]}
            valueFormatter={(value) => formatPercent(value, 2)}
          />
        </ChartCard>

        <ChartCard title="错误率趋势" description="请求错误率与工具失败率对比" className="xl:col-span-2">
          <MultiLineChart
            data={monitoringSeries}
            xKey="date"
            height={240}
            series={[
              { key: "errorRate", name: "请求错误率（%）", color: "var(--chart-1)" },
              { key: "toolFailureRate", name: "工具失败率（%）", color: "var(--chart-3)" },
            ]}
            valueFormatter={(value) => formatPercent(value, 2)}
          />
        </ChartCard>

        <ChartCard title="P95 / P99 延迟" description="延迟分位数的每日变化（毫秒）">
          <MultiLineChart
            data={monitoringSeries}
            xKey="date"
            height={240}
            series={[
              { key: "p95", name: "P95", color: "var(--chart-4)" },
              { key: "p99", name: "P99", color: "var(--chart-5)" },
            ]}
            valueFormatter={(value) => `${formatNumber(value)} ms`}
          />
        </ChartCard>
      </div>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">
            <Server />
            服务状态
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Database />
            系统日志
          </TabsTrigger>
          <TabsTrigger value="traces">
            <Activity />
            调用链
          </TabsTrigger>
          <TabsTrigger value="sla">
            <ShieldCheck />
            SLA 与备份
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-3">
          <FilterBar
            activeCount={[serviceCategory, serviceStatus].filter((value) => value !== "all").length}
            onReset={() => {
              setServiceCategory("all");
              setServiceStatus("all");
            }}
          >
            <FilterSelect
              label="类别"
              value={serviceCategory}
              onChange={setServiceCategory}
              options={CATEGORY_OPTIONS}
            />
            <FilterSelect
              label="状态"
              value={serviceStatus}
              onChange={setServiceStatus}
              options={SERVICE_STATUS_OPTIONS}
            />
          </FilterBar>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-muted-foreground text-2xs">服务总数</p>
              <p className="num mt-1 text-sm font-semibold">{serviceStatuses.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-muted-foreground text-2xs">降级服务</p>
              <p className="num mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                {serviceStats.degraded}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-muted-foreground text-2xs">中断服务</p>
              <p className="num mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                {serviceStats.outage}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-muted-foreground text-2xs">SLA 未达标</p>
              <p className="num mt-1 text-sm font-semibold">{serviceStats.breach}</p>
            </div>
          </div>

          {serviceStats.breach > 0 ? (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>存在未达标的服务</AlertTitle>
              <AlertDescription>
                当前有 {serviceStats.breach} 个服务的 30 天可用率低于 SLA 目标，请优先排查模型路由与出口代理。
              </AlertDescription>
            </Alert>
          ) : null}

          <DataTable
            columns={serviceColumns}
            data={filteredServices}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索服务名称、编号…"
            onRowClick={(row) => setDetailService(row)}
            emptyTitle="没有符合条件的服务"
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-3">
          <FilterBar
            activeCount={[logLevel, logChannel].filter((value) => value !== "all").length}
            onReset={() => {
              setLogLevel("all");
              setLogChannel("all");
            }}
          >
            <FilterSelect label="级别" value={logLevel} onChange={setLogLevel} options={LEVEL_OPTIONS} />
            <FilterSelect
              label="通道"
              value={logChannel}
              onChange={setLogChannel}
              options={CHANNEL_OPTIONS}
            />
          </FilterBar>

          <DataTable
            columns={logColumns}
            data={filteredLogs}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索消息、服务、Trace ID、租户…"
            pageSize={12}
            onRowClick={(row) => setDetailLog(row)}
            emptyTitle="没有符合条件的日志"
          />
        </TabsContent>

        <TabsContent value="traces" className="space-y-3">
          <FilterBar
            activeCount={[traceService, traceStatus].filter((value) => value !== "all").length}
            onReset={() => {
              setTraceService("all");
              setTraceStatus("all");
            }}
          >
            <FilterSelect
              label="服务"
              value={traceService}
              onChange={setTraceService}
              options={SERVICE_FILTER_OPTIONS}
            />
            <FilterSelect
              label="状态"
              value={traceStatus}
              onChange={setTraceStatus}
              options={TRACE_STATUS_OPTIONS}
            />
          </FilterBar>

          <DataTable
            columns={spanColumns}
            data={filteredSpans}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索 Trace ID、Span、服务、模型…"
            pageSize={12}
            onRowClick={(row) => setDetailSpan(row)}
            emptyTitle="没有符合条件的调用链"
          />
        </TabsContent>

        <TabsContent value="sla" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <Card className="gap-0 py-4 xl:col-span-2">
              <CardHeader className="pb-3">
                <SectionHeader
                  title={`SLA 报告 · ${slaReport.month}`}
                  description={`目标 ${formatPercent(slaReport.target, 2)}，实际 ${formatPercent(slaReport.actual, 2)}`}
                  actions={
                    <Badge variant={slaReport.actual >= slaReport.target ? "success" : "danger"}>
                      {slaReport.actual >= slaReport.target ? "达成" : "未达成"}
                    </Badge>
                  }
                />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slaMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-md border border-border p-3">
                    <p className="text-muted-foreground text-2xs">{metric.label}</p>
                    <p className="num mt-1 text-sm font-semibold">{metric.value}</p>
                    <p className="text-muted-foreground mt-0.5 text-2xs">{metric.hint}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-0 py-4">
              <CardHeader className="pb-3">
                <CardTitle>备份与容灾</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">最近全量备份</span>
                    <span className="num">{formatRelativeTime(backupStatus.lastFullBackupAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">最近增量备份</span>
                    <span className="num">{formatRelativeTime(backupStatus.lastIncrementalAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">备份体积</span>
                    <span className="num">{formatNumber(backupStatus.sizeGb)} GB</span>
                  </div>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">保留周期</span>
                    <span className="num">{backupStatus.retentionDays} 天</span>
                  </div>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">加密存储</span>
                    <StatusBadge status={backupStatus.encrypted ? "enabled" : "disabled"} />
                  </div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">最近灾备演练</p>
                      <p className="text-muted-foreground num text-2xs">
                        {formatDate(backupStatus.drDrillAt, "yyyy-MM-dd HH:mm")}
                      </p>
                    </div>
                    <StatusBadge status={backupStatus.drDrillResult} />
                  </div>
                </div>
                <Button className="w-full" size="sm" onClick={runBackup} disabled={backupPending}>
                  <HardDriveDownload />
                  {backupPending ? "备份中…" : "立即备份"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <DetailSheet
        open={detailService !== null}
        onOpenChange={(open) => {
          if (!open) setDetailService(null);
        }}
        title={detailService?.name ?? "服务详情"}
        description={detailService ? `${CATEGORY_LABEL[detailService.category]} · ${detailService.id}` : undefined}
      >
        {detailService ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailService.status} />
              <Badge variant="secondary">{CATEGORY_LABEL[detailService.category]}</Badge>
              <Badge variant={detailService.uptime30d >= detailService.slaTarget ? "success" : "danger"}>
                {detailService.uptime30d >= detailService.slaTarget ? "SLA 达标" : "SLA 未达标"}
              </Badge>
            </div>

            {detailService.uptime30d < detailService.slaTarget ? (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>可用率低于 SLA 目标</AlertTitle>
                <AlertDescription>
                  当前 {formatPercent(detailService.uptime30d, 2)}，目标 {formatPercent(detailService.slaTarget, 2)}
                  ，可能触发服务信用赔付条款。
                </AlertDescription>
              </Alert>
            ) : null}

            <DetailSection title="运行指标">
              <DetailGrid>
                <DetailRow label="30 天可用率">
                  <span className="num">{formatPercent(detailService.uptime30d, 2)}</span>
                </DetailRow>
                <DetailRow label="SLA 目标">
                  <span className="num">{formatPercent(detailService.slaTarget, 2)}</span>
                </DetailRow>
                <DetailRow label="P95 延迟">
                  <span className="num">{formatNumber(detailService.latencyP95)} ms</span>
                </DetailRow>
                <DetailRow label="错误率">
                  <span className="num">{formatPercent(detailService.errorRate, 2)}</span>
                </DetailRow>
                <DetailRow label="最后事件">
                  {detailService.lastIncidentAt ? (
                    <span className="num">{formatDate(detailService.lastIncidentAt, "yyyy-MM-dd HH:mm")}</span>
                  ) : (
                    "无"
                  )}
                </DetailRow>
                <DetailRow label="服务编号" mono>
                  {detailService.id}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="近 30 天延迟与错误走势">
              <ChartCard title="P95 延迟" description="单位：毫秒">
                <MultiLineChart
                  data={monitoringSeries}
                  xKey="date"
                  height={160}
                  series={[{ key: "p95", name: "P95", color: "var(--chart-1)" }]}
                  valueFormatter={(value) => `${formatNumber(value)} ms`}
                />
              </ChartCard>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <DetailSheet
        open={detailLog !== null}
        onOpenChange={(open) => {
          if (!open) setDetailLog(null);
        }}
        title="日志详情"
        description={detailLog ? `${CHANNEL_LABEL[detailLog.channel]} · ${detailLog.service}` : undefined}
      >
        {detailLog ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailLog.level} label={LEVEL_LABEL[detailLog.level]} />
              <Badge variant="outline">{CHANNEL_LABEL[detailLog.channel]}</Badge>
              <Badge variant="secondary">{detailLog.tenantName}</Badge>
            </div>

            <DetailSection title="日志内容">
              <p className="rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                {detailLog.message}
              </p>
            </DetailSection>

            <DetailSection title="元数据">
              <DetailGrid>
                <DetailRow label="时间">
                  <span className="num">{formatDate(detailLog.at, "yyyy-MM-dd HH:mm:ss")}</span>
                </DetailRow>
                <DetailRow label="服务" mono>
                  {detailLog.service}
                </DetailRow>
                <DetailRow label="通道">{CHANNEL_LABEL[detailLog.channel]}</DetailRow>
                <DetailRow label="租户">{detailLog.tenantName}</DetailRow>
                <DetailRow label="Trace ID" mono>
                  {detailLog.traceId}
                </DetailRow>
                <DetailRow label="日志 ID" mono>
                  {detailLog.id}
                </DetailRow>
              </DetailGrid>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <DetailSheet
        open={detailSpan !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSpan(null);
        }}
        title="调用链详情"
        description={detailSpan ? `${detailSpan.traceId} · ${detailSpan.span}` : undefined}
      >
        {detailSpan ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailSpan.status} />
              <Badge variant="secondary">{detailSpan.service}</Badge>
              <Badge variant="outline">{detailSpan.model}</Badge>
            </div>

            <DetailSection title="Span 信息">
              <DetailGrid>
                <DetailRow label="Trace ID" mono>
                  {detailSpan.traceId}
                </DetailRow>
                <DetailRow label="Span" mono>
                  {detailSpan.span}
                </DetailRow>
                <DetailRow label="服务" mono>
                  {detailSpan.service}
                </DetailRow>
                <DetailRow label="耗时">
                  <span className="num">{formatNumber(detailSpan.durationMs)} ms</span>
                </DetailRow>
                <DetailRow label="开始时间">
                  <span className="num">{formatDate(detailSpan.startedAt, "yyyy-MM-dd HH:mm:ss")}</span>
                </DetailRow>
                <DetailRow label="Token">
                  <span className="num">{formatNumber(detailSpan.tokens)}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection
              title="同一 Trace 的 Span 列表"
              description={`共 ${traceGroup.length} 个 Span`}
            >
              <div className="space-y-2">
                {traceGroup.map((span) => (
                  <div
                    key={span.id}
                    className="flex items-center justify-between rounded-md border border-border p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-2xs">{span.span}</p>
                      <p className="text-muted-foreground text-2xs">{span.service}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="num text-2xs">{formatNumber(span.durationMs)} ms</span>
                      <StatusBadge status={span.status} dot={false} />
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <div className="text-muted-foreground flex items-center gap-2 text-2xs">
        <HeartPulse className="size-3.5" />
        <span>监控指标为本地静态演示数据，不连接任何真实后端服务。</span>
      </div>
    </PageContainer>
  );
}
