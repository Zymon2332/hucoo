"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Coins, Download, Pencil, Power, PowerOff, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailGrid, DetailRow } from "@/components/common/detail-sheet";
import { DataTable } from "@/components/common/data-table";
import { ChartCard } from "@/components/common/chart-card";
import { ServerErrorAlert } from "@/components/auth/server-error-alert";
import { MissingBlock, MissingValue, gapHint } from "@/components/tenants/missing-value";
import { TenantFormDialog } from "@/components/tenants/tenant-form-dialog";
import { useToggleTenantStatus } from "@/hooks/use-tenant-actions";
import { useTenantDetail, useTenantOverview } from "@/hooks/use-tenants";
import { describeApiError, traceIdOf } from "@/lib/api-client";
import { label } from "@/lib/labels";
import { formatCompact, formatCompactCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { isApiError } from "@/types/api";
import {
  isTenantEnabled,
  tenantExpiryState,
  tenantRowStatus,
  type TenantRow,
} from "@/types/tenant";
import type { AuditLog, CustomModel, Project, User } from "@/types";

/** 配额维度：后端暂无配额接口，保留原有 5 个维度与进度条占位。 */
const QUOTA_BUCKETS = [
  ["Token", "tokens"],
  ["调用次数", "次"],
  ["存储", "GB"],
  ["并发", "并发"],
  ["成本", "CNY"],
] as const;

const PENDING_ENDPOINTS: Record<string, string> = {
  members: "GET /api/admin/v1/users?tenantId={id}",
  projects: "GET /api/admin/v1/projects?tenantId={id}",
  models: "GET /api/admin/v1/models/custom?tenantId={id}",
  audit: "GET /api/admin/v1/audit-logs?tenantId={id}",
  usage: "GET /api/admin/v1/usage/summary?tenantId={id}",
  quota: "GET /api/admin/v1/tenants/{id}/quota",
  export: "GET /api/admin/v1/tenants/{id}/export",
  notify: "POST /api/admin/v1/tenants/{id}/renewal-notice",
};

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [formOpen, setFormOpen] = React.useState(false);

  const detailQuery = useTenantDetail(id);
  const overviewQuery = useTenantOverview(id);
  const { toggle, pending: togglePending } = useToggleTenantStatus();

  const tenant: TenantRow | undefined = detailQuery.data;
  const notFound = isApiError(detailQuery.error) && detailQuery.error.status === 404;

  const userColumns = React.useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "姓名",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "email",
        accessorKey: "email",
        header: "邮箱",
        cell: ({ row }) => <span className="text-2xs font-mono">{row.original.email}</span>,
      },
      {
        id: "roleNames",
        header: "角色",
        cell: ({ row }) => (
          <span className="text-2xs">{row.original.roleNames.join("、") || "—"}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "lastLoginAt",
        accessorKey: "lastLoginAt",
        header: "最后登录",
        cell: ({ row }) => (
          <span className="text-2xs">{formatRelativeTime(row.original.lastLoginAt)}</span>
        ),
      },
    ],
    [],
  );

  const projectColumns = React.useMemo<ColumnDef<Project, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "项目",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.type)}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "agentCount",
        accessorKey: "agentCount",
        header: "Agent",
        cell: ({ row }) => <span className="num text-xs">{row.original.agentCount}</span>,
      },
      {
        id: "budgetMonthly",
        accessorKey: "budgetMonthly",
        header: "月度预算",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.budgetMonthly)}</span>
        ),
      },
      {
        id: "spentMonthly",
        accessorKey: "spentMonthly",
        header: "已消耗",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.spentMonthly)}</span>
        ),
      },
    ],
    [],
  );

  const modelColumns = React.useMemo<ColumnDef<CustomModel, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "模型",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "accessType",
        accessorKey: "accessType",
        header: "接入方式",
        cell: ({ row }) => <Badge variant="outline">{label(row.original.accessType)}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "dataFlow",
        accessorKey: "dataFlow",
        header: "数据流向",
        cell: ({ row }) => <span className="text-2xs">{label(row.original.dataFlow)}</span>,
      },
      {
        id: "riskLevel",
        accessorKey: "riskLevel",
        header: "风险",
        cell: ({ row }) => <StatusBadge status={row.original.riskLevel} dot={false} />,
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="text-2xs">{formatRelativeTime(row.original.updatedAt)}</span>
        ),
      },
    ],
    [],
  );

  const auditColumns = React.useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        id: "at",
        accessorKey: "at",
        header: "时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.at, "MM-dd HH:mm")}</span>
        ),
      },
      {
        id: "actorName",
        accessorKey: "actorName",
        header: "操作人",
        cell: ({ row }) => <span className="text-xs">{row.original.actorName}</span>,
      },
      {
        id: "actionLabel",
        accessorKey: "actionLabel",
        header: "操作",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.actionLabel}</p>
            <p className="text-muted-foreground text-2xs font-mono">{row.original.action}</p>
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
        id: "result",
        accessorKey: "result",
        header: "结果",
        cell: ({ row }) => <StatusBadge status={row.original.result} />,
      },
    ],
    [],
  );

  if (detailQuery.isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!tenant) {
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
        {notFound ? (
          <Card className="py-10">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm font-medium">未找到该租户</p>
              <p className="text-muted-foreground text-xs">
                后端返回 404：租户不存在（可能已被删除），或链接中的 ID 不正确。
              </p>
              <p className="text-muted-foreground text-2xs font-mono">id: {id}</p>
              <Button size="sm" asChild>
                <Link href="/tenants">返回租户列表</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <ServerErrorAlert
              title="租户详情加载失败"
              message={describeApiError(detailQuery.error)}
              traceId={traceIdOf(detailQuery.error)}
            />
            <div>
              <Button variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>
                重试
              </Button>
            </div>
          </>
        )}
      </PageContainer>
    );
  }

  const expiryState = tenantExpiryState(tenant.expireAt);

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
        title={tenant.tenantName || "（未命名租户）"}
        description={`${tenant.tenantCode} · ${tenant.region ?? "区域待补齐"} · 创建于 ${
          tenant.createdAt ? formatDate(tenant.createdAt) : "—"
        }`}
        badges={
          <>
            <StatusBadge status={tenantRowStatus(tenant)} />
            {tenant.planCode ? <Badge variant="secondary">{label(tenant.planCode)}</Badge> : null}
            {expiryState === "expired" ? <Badge variant="danger">已过期</Badge> : null}
            {expiryState === "expiring" ? <Badge variant="warning">即将到期</Badge> : null}
            {(tenant.tags ?? []).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.warning(
                  `后端暂未提供报表导出接口（${PENDING_ENDPOINTS.export}），本次未导出数据`,
                )
              }
            >
              <Download />
              导出报表
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={togglePending}
              onClick={() => void toggle(tenant)}
            >
              {isTenantEnabled(tenant.status) ? <PowerOff /> : <Power />}
              {isTenantEnabled(tenant.status) ? "停用" : "启用"}
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Pencil />
              编辑租户
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="成员数"
          value={overviewQuery.data?.userCount ?? 0}
          icon={Users}
          hint="来自 GET /tenants/{id}/overview"
        />
        <StatCard
          label="项目数"
          value={tenant.projectCount ?? "—"}
          hint={tenant.projectCount == null ? gapHint("projectCount") : undefined}
        />
        <StatCard
          label="月调用量"
          value={tenant.monthlyCalls ?? "—"}
          valueFormatter={formatCompact}
          hint={tenant.monthlyCalls == null ? gapHint("monthlyCalls") : undefined}
        />
        <StatCard
          label="月 Token"
          value={tenant.monthlyTokens ?? "—"}
          valueFormatter={formatCompact}
          hint={tenant.monthlyTokens == null ? gapHint("monthlyTokens") : undefined}
        />
        <StatCard
          label="月成本"
          value={tenant.monthlyCost ?? "—"}
          valueFormatter={formatCompactCurrency}
          icon={Coins}
          tone="warning"
          hint={tenant.monthlyCost == null ? gapHint("monthlyCost") : undefined}
        />
        <StatCard label="配额消耗" value="—" unit="%" tone="info" hint={gapHint("quota")} />
      </StatCardGrid>

      {overviewQuery.isError ? (
        <ServerErrorAlert
          title="概览统计加载失败"
          message={describeApiError(overviewQuery.error)}
          traceId={traceIdOf(overviewQuery.error)}
        />
      ) : null}

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
              <MissingBlock
                className="h-[230px]"
                title="用量时序数据待接口补齐"
                hint={`${gapHint("usageSeries")}；预期接口 ${PENDING_ENDPOINTS.usage}`}
              />
            </ChartCard>
            <ChartCard title="模型调用分布" description="该租户主要使用的模型">
              <MissingBlock
                className="h-[230px]"
                title="模型分布数据待接口补齐"
                hint={`${gapHint("usageSeries")}；预期接口 ${PENDING_ENDPOINTS.usage}`}
              />
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
                  {tenant.ownerName ? (
                    `${tenant.ownerName}（${tenant.contactEmail || "—"}）`
                  ) : (
                    <span className="flex items-center gap-1">
                      <MissingValue hint={gapHint("ownerName")} />
                      <span className="text-muted-foreground text-2xs">
                        {tenant.contactEmail || "—"}
                      </span>
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="到期时间">
                  {tenant.expireAt ? (
                    <span className="num">{formatDate(tenant.expireAt)}</span>
                  ) : (
                    <MissingValue />
                  )}
                </DetailRow>
                <DetailRow label="席位使用">
                  {tenant.userCount != null && tenant.seats != null ? (
                    <span className="num">
                      {tenant.userCount} / {tenant.seats}
                    </span>
                  ) : (
                    <MissingValue hint={`${gapHint("userCount")}；${gapHint("seats")}`} />
                  )}
                </DetailRow>
                <DetailRow label="SSO">
                  {tenant.ssoEnabled == null ? (
                    <MissingValue hint={gapHint("ssoEnabled")} />
                  ) : tenant.ssoEnabled ? (
                    "已启用"
                  ) : (
                    "未启用"
                  )}
                </DetailRow>
                <DetailRow label="组织数量">
                  <span className="num">{overviewQuery.data?.organizationCount ?? 0}</span>
                </DetailRow>
                <DetailRow label="活跃成员">
                  <span className="num">{overviewQuery.data?.activeUserCount ?? 0}</span>
                </DetailRow>
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
              {QUOTA_BUCKETS.map(([quotaLabel, unit]) => (
                <div key={quotaLabel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span>{quotaLabel}</span>
                    <span className="num text-muted-foreground text-2xs">
                      <MissingValue hint={gapHint("quota")} /> / {unit}（待接口补齐）
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full" />
                </div>
              ))}
              <p className="text-muted-foreground text-2xs">
                预期接口 {PENDING_ENDPOINTS.quota}；页面保留 5 个配额维度与进度条结构。
              </p>
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
                  {enabled == null ? (
                    <MissingValue hint={gapHint("featureFlags")} />
                  ) : (
                    <StatusBadge status={enabled ? "enabled" : "disabled"} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <DataTable
            columns={userColumns}
            data={[]}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索成员姓名或邮箱…"
            pageSize={8}
            emptyTitle="成员数据待接口补齐"
            emptyDescription={`需要按租户过滤的用户列表接口（预期 ${PENDING_ENDPOINTS.members}）；概览里的成员总数已可显示。`}
          />
        </TabsContent>

        <TabsContent value="projects">
          <DataTable
            columns={projectColumns}
            data={[]}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索项目…"
            pageSize={8}
            emptyTitle="项目数据待接口补齐"
            emptyDescription={`需要按租户过滤的项目接口（预期 ${PENDING_ENDPOINTS.projects}）。`}
          />
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <DataTable
            columns={modelColumns}
            data={[]}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索自定义模型…"
            pageSize={6}
            emptyTitle="自定义模型数据待接口补齐"
            emptyDescription={`需要按租户过滤的自定义模型接口（预期 ${PENDING_ENDPOINTS.models}）。`}
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
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-xs">
                      路由规则数据待接口补齐（需要模型治理模块提供按租户命中的规则查询）。
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <DataTable
            columns={auditColumns}
            data={[]}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索审计记录…"
            pageSize={8}
            emptyTitle="审计数据待接口补齐"
            emptyDescription={`需要审计模块支持按租户检索（预期 ${PENDING_ENDPOINTS.audit}）。`}
          />
        </TabsContent>
      </Tabs>

      <TenantFormDialog open={formOpen} onOpenChange={setFormOpen} tenant={tenant} />
    </PageContainer>
  );
}
