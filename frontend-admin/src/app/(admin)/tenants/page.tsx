"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Download,
  Filter,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DetailGrid,
  DetailRow,
  DetailSection,
  DetailSheet,
} from "@/components/common/detail-sheet";
import { ServerErrorAlert } from "@/components/auth/server-error-alert";
import { MissingBlock, MissingValue, gapHint } from "@/components/tenants/missing-value";
import { TenantFormDialog } from "@/components/tenants/tenant-form-dialog";
import { useBulkTenantStatus, useToggleTenantStatus } from "@/hooks/use-tenant-actions";
import {
  useCreateTenant,
  useDeleteTenant,
  useTenantOverview,
  useTenantPage,
  useTenantStatistics,
} from "@/hooks/use-tenants";
import { describeApiError, traceIdOf } from "@/lib/api-client";
import { LABELS, label } from "@/lib/labels";
import { REGION_OPTIONS, exportTenantsCsv, toUpdateRequest } from "@/lib/tenants";
import { cn, formatCompact, formatCompactCurrency, formatDate } from "@/lib/utils";
import {
  TENANT_STATUS_DISABLED,
  isTenantEnabled,
  tenantExpiryState,
  tenantRowStatus,
  type TenantRow,
} from "@/types/tenant";

const PLAN_OPTIONS = Object.entries(LABELS)
  .filter(([key]) => ["free", "team", "business", "enterprise"].includes(key))
  .map(([value, labelText]) => ({ value, label: labelText }));

const STATUS_FILTER_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "trial", label: "试用中" },
  { value: "suspended", label: "已暂停" },
  { value: "expired", label: "已过期" },
  { value: "provisioning", label: "开通中" },
];

export default function TenantsPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [regionFilter, setRegionFilter] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailTenant, setDetailTenant] = React.useState<TenantRow | null>(null);
  const [editingTenant, setEditingTenant] = React.useState<TenantRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TenantRow | null>(null);

  const params = React.useMemo(
    () => ({ page, pageSize, keyword: keyword || undefined }),
    [page, pageSize, keyword],
  );

  const pageQuery = useTenantPage(params);
  const statisticsQuery = useTenantStatistics();
  const overviewQuery = useTenantOverview(detailTenant?.id, detailTenant !== null);

  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();
  const { toggle } = useToggleTenantStatus();
  const bulkStatus = useBulkTenantStatus();

  const tenantList = React.useMemo<TenantRow[]>(
    () => (pageQuery.data?.items ?? []).map((item) => ({ ...item })),
    [pageQuery.data],
  );
  const total = pageQuery.data?.total ?? 0;

  // 搜索防抖 300ms；关键字变化回到第 1 页
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // 删除后当前页可能为空，回退一页
  React.useEffect(() => {
    if (!pageQuery.isFetching && page > 1 && pageQuery.data && pageQuery.data.items.length === 0) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [page, pageQuery.isFetching, pageQuery.data]);

  /**
   * 套餐 / 状态 / 区域筛选暂在**当前分页**内生效：
   * 后端 `TenantQueryRequest` 目前只有 page / pageSize / keyword，
   * 等后端补上 planCode / status / region 查询参数后，这里改成透传即可。
   */
  const filtered = React.useMemo(
    () =>
      tenantList.filter(
        (tenant) =>
          (planFilter === "all" || tenant.planCode === planFilter) &&
          (statusFilter === "all" || tenantRowStatus(tenant) === statusFilter) &&
          (regionFilter === "all" || tenant.region === regionFilter),
      ),
    [tenantList, planFilter, statusFilter, regionFilter],
  );

  const activeFilterCount = [planFilter, statusFilter, regionFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const active = tenantList.filter((tenant) => tenantRowStatus(tenant) === "active").length;
    const risk = tenantList.filter((tenant) => {
      const status = tenantRowStatus(tenant);
      return status === "suspended" || status === "expired";
    }).length;
    return { active, risk };
  }, [tenantList]);

  const duplicateTenant = async (tenant: TenantRow) => {
    const payload = toUpdateRequest(tenant);
    if (!payload) {
      toast.error("该租户缺少编码/名称/套餐等必填字段，无法复制");
      return;
    }
    try {
      await createTenant.mutateAsync({
        ...payload,
        tenantCode: `${payload.tenantCode}-COPY`,
        tenantName: `${payload.tenantName}（副本）`,
      });
      toast.success("已复制租户配置");
    } catch (error) {
      toast.error(describeApiError(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTenant.mutateAsync(deleteTarget.id);
      toast.success(`已删除租户「${deleteTarget.tenantName}」`);
      if (detailTenant?.id === deleteTarget.id) setDetailTenant(null);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(describeApiError(error));
    }
  };

  const columns = React.useMemo<ColumnDef<TenantRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/tenants/${row.original.id}`}
              className="hover:text-primary text-xs font-medium transition-colors"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.tenantName || "（未命名）"}
            </Link>
            <p className="text-muted-foreground text-2xs font-mono">{row.original.tenantCode}</p>
          </div>
        ),
      },
      {
        id: "plan",
        accessorKey: "planCode",
        header: "套餐",
        cell: ({ row }) =>
          row.original.planCode ? (
            <Badge variant="secondary">{label(row.original.planCode)}</Badge>
          ) : (
            <MissingValue />
          ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={tenantRowStatus(row.original)} />,
      },
      {
        id: "region",
        accessorKey: "region",
        header: "区域",
        cell: ({ row }) =>
          row.original.region ? (
            <span className="text-2xs">{row.original.region}</span>
          ) : (
            <MissingValue hint={gapHint("region")} />
          ),
      },
      {
        id: "ownerName",
        accessorKey: "ownerName",
        header: "负责人",
        cell: ({ row }) => (
          <div className="min-w-0">
            {row.original.ownerName ? (
              <p className="text-xs">{row.original.ownerName}</p>
            ) : (
              <MissingValue hint={gapHint("ownerName")} />
            )}
            <p className="text-muted-foreground text-2xs truncate">
              {row.original.contactEmail || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "userCount",
        accessorKey: "userCount",
        header: "成员",
        cell: ({ row }) =>
          row.original.userCount != null && row.original.seats != null ? (
            <span className="num text-xs">
              {row.original.userCount} / {row.original.seats}
            </span>
          ) : (
            <MissingValue hint={`${gapHint("userCount")}；${gapHint("seats")}`} />
          ),
      },
      {
        id: "monthlyCalls",
        accessorKey: "monthlyCalls",
        header: "月调用量",
        cell: ({ row }) =>
          row.original.monthlyCalls != null ? (
            <span className="num text-xs">{formatCompact(row.original.monthlyCalls)}</span>
          ) : (
            <MissingValue hint={gapHint("monthlyCalls")} />
          ),
      },
      {
        id: "monthlyCost",
        accessorKey: "monthlyCost",
        header: "月成本",
        cell: ({ row }) =>
          row.original.monthlyCost != null ? (
            <span className="num text-xs">{formatCompactCurrency(row.original.monthlyCost)}</span>
          ) : (
            <MissingValue hint={gapHint("monthlyCost")} />
          ),
      },
      {
        id: "expiresAt",
        accessorKey: "expireAt",
        header: "到期时间",
        cell: ({ row }) => {
          if (!row.original.expireAt) return <MissingValue />;
          const state = tenantExpiryState(row.original.expireAt);
          return (
            <span
              className={cn(
                "num text-2xs",
                state === "expired" && "text-destructive",
                state === "expiring" && "text-amber-600 dark:text-amber-400",
              )}
            >
              {formatDate(row.original.expireAt, "yyyy-MM-dd")}
            </span>
          );
        },
      },
      {
        id: "flags",
        header: "租户开关",
        enableSorting: false,
        cell: ({ row }) => {
          const flags = [
            row.original.allowCustomModels ? "自定义" : null,
            row.original.allowByok ? "BYOK" : null,
            row.original.allowLocalModels ? "本地" : null,
            row.original.allowSharedModels ? "共享" : null,
          ].filter((item): item is string => item !== null);
          if (flags.length === 0) return <MissingValue hint={gapHint("featureFlags")} />;
          return (
            <div className="flex items-center gap-1">
              {flags.map((flag) => (
                <Badge key={flag} variant="outline">
                  {flag}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailTenant(row.original)}
            onEdit={() => setEditingTenant(row.original)}
            onDuplicate={() => void duplicateTenant(row.original)}
            onToggleStatus={() => void toggle(row.original)}
            statusActive={isTenantEnabled(row.original.status)}
            onDelete={() => setDeleteTarget(row.original)}
          />
        ),
      },
    ],
    // toggle / duplicateTenant 每次渲染都是新引用，仅用于单元格回调渲染
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggle],
  );

  return (
    <PageContainer>
      <PageHeader
        title="租户管理"
        description="数据来自后端 /api/admin/v1/tenants：分页、按租户编码搜索与增删改查已接入；标「—」的字段是后端 DTO 暂未提供，页面元素保留待接口补齐。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={() => {
                exportTenantsCsv(filtered);
                toast.success(`已导出当前页 ${filtered.length} 条租户数据`);
              }}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus />
              新建租户
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="租户总数"
          value={statisticsQuery.data?.total ?? 0}
          icon={Building2}
          hint="来自 GET /tenants/statistics"
        />
        <StatCard
          label="正常租户"
          value={stats.active}
          icon={ShieldCheck}
          tone="success"
          hint="按当前分页统计，后端暂无服务期口径"
        />
        <StatCard
          label="试用中"
          value="—"
          icon={Filter}
          tone="info"
          hint={gapHint("statusDetail")}
        />
        <StatCard
          label="风险租户"
          value={stats.risk}
          icon={TriangleAlert}
          tone="danger"
          hint="当前分页内已暂停或已过期"
        />
        <StatCard label="覆盖成员" value="—" icon={Users} hint={gapHint("statistics")} />
        <StatCard label="月度成本" value="—" tone="warning" hint={gapHint("statistics")} />
      </StatCardGrid>

      {pageQuery.isError ? (
        <ServerErrorAlert
          title="租户列表加载失败"
          message={describeApiError(pageQuery.error)}
          traceId={traceIdOf(pageQuery.error)}
        />
      ) : null}

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setPlanFilter("all");
          setStatusFilter("all");
          setRegionFilter("all");
        }}
      >
        <FilterSelect
          label="套餐"
          value={planFilter}
          onChange={setPlanFilter}
          options={PLAN_OPTIONS}
        />
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTER_OPTIONS}
        />
        <FilterSelect
          label="区域"
          value={regionFilter}
          onChange={setRegionFilter}
          options={REGION_OPTIONS}
        />
      </FilterBar>
      <p className="text-muted-foreground text-2xs">
        套餐 / 状态 / 区域筛选目前只作用于当前分页：后端 TenantQueryRequest 只支持
        page、pageSize、keyword；区域字段后端未提供，选中后列表为空属预期。
      </p>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={pageQuery.isPending}
        getRowId={(row) => row.id}
        searchPlaceholder="按租户编码搜索（后端仅匹配 tenant_code）…"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
        enableRowSelection
        onRowClick={(row) => setDetailTenant(row)}
        bulkActions={(rows, clear) => (
          <>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                toast.warning("后端暂未提供续费提醒接口（缺口已记录），本次未发送任何通知")
              }
            >
              通知续费
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-destructive"
              disabled={bulkStatus.pending}
              onClick={() => {
                void bulkStatus.apply(rows, TENANT_STATUS_DISABLED).then(clear);
              }}
            >
              <Trash2 />
              批量暂停
            </Button>
          </>
        )}
        emptyTitle={keyword ? "没有匹配的租户编码" : "没有符合条件的租户"}
        emptyDescription={
          keyword
            ? `后端只按 tenant_code 模糊匹配，没有找到包含「${keyword}」的租户。`
            : "当前数据库还没有租户数据，可以先创建一条。"
        }
        emptyAction={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus />
            新建租户
          </Button>
        }
      />

      <TenantFormDialog
        open={formOpen || editingTenant !== null}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTenant(null);
        }}
        tenant={editingTenant}
      />

      <DetailSheet
        open={detailTenant !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTenant(null);
        }}
        title={detailTenant?.tenantName ?? "租户详情"}
        description={detailTenant?.tenantCode}
        footer={
          detailTenant ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tenants/${detailTenant.id}`}>打开完整详情页</Link>
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingTenant(detailTenant)}>
                  编辑
                </Button>
                <Button size="sm" onClick={() => void toggle(detailTenant)}>
                  {isTenantEnabled(detailTenant.status) ? "暂停服务" : "恢复服务"}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailTenant ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={tenantRowStatus(detailTenant)} />
              {detailTenant.planCode ? (
                <Badge variant="secondary">{label(detailTenant.planCode)}</Badge>
              ) : null}
              {(detailTenant.tags ?? []).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="租户 ID" mono>
                  {detailTenant.id}
                </DetailRow>
                <DetailRow label="创建时间">
                  {detailTenant.createdAt
                    ? formatDate(detailTenant.createdAt, "yyyy-MM-dd HH:mm")
                    : "—"}
                </DetailRow>
                <DetailRow label="负责人">
                  {detailTenant.ownerName ? (
                    `${detailTenant.ownerName}（${detailTenant.contactEmail || "—"}）`
                  ) : (
                    <span className="flex items-center gap-1">
                      <MissingValue hint={gapHint("ownerName")} />
                      <span className="text-muted-foreground text-2xs">
                        {detailTenant.contactEmail || "—"}
                      </span>
                    </span>
                  )}
                </DetailRow>
                <DetailRow label="到期时间">
                  {detailTenant.expireAt ? (
                    <span className="num">{formatDate(detailTenant.expireAt, "yyyy-MM-dd")}</span>
                  ) : (
                    <MissingValue />
                  )}
                </DetailRow>
                <DetailRow label="席位使用">
                  {detailTenant.userCount != null && detailTenant.seats != null ? (
                    <span className="num">
                      {detailTenant.userCount} / {detailTenant.seats}
                    </span>
                  ) : (
                    <MissingValue hint={`${gapHint("userCount")}；${gapHint("seats")}`} />
                  )}
                </DetailRow>
                <DetailRow label="SSO">
                  {detailTenant.ssoEnabled == null ? (
                    <MissingValue hint={gapHint("ssoEnabled")} />
                  ) : detailTenant.ssoEnabled ? (
                    "已启用"
                  ) : (
                    "未启用"
                  )}
                </DetailRow>
                <DetailRow label="组织数量">
                  <span className="num">{overviewQuery.data?.organizationCount ?? 0}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="用量概览">
              <DetailGrid>
                <DetailRow label="月调用量">
                  {detailTenant.monthlyCalls != null ? (
                    <span className="num">{formatCompact(detailTenant.monthlyCalls)}</span>
                  ) : (
                    <MissingValue hint={gapHint("monthlyCalls")} />
                  )}
                </DetailRow>
                <DetailRow label="月 Token">
                  {detailTenant.monthlyTokens != null ? (
                    <span className="num">{formatCompact(detailTenant.monthlyTokens)}</span>
                  ) : (
                    <MissingValue hint={gapHint("monthlyTokens")} />
                  )}
                </DetailRow>
                <DetailRow label="月成本">
                  {detailTenant.monthlyCost != null ? (
                    <span className="num">{formatCompactCurrency(detailTenant.monthlyCost)}</span>
                  ) : (
                    <MissingValue hint={gapHint("monthlyCost")} />
                  )}
                </DetailRow>
                <DetailRow label="项目 / Agent">
                  {detailTenant.projectCount != null && detailTenant.agentCount != null ? (
                    <span className="num">
                      {detailTenant.projectCount} / {detailTenant.agentCount}
                    </span>
                  ) : (
                    <MissingValue hint={`${gapHint("projectCount")}；${gapHint("agentCount")}`} />
                  )}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="配额使用" description="超出配额后调用会被限流，并触发超支告警">
              <MissingBlock
                title="配额数据待接口补齐"
                hint={`${gapHint("quota")}；页面保留该区块，接口就绪后恢复进度条。`}
              />
            </DetailSection>

            <DetailSection title="租户级功能开关">
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["允许自定义模型", detailTenant.allowCustomModels],
                    ["允许 BYOK", detailTenant.allowByok],
                    ["允许本地模型", detailTenant.allowLocalModels],
                    ["允许共享模型", detailTenant.allowSharedModels],
                  ] as const
                ).map(([flagLabel, enabled]) => (
                  <div
                    key={flagLabel}
                    className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                  >
                    {flagLabel}
                    {enabled == null ? (
                      <MissingValue hint={gapHint("featureFlags")} />
                    ) : (
                      <StatusBadge status={enabled ? "enabled" : "disabled"} />
                    )}
                  </div>
                ))}
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
        title={`删除租户「${deleteTarget?.tenantName ?? ""}」？`}
        description="后端执行逻辑删除（ap_tenant.deleted = 1）后，该租户不再出现在列表与详情接口中；成员、项目等数据不会被级联清理。"
        confirmLabel="确认删除"
        loading={deleteTenant.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </PageContainer>
  );
}
