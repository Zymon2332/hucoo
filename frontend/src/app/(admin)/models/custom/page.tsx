"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  KeyRound,
  Loader2,
  MinusCircle,
  Network,
  Plug,
  RefreshCw,
  Server,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { RiskBadge, StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { customModels, modelValidationRuns } from "@/lib/mock-data/models";
import { label } from "@/lib/labels";
import { formatDate, formatRelativeTime, truncate } from "@/lib/utils";
import type {
  CustomModel,
  CustomModelAccessType,
  ModelValidationCheck,
  ModelValidationRun,
} from "@/types";

const ACCESS_TYPE_OPTIONS = [
  { value: "byok", label: "BYOK 自有密钥" },
  { value: "custom-endpoint", label: "自定义 Endpoint" },
  { value: "local", label: "本地部署" },
  { value: "gateway", label: "企业网关" },
];

const STATUS_OPTIONS = [
  { value: "pending-review", label: "待审核" },
  { value: "validating", label: "验证中" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
  { value: "disabled", label: "已禁用" },
  { value: "expired", label: "已过期" },
];

const RISK_OPTIONS = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
  { value: "critical", label: "严重风险" },
];

const DATA_FLOW_OPTIONS = [
  { value: "in-region", label: "境内就近" },
  { value: "domestic", label: "境内" },
  { value: "overseas", label: "境外" },
  { value: "unknown", label: "未确认" },
];

const COST_OWNER_LABEL: Record<CustomModel["costOwner"], string> = {
  tenant: "租户承担",
  platform: "平台承担",
  shared: "共同承担",
};

const ACCESS_TYPE_BADGE: Record<CustomModelAccessType, "info" | "secondary" | "success" | "warning"> = {
  byok: "info",
  "custom-endpoint": "secondary",
  local: "success",
  gateway: "warning",
};

const DATA_FLOW_BADGE: Record<CustomModel["dataFlow"], "success" | "info" | "warning" | "danger"> = {
  "in-region": "success",
  domestic: "info",
  overseas: "warning",
  unknown: "danger",
};

const ACCESS_TYPE_CARDS: {
  type: CustomModelAccessType;
  icon: typeof KeyRound;
  description: string;
  requirement: string;
}[] = [
  {
    type: "byok",
    icon: KeyRound,
    description: "租户提供自有厂商密钥，平台仅托管密文与指纹，用于代理调用。",
    requirement: "需签署密钥托管协议，按季度轮换，泄露时立即撤销。",
  },
  {
    type: "custom-endpoint",
    icon: Plug,
    description: "接入租户或第三方自建推理服务，通过 OpenAI 兼容协议对接。",
    requirement: "需提供 Endpoint 稳定性证明、数据流向说明与限流配置。",
  },
  {
    type: "local",
    icon: Server,
    description: "部署在客户机房或专有云内的模型服务，数据不出域。",
    requirement: "需通过连通性与并发验证，出口域名需登记备案。",
  },
  {
    type: "gateway",
    icon: Network,
    description: "经企业统一网关代理的模型流量，集中鉴权、限流与审计。",
    requirement: "需提供网关侧的出网策略与审计日志留存方案。",
  },
];

const reviewSchema = z.object({
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  dataFlowConfirmed: z
    .boolean()
    .refine((value) => value, "必须确认数据流向与合规材料后方可提交审核"),
  comment: z.string().max(200, "审批意见过长").optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

function CheckStatusIcon({ status }: { status: ModelValidationCheck["status"] }) {
  if (status === "passed") return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />;
  if (status === "failed") return <XCircle className="size-3.5 shrink-0 text-red-600" />;
  if (status === "running") return <Loader2 className="size-3.5 shrink-0 animate-spin text-violet-500" />;
  return <MinusCircle className="text-muted-foreground size-3.5 shrink-0" />;
}

export default function CustomModelsPage() {
  const [modelList, setModelList] = React.useState<CustomModel[]>(customModels);
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [accessFilter, setAccessFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [dataFlowFilter, setDataFlowFilter] = React.useState("all");
  const [detailModel, setDetailModel] = React.useState<CustomModel | null>(null);
  const [reviewTarget, setReviewTarget] = React.useState<CustomModel | null>(null);
  const [disableTarget, setDisableTarget] = React.useState<{
    model: CustomModel;
    action: "disable" | "revoke";
  } | null>(null);
  const [disablePending, setDisablePending] = React.useState(false);

  const tenantOptions = React.useMemo(
    () =>
      Array.from(new Set(modelList.map((model) => model.tenantName))).map((value) => ({
        value,
        label: value,
      })),
    [modelList],
  );

  const filtered = React.useMemo(
    () =>
      modelList.filter(
        (model) =>
          (tenantFilter === "all" || model.tenantName === tenantFilter) &&
          (accessFilter === "all" || model.accessType === accessFilter) &&
          (statusFilter === "all" || model.status === statusFilter) &&
          (riskFilter === "all" || model.riskLevel === riskFilter) &&
          (dataFlowFilter === "all" || model.dataFlow === dataFlowFilter),
      ),
    [modelList, tenantFilter, accessFilter, statusFilter, riskFilter, dataFlowFilter],
  );

  const activeFilterCount = [
    tenantFilter,
    accessFilter,
    statusFilter,
    riskFilter,
    dataFlowFilter,
  ].filter((value) => value !== "all").length;

  const stats = React.useMemo(() => {
    const total = modelList.length;
    const pending = modelList.filter((model) => model.status === "pending-review").length;
    const validating = modelList.filter((model) => model.status === "validating").length;
    const approved = modelList.filter((model) => model.status === "approved").length;
    const rejected = modelList.filter((model) => model.status === "rejected").length;
    const inactive = modelList.filter(
      (model) => model.status === "disabled" || model.status === "expired",
    ).length;
    return { total, pending, validating, approved, rejected, inactive };
  }, [modelList]);

  const detailRun = React.useMemo<ModelValidationRun | null>(() => {
    if (!detailModel) return null;
    return modelValidationRuns.find((run) => run.customModelId === detailModel.id) ?? null;
  }, [detailModel]);

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      riskLevel: "medium",
      dataFlowConfirmed: false,
      comment: "",
    },
  });

  React.useEffect(() => {
    if (reviewTarget) {
      reviewForm.reset({
        riskLevel: reviewTarget.riskLevel,
        dataFlowConfirmed: false,
        comment: "",
      });
    }
  }, [reviewTarget, reviewForm]);

  const duplicateDraft = (model: CustomModel) => {
    setModelList((list) => [
      {
        ...model,
        id: `cm-${String(list.length + 1).padStart(2, "0")}`,
        name: `${model.name}-draft`,
        status: "pending-review",
        validationPassed: 0,
        validationFailed: 0,
        updatedAt: new Date().toISOString(),
        notes: `由「${model.name}」复制生成的草稿，待补充合规材料。`,
      },
      ...list,
    ]);
    toast.success(`已将「${model.name}」复制为接入草稿`);
  };

  const onReviewSubmit = (values: ReviewFormValues) => {
    if (!reviewTarget) return;
    setModelList((list) =>
      list.map((model) =>
        model.id === reviewTarget.id
          ? {
              ...model,
              riskLevel: values.riskLevel,
              status: "approved",
              notes: values.comment?.trim()
                ? `${model.notes} 审核意见：${values.comment.trim()}`
                : model.notes,
              updatedAt: new Date().toISOString(),
            }
          : model,
      ),
    );
    toast.success(`已通过「${reviewTarget.name}」的接入申请`);
    setReviewTarget(null);
  };

  const confirmDisable = () => {
    if (!disableTarget) return;
    setDisablePending(true);
    window.setTimeout(() => {
      setModelList((list) =>
        list.map((model) =>
          model.id === disableTarget.model.id
            ? {
                ...model,
                status: disableTarget.action === "revoke" ? "rejected" : "disabled",
                updatedAt: new Date().toISOString(),
              }
            : model,
        ),
      );
      toast.success(
        disableTarget.action === "revoke"
          ? `已撤销「${disableTarget.model.name}」的接入`
          : `已禁用「${disableTarget.model.name}」，调用将回退到 ${disableTarget.model.fallbackModel}`,
      );
      setDisablePending(false);
      setDisableTarget(null);
    }, 500);
  };

  const columns: ColumnDef<CustomModel, unknown>[] = [
    {
      id: "name",
        accessorKey: "name",
        header: "模型",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.modelId}</p>
          </div>
        ),
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-2xs">{row.original.tenantName}</span>,
      },
      {
        id: "accessType",
        accessorKey: "accessType",
        header: "接入方式",
        cell: ({ row }) => (
          <Badge variant={ACCESS_TYPE_BADGE[row.original.accessType]}>
            {label(row.original.accessType)}
          </Badge>
        ),
      },
      {
        id: "endpoint",
        accessorKey: "endpoint",
        header: "Endpoint",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.endpoint}>
            {truncate(row.original.endpoint, 28)}
          </span>
        ),
      },
      {
        id: "keyFingerprint",
        accessorKey: "keyFingerprint",
        header: "Key 指纹",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">
            {row.original.keyFingerprint || "不适用"}
          </span>
        ),
      },
      {
        id: "dataFlow",
        accessorKey: "dataFlow",
        header: "数据流向",
        cell: ({ row }) => (
          <Badge variant={DATA_FLOW_BADGE[row.original.dataFlow]}>{label(row.original.dataFlow)}</Badge>
        ),
      },
      {
        id: "fallbackModel",
        accessorKey: "fallbackModel",
        header: "兜底模型",
        cell: ({ row }) => (
          <span className="font-mono text-2xs">{row.original.fallbackModel}</span>
        ),
      },
      {
        id: "costOwner",
        accessorKey: "costOwner",
        header: "费用归属",
        cell: ({ row }) => (
          <span className="text-2xs">{COST_OWNER_LABEL[row.original.costOwner]}</span>
        ),
      },
      {
        id: "riskLevel",
        accessorKey: "riskLevel",
        header: "风险",
        cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} />,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "validation",
        header: "验证结果",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.original.validationFailed > 0 ? "failed" : "passed"} dot={false} />
            <span className="num text-2xs">
              {row.original.validationPassed}/{row.original.validationPassed + row.original.validationFailed}
            </span>
          </div>
        ),
      },
      {
        id: "ownerName",
        accessorKey: "ownerName",
        header: "负责人",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.ownerName}</p>
            <p className="text-muted-foreground truncate text-2xs">{row.original.ownerEmail}</p>
          </div>
        ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">{formatRelativeTime(row.original.updatedAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => {
          const model = row.original;
          const extraItems: {
            label: string;
            onSelect: () => void;
            destructive?: boolean;
          }[] = [];
          if (model.status === "pending-review") {
            extraItems.push({ label: "审核接入申请", onSelect: () => setReviewTarget(model) });
          }
          extraItems.push({ label: "复制为草稿", onSelect: () => duplicateDraft(model) });
          if (model.status !== "disabled" && model.status !== "expired" && model.status !== "rejected") {
            extraItems.push({
              label: "禁用模型",
              destructive: true,
              onSelect: () => setDisableTarget({ model, action: "disable" }),
            });
          }
          if (model.status === "approved" || model.status === "validating") {
            extraItems.push({
              label: "撤销接入",
              destructive: true,
              onSelect: () => setDisableTarget({ model, action: "revoke" }),
            });
          }
          return (
            <RowActions
              viewLabel="验证结果"
              onView={() => setDetailModel(model)}
              extraItems={extraItems}
            />
          );
        },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="自定义模型治理"
        description="审核租户自定义模型接入申请，核验数据流向与合规材料，跟踪验证结果并管理上下线。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已同步合规材料清单（演示）")}
            >
              <RefreshCw />
              同步合规材料
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条接入记录（演示）`)}
            >
              <Download />
              导出
            </Button>
          </>
        }
        badges={<Badge variant="warning">高风险接入</Badge>}
      />

      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>高风险接入需完成数据流向确认与合规材料核验</AlertTitle>
        <AlertDescription>
          涉及境外数据流向或未确认出网域的模型，必须由接入负责人确认数据流向、提交等保与安全评估材料后方可上线；
          未通过审核的模型将回退到平台兜底模型。
        </AlertDescription>
      </Alert>

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="自定义模型" value={stats.total} icon={Plug} hint="来自租户的接入申请" />
        <StatCard label="待审核" value={stats.pending} icon={ClipboardCheck} tone="warning" />
        <StatCard label="验证中" value={stats.validating} icon={Loader2} tone="info" />
        <StatCard label="已通过" value={stats.approved} icon={ShieldCheck} tone="success" />
        <StatCard label="已拒绝" value={stats.rejected} icon={XCircle} tone="danger" />
        <StatCard label="已禁用 / 过期" value={stats.inactive} icon={TriangleAlert} tone="warning" />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTenantFilter("all");
          setAccessFilter("all");
          setStatusFilter("all");
          setRiskFilter("all");
          setDataFlowFilter("all");
        }}
      >
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
        <FilterSelect
          label="接入方式"
          value={accessFilter}
          onChange={setAccessFilter}
          options={ACCESS_TYPE_OPTIONS}
        />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="风险" value={riskFilter} onChange={setRiskFilter} options={RISK_OPTIONS} />
        <FilterSelect
          label="数据流向"
          value={dataFlowFilter}
          onChange={setDataFlowFilter}
          options={DATA_FLOW_OPTIONS}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索模型名、租户、Endpoint、负责人…"
        onRowClick={(row) => setDetailModel(row)}
        emptyTitle="没有符合条件的自定义模型"
        emptyDescription="调整租户、接入方式或风险筛选后重试。"
      />

      <section className="space-y-3">
        <SectionHeader
          title="接入方式说明"
          description="四种接入方式的数据边界、审核要求与费用归属差异"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ACCESS_TYPE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.type} className="gap-0 py-4">
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
                      <Icon className="size-4" />
                    </span>
                    <p className="text-xs font-semibold">{label(card.type)}</p>
                  </div>
                  <p className="text-muted-foreground text-2xs leading-relaxed">{card.description}</p>
                  <p className="text-2xs leading-relaxed">
                    <span className="text-muted-foreground">审核要求：</span>
                    {card.requirement}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Dialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>审核接入申请</DialogTitle>
            <DialogDescription>
              {reviewTarget ? `${reviewTarget.name} · ${reviewTarget.tenantName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {reviewTarget ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-2xs font-medium">申请人信息（只读）</p>
                <DetailGrid className="mt-2">
                  <DetailRow label="申请人">{reviewTarget.ownerName}</DetailRow>
                  <DetailRow label="邮箱">{reviewTarget.ownerEmail}</DetailRow>
                  <DetailRow label="租户">{reviewTarget.tenantName}</DetailRow>
                  <DetailRow label="模型 ID">
                    <span className="font-mono text-2xs">{reviewTarget.modelId}</span>
                  </DetailRow>
                  <DetailRow label="接入方式">{label(reviewTarget.accessType)}</DetailRow>
                  <DetailRow label="数据流向">{label(reviewTarget.dataFlow)}</DetailRow>
                  <DetailRow label="Endpoint" mono>
                    {reviewTarget.endpoint}
                  </DetailRow>
                  <DetailRow label="出口域名">
                    {reviewTarget.egressDomains.length > 0
                      ? reviewTarget.egressDomains.join("、")
                      : "无"}
                  </DetailRow>
                </DetailGrid>
              </div>

              <Form {...reviewForm}>
                <form onSubmit={reviewForm.handleSubmit(onReviewSubmit)} className="space-y-4">
                  <FormField
                    control={reviewForm.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>风险等级</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RISK_OPTIONS.map((option) => (
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
                    control={reviewForm.control}
                    name="dataFlowConfirmed"
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-2xs leading-relaxed">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                            className="mt-0.5"
                          />
                          <span>
                            我已确认该模型的数据流向（{label(reviewTarget.dataFlow)}）与合规材料真实有效，
                            了解接入后平台将按配置进行数据代理与日志留存。
                          </span>
                        </label>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={reviewForm.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>审批意见</FormLabel>
                        <FormControl>
                          <Textarea placeholder="填写审核结论、附加条件或后续跟进事项…" {...field} />
                        </FormControl>
                        <FormDescription>选填，将追加到模型备注中。</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" size="sm" onClick={() => setReviewTarget(null)}>
                      取消
                    </Button>
                    <Button type="submit" size="sm">
                      <CheckCircle2 />
                      通过接入
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailModel !== null}
        onOpenChange={(open) => {
          if (!open) setDetailModel(null);
        }}
        title={detailModel ? `验证结果 · ${detailModel.name}` : "验证结果"}
        description={detailModel ? `${detailModel.tenantName} · ${label(detailModel.accessType)}` : undefined}
        footer={
          detailRun ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailRun.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.success(`已重新排队执行「${detailRun.modelName}」的失败验证项`)
                }
              >
                <RefreshCw />
                重跑失败项
              </Button>
            </div>
          ) : null
        }
      >
        {detailModel && detailRun ? (
          <>
            <Alert variant={detailRun.status === "failed" ? "destructive" : "success"}>
              {detailRun.status === "failed" ? <XCircle /> : <CheckCircle2 />}
              <AlertTitle>
                总体状态：{detailRun.status === "failed" ? "验证未通过" : "验证通过"}
              </AlertTitle>
              <AlertDescription>
                {detailRun.failureReason ??
                  `全部 ${detailRun.checks.length} 项检查通过，总耗时 ${detailRun.durationMs} ms。`}
              </AlertDescription>
            </Alert>

            <DetailSection title="基础信息">
              <DetailGrid>
                <DetailRow label="模型 ID">
                  <span className="font-mono text-2xs">{detailModel.modelId}</span>
                </DetailRow>
                <DetailRow label="执行人">{detailRun.runner}</DetailRow>
                <DetailRow label="开始时间">
                  <span className="num">{formatDate(detailRun.startedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="总耗时">
                  <span className="num">{detailRun.durationMs} ms</span>
                </DetailRow>
                <DetailRow label="验证时间">
                  <span className="num">{formatDate(detailModel.lastValidatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="兜底模型">
                  <span className="font-mono text-2xs">{detailModel.fallbackModel}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection
              title="验证项明细"
              description={`共 ${detailRun.checks.length} 项，失败项已高亮`}
            >
              <div className="space-y-1.5">
                {detailRun.checks.map((check) => (
                  <div
                    key={check.key}
                    className={
                      check.status === "failed"
                        ? "flex items-start gap-2 rounded-md border border-red-500/40 bg-red-50/60 p-2 dark:bg-red-950/20"
                        : "flex items-start gap-2 rounded-md border border-border p-2"
                    }
                  >
                    <CheckStatusIcon status={check.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{check.label}</p>
                        <span className="num text-muted-foreground text-2xs">
                          {check.durationMs} ms
                        </span>
                      </div>
                      <p className="text-muted-foreground text-2xs">{check.detail}</p>
                    </div>
                    <StatusBadge
                      status={check.status}
                      dot={false}
                      className="shrink-0"
                    />
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="备注">
              <p className="text-muted-foreground text-2xs leading-relaxed">{detailModel.notes}</p>
            </DetailSection>
          </>
        ) : detailModel ? (
          <Alert variant="info">
            <TriangleAlert />
            <AlertTitle>暂无验证记录</AlertTitle>
            <AlertDescription>
              该模型尚未产生验证任务，请前往「模型验证」页面发起验证。
            </AlertDescription>
          </Alert>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
        title={
          disableTarget?.action === "revoke"
            ? `撤销「${disableTarget.model.name}」的接入？`
            : `禁用「${disableTarget?.model.name ?? ""}」？`
        }
        description={
          <span>
            操作后该模型的调用会立即中断，并自动回退到兜底模型{" "}
            <span className="font-mono">{disableTarget?.model.fallbackModel}</span>
            。期间产生的费用按{" "}
            {disableTarget ? COST_OWNER_LABEL[disableTarget.model.costOwner] : "—"} 规则结算。
          </span>
        }
        confirmLabel={disableTarget?.action === "revoke" ? "确认撤销" : "确认禁用"}
        loading={disablePending}
        onConfirm={confirmDisable}
      />
    </PageContainer>
  );
}
