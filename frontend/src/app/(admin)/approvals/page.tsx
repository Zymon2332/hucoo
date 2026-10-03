"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Hourglass,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge, RiskBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { approvals as approvalSeed } from "@/lib/mock-data/approvals";
import type { Approval, ApprovalStatus, ApprovalType } from "@/types";
import { formatCurrency, formatDate, formatPercent, formatRelativeTime } from "@/lib/utils";
import { label } from "@/lib/labels";

const NOW = Date.parse("2026-09-17T09:30:00+08:00");

const APPROVAL_TYPES: ApprovalType[] = [
  "model-onboarding",
  "production-access",
  "sensitive-tool",
  "high-spend",
  "temp-permission",
  "tool-registration",
  "agent-publish",
];

const RISK_OPTIONS = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
  { value: "critical", label: "严重风险" },
];

const STATUS_OPTIONS: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "escalated", label: "已升级" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
  { value: "cancelled", label: "已取消" },
];

const TABS: { value: "pending" | "approved" | "rejected" | "all"; label: string }[] = [
  { value: "pending", label: "待处理" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
  { value: "all", label: "全部" },
];

const rejectSchema = z.object({
  reason: z.string().min(5, "请填写不少于 5 个字的拒绝理由").max(200, "拒绝理由过长"),
});

type RejectFormValues = z.infer<typeof rejectSchema>;

function isAwaiting(status: ApprovalStatus): boolean {
  return status === "pending" || status === "escalated";
}

function slaInfo(approval: Approval): { text: string; overdue: boolean } {
  if (!isAwaiting(approval.status)) return { text: "—", overdue: false };
  const diff = Date.parse(approval.slaDueAt) - NOW;
  if (diff < 0) {
    const hours = Math.floor(-diff / 3_600_000);
    const minutes = Math.floor((-diff % 3_600_000) / 60_000);
    return { text: `已超时 ${hours} 小时 ${minutes} 分`, overdue: true };
  }
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { text: `剩余 ${hours} 小时 ${minutes} 分`, overdue: false };
}

export default function ApprovalsPage() {
  const [approvalList, setApprovalList] = React.useState<Approval[]>(approvalSeed);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<Approval | null>(null);

  const rejectForm = useForm<RejectFormValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  const detailApproval = React.useMemo(
    () => approvalList.find((approval) => approval.id === detailId) ?? null,
    [approvalList, detailId],
  );

  const tenantOptions = React.useMemo(
    () =>
      Array.from(new Set(approvalList.map((approval) => approval.tenantId))).map((id) => ({
        value: id,
        label: approvalList.find((approval) => approval.tenantId === id)?.tenantName ?? id,
      })),
    [approvalList],
  );

  const filtered = React.useMemo(
    () =>
      approvalList.filter(
        (approval) =>
          (typeFilter === "all" || approval.type === typeFilter) &&
          (riskFilter === "all" || approval.riskLevel === riskFilter) &&
          (statusFilter === "all" || approval.status === statusFilter) &&
          (tenantFilter === "all" || approval.tenantId === tenantFilter),
      ),
    [approvalList, typeFilter, riskFilter, statusFilter, tenantFilter],
  );

  const activeFilterCount = [typeFilter, riskFilter, statusFilter, tenantFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const pending = approvalList.filter((approval) => isAwaiting(approval.status)).length;
    const today = approvalList.filter(
      (approval) => formatDate(approval.submittedAt) === "2026-09-17",
    ).length;
    const overdue = approvalList.filter(
      (approval) => isAwaiting(approval.status) && Date.parse(approval.slaDueAt) < NOW,
    ).length;
    const decided = approvalList.filter(
      (approval) => approval.status === "approved" || approval.status === "rejected",
    );
    const approved = decided.filter((approval) => approval.status === "approved").length;
    const passRate = decided.length > 0 ? (approved / decided.length) * 100 : 0;

    const durations = approvalList.flatMap((approval) => {
      const decidedStep = approval.chain.find((step) => step.decidedAt !== null);
      if (!decidedStep?.decidedAt) return [];
      return [Date.parse(decidedStep.decidedAt) - Date.parse(approval.submittedAt)];
    });
    const avgHours =
      durations.length > 0
        ? durations.reduce((total, value) => total + value, 0) / durations.length / 3_600_000
        : 0;

    return { pending, today, overdue, passRate, avgHours };
  }, [approvalList]);

  const approve = (approval: Approval) => {
    setApprovalList((list) =>
      list.map((item) =>
        item.id === approval.id
          ? {
              ...item,
              status: "approved",
              currentStep: item.chain.length,
              chain: item.chain.map((step) =>
                step.status === "pending"
                  ? { ...step, status: "approved", decidedAt: new Date(NOW).toISOString(), comment: step.comment ?? "审批通过" }
                  : step,
              ),
            }
          : item,
      ),
    );
    toast.success(`已通过「${approval.title}」`);
  };

  const confirmReject = (values: RejectFormValues) => {
    if (!rejectTarget) return;
    setApprovalList((list) =>
      list.map((item) => {
        if (item.id !== rejectTarget.id) return item;
        let rejected = false;
        const chain = item.chain.map((step) => {
          if (!rejected && step.status === "pending") {
            rejected = true;
            return {
              ...step,
              status: "rejected" as const,
              decidedAt: new Date(NOW).toISOString(),
              comment: values.reason,
            };
          }
          return step;
        });
        return { ...item, status: "rejected" as const, chain };
      }),
    );
    toast.success(`已拒绝「${rejectTarget.title}」`);
    setRejectTarget(null);
    rejectForm.reset();
  };

  const columns = React.useMemo<ColumnDef<Approval, unknown>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: "单号",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.code}</span>,
      },
      {
        id: "title",
        accessorKey: "title",
        header: "标题",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[18rem]">
            <p className="truncate text-xs font-medium">{row.original.title}</p>
            <p className="text-muted-foreground truncate text-2xs">
              {row.original.targetType} · {row.original.targetName}
            </p>
          </div>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.type)}</Badge>,
      },
      {
        id: "applicant",
        accessorKey: "applicant",
        header: "申请人",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.applicant}</p>
            <p className="text-muted-foreground truncate text-2xs">{row.original.tenantName}</p>
          </div>
        ),
      },
      {
        id: "riskLevel",
        accessorKey: "riskLevel",
        header: "风险",
        cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} />,
      },
      {
        id: "submittedAt",
        accessorKey: "submittedAt",
        header: "提交时间",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.submittedAt, "MM-dd HH:mm")}</span>,
      },
      {
        id: "sla",
        header: "SLA 倒计时",
        enableSorting: false,
        cell: ({ row }) => {
          const info = slaInfo(row.original);
          return (
            <span className={info.overdue ? "num text-2xs font-medium text-red-600 dark:text-red-400" : "num text-2xs"}>
              {info.text}
            </span>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailId(row.original.id)}
            extraItems={
              isAwaiting(row.original.status)
                ? [
                    { label: "通过", onSelect: () => approve(row.original) },
                    { label: "拒绝", onSelect: () => setRejectTarget(row.original), destructive: true },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [],
  );

  const renderApprovalTable = (rows: Approval[]) => (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      searchPlaceholder="搜索单号、标题、申请人…"
      enableRowSelection
      onRowClick={(row) => setDetailId(row.id)}
      bulkActions={(selected, clear) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            const lowRisk = selected.filter(
              (approval) => isAwaiting(approval.status) && approval.riskLevel === "low",
            );
            if (lowRisk.length === 0) {
              toast.warning("所选记录中没有可批量通过的低风险项");
              return;
            }
            setApprovalList((list) =>
              list.map((item) =>
                lowRisk.some((approval) => approval.id === item.id)
                  ? {
                      ...item,
                      status: "approved",
                      currentStep: item.chain.length,
                      chain: item.chain.map((step) =>
                        step.status === "pending"
                          ? {
                              ...step,
                              status: "approved",
                              decidedAt: new Date(NOW).toISOString(),
                              comment: step.comment ?? "批量通过",
                            }
                          : step,
                      ),
                    }
                  : item,
              ),
            );
            const skipped = selected.length - lowRisk.length;
            toast.success(`已批量通过 ${lowRisk.length} 条低风险申请${skipped > 0 ? `，跳过 ${skipped} 条` : ""}`);
            clear();
          }}
        >
          批量通过（低风险）
        </Button>
      )}
      emptyTitle="没有符合条件的审批"
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title="审批中心"
        description="集中处理模型接入、生产权限、敏感工具、大额消耗等审批请求，跟踪 SLA 与审批链。"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success(`已导出 ${filtered.length} 条审批记录（演示）`)}
          >
            导出
          </Button>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="待审批" value={stats.pending} icon={Hourglass} tone="warning" hint="含已升级事项" />
        <StatCard label="今日新增" value={stats.today} icon={TrendingUp} tone="info" />
        <StatCard
          label="平均处理时长"
          value={stats.avgHours}
          unit="小时"
          icon={Clock}
          valueFormatter={(value) => value.toFixed(1)}
        />
        <StatCard
          label="超时未处理"
          value={stats.overdue}
          icon={XCircle}
          tone={stats.overdue > 0 ? "danger" : "success"}
          hint="已超过 SLA 时限"
        />
        <StatCard
          label="本月通过率"
          value={stats.passRate}
          unit="%"
          icon={BadgeCheck}
          tone="success"
          valueFormatter={(value) => formatPercent(value, 1)}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTypeFilter("all");
          setRiskFilter("all");
          setStatusFilter("all");
          setTenantFilter("all");
        }}
      >
        <FilterSelect
          label="类型"
          value={typeFilter}
          onChange={setTypeFilter}
          options={APPROVAL_TYPES.map((type) => ({ value: type, label: label(type) }))}
        />
        <FilterSelect label="风险" value={riskFilter} onChange={setRiskFilter} options={RISK_OPTIONS} />
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
        />
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
      </FilterBar>

      <Tabs defaultValue="pending">
        <TabsList className="flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => {
          const rows =
            tab.value === "all"
              ? filtered
              : tab.value === "rejected"
                ? filtered.filter((approval) => approval.status === "rejected" || approval.status === "cancelled")
                : tab.value === "approved"
                  ? filtered.filter((approval) => approval.status === "approved")
                  : filtered.filter((approval) => isAwaiting(approval.status));
          return (
            <TabsContent key={tab.value} value={tab.value}>
              {renderApprovalTable(rows)}
            </TabsContent>
          );
        })}
      </Tabs>

      <DetailSheet
        open={detailApproval !== null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        title={detailApproval?.title ?? "审批详情"}
        description={detailApproval ? `${detailApproval.code} · ${label(detailApproval.type)}` : undefined}
        className="sm:max-w-3xl"
        footer={
          detailApproval && isAwaiting(detailApproval.status) ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setRejectTarget(detailApproval)}
              >
                <XCircle />
                拒绝
              </Button>
              <Button variant="success" size="sm" onClick={() => approve(detailApproval)}>
                <CheckCircle2 />
                通过
              </Button>
            </div>
          ) : detailApproval ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailApproval.status} />
              <span className="text-muted-foreground num text-2xs">审批链已结束</span>
            </div>
          ) : null
        }
      >
        {detailApproval ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailApproval.status} />
              <RiskBadge risk={detailApproval.riskLevel} />
              <Badge variant="secondary">{label(detailApproval.type)}</Badge>
              <Badge variant="outline">{detailApproval.targetType}</Badge>
            </div>

            {detailApproval.riskLevel === "high" || detailApproval.riskLevel === "critical" ? (
              <Alert variant="destructive">
                <XCircle />
                <AlertTitle>高风险审批，请谨慎处理</AlertTitle>
                <AlertDescription>
                  该申请涉及生产环境或敏感权限，通过后需确保审批链完整并全程留痕。
                </AlertDescription>
              </Alert>
            ) : null}

            <DetailSection title="申请信息">
              <DetailGrid>
                <DetailRow label="单号" mono>
                  {detailApproval.code}
                </DetailRow>
                <DetailRow label="申请人">
                  {detailApproval.applicant}（{detailApproval.applicantEmail}）
                </DetailRow>
                <DetailRow label="租户">{detailApproval.tenantName}</DetailRow>
                <DetailRow label="目标对象">
                  {detailApproval.targetType} · {detailApproval.targetName}
                </DetailRow>
                <DetailRow label="提交时间">
                  {formatDate(detailApproval.submittedAt, "yyyy-MM-dd HH:mm")}
                </DetailRow>
                <DetailRow label="SLA 截止">
                  <span className={Date.parse(detailApproval.slaDueAt) < NOW && isAwaiting(detailApproval.status) ? "text-red-600 dark:text-red-400" : undefined}>
                    {formatDate(detailApproval.slaDueAt, "yyyy-MM-dd HH:mm")}
                  </span>
                </DetailRow>
                <DetailRow label="金额">
                  <span className="num">
                    {detailApproval.amount === null ? "—" : formatCurrency(detailApproval.amount)}
                  </span>
                </DetailRow>
                <DetailRow label="当前节点">
                  <span className="num">
                    第 {detailApproval.currentStep} / {detailApproval.chain.length} 步
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="申请理由">
              <p className="text-xs leading-relaxed">{detailApproval.reason}</p>
            </DetailSection>

            <DetailSection title="审批链时间线">
              <ol className="relative space-y-4 border-l border-border pl-4">
                {detailApproval.chain.map((step) => (
                  <li key={step.id} className="relative">
                    <span
                      className={
                        step.status === "approved"
                          ? "absolute -left-[1.32rem] top-1 size-2.5 rounded-full bg-emerald-500"
                          : step.status === "rejected"
                            ? "absolute -left-[1.32rem] top-1 size-2.5 rounded-full bg-red-500"
                            : "absolute -left-[1.32rem] top-1 size-2.5 rounded-full bg-slate-400"
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium">
                        第 {step.order} 步 · {step.approver}
                      </span>
                      <Badge variant="outline">{step.role}</Badge>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="text-muted-foreground text-2xs">
                      {step.decidedAt ? formatDate(step.decidedAt, "yyyy-MM-dd HH:mm") : "等待处理"}
                      {step.decidedAt ? ` · ${formatRelativeTime(step.decidedAt)}` : ""}
                    </p>
                    {step.comment ? (
                      <p className="mt-1 rounded-md bg-muted px-2 py-1 text-2xs">{step.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝申请</DialogTitle>
            <DialogDescription>
              拒绝「{rejectTarget?.title ?? ""}」，理由会同步给申请人并写入审计。
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form onSubmit={rejectForm.handleSubmit(confirmReject)} className="space-y-4">
              <FormField
                control={rejectForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>拒绝理由</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="请说明拒绝原因与改进建议…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
                  取消
                </Button>
                <Button type="submit" variant="destructive" size="sm">
                  确认拒绝
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
