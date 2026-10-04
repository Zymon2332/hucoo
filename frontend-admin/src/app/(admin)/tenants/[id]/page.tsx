"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Coins, Download, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailGrid, DetailRow } from "@/components/common/detail-sheet";
import { DataTable } from "@/components/common/data-table";
import { ChartCard } from "@/components/common/chart-card";
import { AreaTrendChart, DonutChart } from "@/components/charts";
import { getTenantById, organizations } from "@/lib/mock-data/tenants";
import { users } from "@/lib/mock-data/users";
import { customModels, routingRules } from "@/lib/mock-data/models";
import { auditLogs } from "@/lib/mock-data/audit";
import { dashboardSeries, modelDistribution } from "@/lib/mock-data/dashboard";
import { projects } from "@/lib/mock-data/capability";
import type { AuditLog, CustomModel, Project, User } from "@/types";
import {
  formatCompact,
  formatCompactCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
} from "@/lib/utils";
import { label } from "@/lib/labels";

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenant = getTenantById(params.id);

  const tenantUsers = React.useMemo(
    () => users.filter((user) => user.tenantId === params.id),
    [params.id],
  );
  const tenantOrgs = React.useMemo(
    () => organizations.filter((org) => org.tenantId === params.id),
    [params.id],
  );
  const tenantProjects = React.useMemo(
    () => projects.filter((project) => project.tenantId === params.id),
    [params.id],
  );
  const tenantModels = React.useMemo(
    () => customModels.filter((model) => model.tenantId === params.id),
    [params.id],
  );
  const tenantAudit = React.useMemo(
    () => auditLogs.filter((log) => log.tenantName === tenant?.name).slice(0, 20),
    [tenant?.name],
  );

  const userColumns = React.useMemo<ColumnDef<User, unknown>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "姓名", cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span> },
      { id: "email", accessorKey: "email", header: "邮箱", cell: ({ row }) => <span className="font-mono text-2xs">{row.original.email}</span> },
      { id: "roleNames", header: "角色", cell: ({ row }) => <span className="text-2xs">{row.original.roleNames.join("、") || "—"}</span> },
      { id: "status", accessorKey: "status", header: "状态", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "lastLoginAt", accessorKey: "lastLoginAt", header: "最后登录", cell: ({ row }) => <span className="text-2xs">{formatRelativeTime(row.original.lastLoginAt)}</span> },
    ],
    [],
  );

  const projectColumns = React.useMemo<ColumnDef<Project, unknown>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "项目", cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span> },
      { id: "type", accessorKey: "type", header: "类型", cell: ({ row }) => <Badge variant="secondary">{label(row.original.type)}</Badge> },
      { id: "status", accessorKey: "status", header: "状态", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "agentCount", accessorKey: "agentCount", header: "Agent", cell: ({ row }) => <span className="num text-xs">{row.original.agentCount}</span> },
      { id: "budgetMonthly", accessorKey: "budgetMonthly", header: "月度预算", cell: ({ row }) => <span className="num text-xs">{formatCompactCurrency(row.original.budgetMonthly)}</span> },
      { id: "spentMonthly", accessorKey: "spentMonthly", header: "已消耗", cell: ({ row }) => <span className="num text-xs">{formatCompactCurrency(row.original.spentMonthly)}</span> },
    ],
    [],
  );

  const modelColumns = React.useMemo<ColumnDef<CustomModel, unknown>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "模型", cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span> },
      { id: "accessType", accessorKey: "accessType", header: "接入方式", cell: ({ row }) => <Badge variant="outline">{label(row.original.accessType)}</Badge> },
      { id: "status", accessorKey: "status", header: "状态", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "dataFlow", accessorKey: "dataFlow", header: "数据流向", cell: ({ row }) => <span className="text-2xs">{label(row.original.dataFlow)}</span> },
      { id: "riskLevel", accessorKey: "riskLevel", header: "风险", cell: ({ row }) => <StatusBadge status={row.original.riskLevel} dot={false} /> },
      { id: "updatedAt", accessorKey: "updatedAt", header: "更新时间", cell: ({ row }) => <span className="text-2xs">{formatRelativeTime(row.original.updatedAt)}</span> },
    ],
    [],
  );

  const auditColumns = React.useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      { id: "at", accessorKey: "at", header: "时间", cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.at, "MM-dd HH:mm")}</span> },
      { id: "actorName", accessorKey: "actorName", header: "操作人", cell: ({ row }) => <span className="text-xs">{row.original.actorName}</span> },
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
      { id: "resourceName", accessorKey: "resourceName", header: "对象", cell: ({ row }) => <span className="text-2xs">{row.original.resourceName}</span> },
      { id: "result", accessorKey: "result", header: "结果", cell: ({ row }) => <StatusBadge status={row.original.result} /> },
    ],
    [],
  );

  if (!tenant) {
    return (
      <PageContainer>
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium">未找到该租户</p>
            <p className="text-muted-foreground text-xs">租户可能已被删除，或链接不正确。</p>
            <Button size="sm" asChild>
              <Link href="/tenants">返回租户列表</Link>
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="xs" asChild>
          <Link href="/tenants">
            <ArrowLeft />
            返回列表
          </Link>
        </Button>
      </div>

      <PageHeader
        title={tenant.name}
        description={`${tenant.slug} · ${tenant.region} · 创建于 ${formatDate(tenant.createdAt)}`}
        badges={
          <>
            <StatusBadge status={tenant.status} />
            <Badge variant="secondary">{label(tenant.plan)}</Badge>
            {tenant.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.success("已导出该租户的用量报表（演示）")}>
              <Download />
              导出报表
            </Button>
            <Button size="sm" onClick={() => toast.info("演示环境：编辑入口已打开")}>
              <Pencil />
              编辑租户
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="成员数" value={tenant.userCount} icon={Users} delta={4.2} />
        <StatCard label="项目数" value={tenant.projectCount} hint={`${tenant.agentCount} 个 Agent`} />
        <StatCard label="月调用量" value={tenant.monthlyCalls} valueFormatter={formatCompact} delta={8.4} />
        <StatCard label="月 Token" value={tenant.monthlyTokens} valueFormatter={formatCompact} delta={-3.2} invertDelta />
        <StatCard label="月成本" value={tenant.monthlyCost} valueFormatter={(value) => formatCompactCurrency(value)} icon={Coins} tone="warning" />
        <StatCard
          label="配额消耗"
          value={Math.round((tenant.quota.cost.used / tenant.quota.cost.limit) * 100)}
          unit="%"
          tone="info"
          hint="成本配额口径"
        />
      </StatCardGrid>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="quota">配额</TabsTrigger>
          <TabsTrigger value="members">成员</TabsTrigger>
          <TabsTrigger value="projects">项目</TabsTrigger>
          <TabsTrigger value="models">模型策略</TabsTrigger>
          <TabsTrigger value="audit">审计</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="调用趋势（近 30 天）" description="租户侧调用量与成本走势">
              <AreaTrendChart
                data={dashboardSeries.slice(-14)}
                xKey="date"
                height={230}
                series={[{ key: "calls", name: "调用量", color: "var(--chart-1)" }]}
              />
            </ChartCard>
            <ChartCard title="模型调用分布" description="该租户主要使用的模型">
              <DonutChart data={modelDistribution.slice(0, 5)} height={230} valueFormatter={formatCompact} />
            </ChartCard>
          </div>
          <Card className="gap-0 py-4">
            <CardHeader className="pb-2">
              <CardTitle>租户档案</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailGrid columns={3}>
                <DetailRow label="租户 ID" mono>
                  {tenant.id}
                </DetailRow>
                <DetailRow label="负责人">
                  {tenant.ownerName}（{tenant.ownerEmail}）
                </DetailRow>
                <DetailRow label="到期时间">{formatDate(tenant.expiresAt)}</DetailRow>
                <DetailRow label="席位使用">
                  {tenant.userCount} / {tenant.seats}
                </DetailRow>
                <DetailRow label="SSO">{tenant.ssoEnabled ? "已启用" : "未启用"}</DetailRow>
                <DetailRow label="组织数量">{tenantOrgs.length} 个</DetailRow>
              </DetailGrid>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quota" className="space-y-3">
          <Card className="gap-0 py-4">
            <CardHeader className="pb-2">
              <CardTitle>配额明细</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["Token", tenant.quota.tokens],
                  ["调用次数", tenant.quota.calls],
                  ["存储", tenant.quota.storage],
                  ["并发", tenant.quota.concurrency],
                  ["成本", tenant.quota.cost],
                ] as const
              ).map(([quotaLabel, bucket]) => {
                const percent = Math.min(100, Math.round((bucket.used / bucket.limit) * 100));
                return (
                  <div key={quotaLabel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span>{quotaLabel}</span>
                      <span className="num text-2xs text-muted-foreground">
                        {formatNumber(bucket.used)} / {formatNumber(bucket.limit)} {bucket.unit}（{percent}%）
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className={
                          percent >= 90 ? "bg-red-500 h-full" : percent >= 70 ? "bg-amber-500 h-full" : "bg-emerald-500 h-full"
                        }
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(
              [
                ["允许自定义模型", tenant.allowCustomModels],
                ["允许 BYOK", tenant.allowByok],
                ["允许本地模型", tenant.allowLocalModels],
                ["允许共享模型", tenant.allowSharedModels],
              ] as const
            ).map(([flagLabel, enabled]) => (
              <Card key={flagLabel} className="gap-0 py-3">
                <CardContent className="flex items-center justify-between text-xs">
                  {flagLabel}
                  <StatusBadge status={enabled ? "enabled" : "disabled"} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <DataTable
            columns={userColumns}
            data={tenantUsers}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索成员姓名或邮箱…"
            pageSize={8}
            emptyTitle="该租户暂无成员"
          />
        </TabsContent>

        <TabsContent value="projects">
          <DataTable
            columns={projectColumns}
            data={tenantProjects}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索项目…"
            pageSize={8}
            emptyTitle="该租户暂无项目"
          />
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <DataTable
            columns={modelColumns}
            data={tenantModels}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索自定义模型…"
            pageSize={6}
            emptyTitle="该租户没有自定义模型"
          />
          <Card className="gap-0 py-4">
            <CardHeader className="pb-2">
              <CardTitle>命中的路由规则</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>规则</TableHead>
                    <TableHead>策略</TableHead>
                    <TableHead>主模型</TableHead>
                    <TableHead>兜底</TableHead>
                    <TableHead>降级费用归属</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routingRules.slice(0, 5).map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="text-xs">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{label(rule.strategy)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-2xs">{rule.primaryModel}</TableCell>
                      <TableCell className="font-mono text-2xs">{rule.fallbackModels.join(", ")}</TableCell>
                      <TableCell className="text-2xs">{label(rule.costOwnerOnFallback)}</TableCell>
                      <TableCell>
                        <StatusBadge status={rule.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <DataTable
            columns={auditColumns}
            data={tenantAudit}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索审计记录…"
            pageSize={8}
            emptyTitle="暂无审计记录"
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
