"use client";

import * as React from "react";
import {
  Activity,
  BadgeCheck,
  Bot,
  Building2,
  Clock,
  Coins,
  type LucideIcon,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { StatusBadge, RiskBadge } from "@/components/common/status-badge";
import { ChartCard } from "@/components/common/chart-card";
import { AreaTrendChart, BarDistributionChart, DonutChart, MultiLineChart } from "@/components/charts";
import { useMockQuery } from "@/hooks/use-mock-query";
import {
  costBreakdown,
  dashboardAlerts,
  dashboardAuditLogs,
  dashboardMetrics,
  dashboardPendingApprovals,
  dashboardSeries,
  modelDistribution,
  platformHealthScore,
  quotaForecast,
  toolShare,
  tenantGrowth,
} from "@/lib/mock-data/dashboard";
import { formatCompact, formatCompactCurrency, formatNumber, formatPercent, formatRelativeTime } from "@/lib/utils";
import { label } from "@/lib/labels";

type TrendMetric = "calls" | "tokens" | "cost";

const TREND_OPTIONS: { value: TrendMetric; label: string }[] = [
  { value: "calls", label: "调用量" },
  { value: "tokens", label: "Token" },
  { value: "cost", label: "成本" },
];

export default function DashboardPage() {
  const [trendMetric, setTrendMetric] = React.useState<TrendMetric>("calls");
  const { data, isFetching, refetch } = useMockQuery(["dashboard"], {
    metrics: dashboardMetrics,
    series: dashboardSeries,
    alerts: dashboardAlerts,
    approvals: dashboardPendingApprovals,
    auditLogs: dashboardAuditLogs,
  });

  const metrics = data?.metrics ?? dashboardMetrics;
  const series = data?.series ?? dashboardSeries;

  const statCards: {
    label: string;
    value: number;
    icon: LucideIcon;
    delta: number;
    unit?: string;
    tone?: "default" | "success" | "warning" | "danger" | "info";
    formatter?: (value: number) => string;
    invertDelta?: boolean;
  }[] = [
    { label: "租户总数", value: metrics.tenants, icon: Building2, delta: metrics.tenantsDelta },
    { label: "用户总数", value: metrics.users, icon: Users, delta: metrics.usersDelta },
    { label: "活跃 Agent", value: metrics.activeAgents, icon: Bot, delta: metrics.agentsDelta },
    { label: "今日调用量", value: metrics.callsToday, icon: Activity, delta: metrics.callsDelta, formatter: formatCompact },
    {
      label: "今日 Token 消耗",
      value: metrics.tokensToday,
      icon: BadgeCheck,
      delta: metrics.tokensDelta,
      formatter: formatCompact,
      invertDelta: true,
    },
    {
      label: "今日成本",
      value: metrics.costToday,
      icon: Coins,
      delta: metrics.costDelta,
      formatter: (value) => formatCompactCurrency(value),
      invertDelta: true,
    },
    { label: "请求成功率", value: metrics.successRate, icon: ShieldAlert, delta: metrics.successRateDelta, unit: "%" as string, tone: "success" },
    { label: "P95 延迟", value: metrics.p95Latency, icon: Clock, delta: metrics.p95Delta, unit: "ms", invertDelta: true, tone: "info" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="控制台总览"
        description="平台级核心指标、模型与工具调用分布、待处理审批与实时告警。数据为静态演示数据。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "animate-spin" : undefined} />
              刷新
            </Button>
            <Button size="sm" asChild>
              <Link href="/tenants">新建租户</Link>
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-4 2xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            delta={card.delta}
            unit={card.unit}
            tone={card.tone}
            invertDelta={card.invertDelta}
            valueFormatter={card.formatter}
          />
        ))}
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartCard
          title="核心指标趋势（近 30 天）"
          description="调用量、Token 与成本的每日走势"
          className="xl:col-span-2"
          action={
            <Tabs value={trendMetric} onValueChange={(value) => setTrendMetric(value as TrendMetric)}>
              <TabsList>
                {TREND_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          }
        >
          <AreaTrendChart
            data={series}
            xKey="date"
            height={280}
            series={
              trendMetric === "calls"
                ? [{ key: "calls", name: "调用量", color: "var(--chart-1)" }]
                : trendMetric === "tokens"
                  ? [{ key: "tokens", name: "Token", color: "var(--chart-2)" }]
                  : [{ key: "cost", name: "成本（元）", color: "var(--chart-3)" }]
            }
            valueFormatter={
              trendMetric === "cost" ? (value) => formatCompactCurrency(value) : (value) => formatCompact(value)
            }
          />
        </ChartCard>

        <Card className="gap-0 py-4">
          <CardHeader className="pb-3">
            <CardTitle>平台健康分</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="font-display num text-4xl font-semibold leading-none">
                {platformHealthScore.score}
              </span>
              <Badge variant="success" className="mb-1">
                {platformHealthScore.grade} 级
              </Badge>
              <span className="text-muted-foreground mb-1 ml-auto text-2xs">
                较上周 +{platformHealthScore.deltaPercent.toFixed(1)}%
              </span>
            </div>
            <div className="space-y-2">
              {platformHealthScore.dimensions.map((dimension) => (
                <div key={dimension.name} className="space-y-1">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">{dimension.name}</span>
                    <span className="num">{dimension.score}</span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className={
                        dimension.score >= 90
                          ? "bg-emerald-500 h-full rounded-full"
                          : dimension.score >= 80
                            ? "bg-amber-500 h-full rounded-full"
                            : "bg-red-500 h-full rounded-full"
                      }
                      style={{ width: `${dimension.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-2xs">
                <span className="text-muted-foreground">本月配额消耗</span>
                <span className="num">
                  {quotaForecast.consumedPercent}% → 预计 {quotaForecast.forecastPercent}%
                </span>
              </div>
              <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${quotaForecast.consumedPercent}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1.5 text-2xs">
                剩余 {quotaForecast.daysLeft} 天，预计超额 {formatCompactCurrency(quotaForecast.projectedOverage)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="模型调用分布" description="按调用量排序的前 6 个模型">
          <BarDistributionChart
            data={modelDistribution}
            xKey="name"
            layout="vertical"
            height={260}
            series={[{ key: "value", name: "调用量", color: "var(--chart-1)" }]}
          />
        </ChartCard>
        <ChartCard title="工具调用占比" description="按调用次数统计的工具使用情况">
          <DonutChart data={toolShare} height={260} valueFormatter={(value) => formatCompact(value)} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ChartCard title="租户与用户增长" description="近 12 个月平台规模变化" className="lg:col-span-2">
          <MultiLineChart
            data={tenantGrowth}
            xKey="month"
            height={240}
            series={[
              { key: "tenants", name: "租户数", color: "var(--chart-1)" },
              { key: "users", name: "用户数", color: "var(--chart-2)" },
            ]}
          />
        </ChartCard>
        <ChartCard title="成本构成" description="本月费用拆分（元）">
          <DonutChart data={costBreakdown} height={240} valueFormatter={(value) => formatCompactCurrency(value)} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="gap-0 py-4">
          <CardHeader className="pb-3">
            <SectionHeader
              title="实时告警"
              description={`${dashboardAlerts.length} 条正在告警`}
              actions={
                <Button variant="ghost" size="xs" asChild>
                  <Link href="/alerts">全部</Link>
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 rounded-md border border-border p-2">
                <StatusBadge status={alert.severity} dot={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{alert.title}</p>
                  <p className="text-muted-foreground num text-2xs">
                    {alert.tenantName} · {formatRelativeTime(alert.triggeredAt)}
                  </p>
                </div>
                <StatusBadge status={alert.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 py-4">
          <CardHeader className="pb-3">
            <SectionHeader
              title="待审批事项"
              description={`${dashboardPendingApprovals.length} 条等待处理`}
              actions={
                <Button variant="ghost" size="xs" asChild>
                  <Link href="/approvals">全部</Link>
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardPendingApprovals.map((approval) => (
              <Link
                key={approval.id}
                href="/approvals"
                className="hover:bg-accent flex items-start gap-2 rounded-md border border-border p-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{approval.title}</p>
                  <p className="text-muted-foreground text-2xs">
                    {approval.applicant} · {label(approval.type)} · {formatRelativeTime(approval.submittedAt)}
                  </p>
                </div>
                <RiskBadge risk={approval.riskLevel} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 py-4">
          <CardHeader className="pb-3">
            <SectionHeader
              title="最近审计日志"
              description="高风险操作优先展示"
              actions={
                <Button variant="ghost" size="xs" asChild>
                  <Link href="/audit">全部</Link>
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardAuditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-2 rounded-md border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{log.actionLabel}</p>
                  <p className="text-muted-foreground truncate text-2xs">
                    {log.actorName} · {log.resourceName}
                  </p>
                  <p className="text-muted-foreground num text-2xs">{formatRelativeTime(log.at)}</p>
                </div>
                <StatusBadge status={log.result} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-3">
          <CardTitle>平台实时指标摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "成功率", value: formatPercent(metrics.successRate, 2) },
              { label: "P95 延迟", value: `${formatNumber(metrics.p95Latency)} ms` },
              { label: "今日成本", value: formatCompactCurrency(metrics.costToday) },
              { label: "今日调用", value: formatCompact(metrics.callsToday) },
              { label: "Token 消耗", value: formatCompact(metrics.tokensToday) },
              { label: "活跃 Agent", value: formatNumber(metrics.activeAgents) },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border p-3">
                <p className="text-muted-foreground text-2xs">{item.label}</p>
                <p className="font-display num mt-1 text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-2xs text-muted-foreground">
        <Receipt className="size-3.5" />
        <span>数据均为本地静态演示数据，不连接任何后端服务。</span>
        <Button
          variant="link"
          size="xs"
          className="h-auto p-0"
          onClick={() => toast.success("已生成演示用的运营周报草稿")}
        >
          生成运营周报
        </Button>
      </div>
    </PageContainer>
  );
}
