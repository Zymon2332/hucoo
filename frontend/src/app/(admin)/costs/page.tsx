"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Calculator,
  Coins,
  Cpu,
  Database,
  Download,
  Layers,
  Percent,
  Plus,
  Server,
  Sparkles,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { ChartCard } from "@/components/common/chart-card";
import { AreaTrendChart, DonutChart } from "@/components/charts";
import { costCenters, costSimulationModels } from "@/lib/mock-data/finops";
import { costBreakdown, dashboardSeries } from "@/lib/mock-data/dashboard";
import { useMockQuery } from "@/hooks/use-mock-query";
import {
  cn,
  formatCompact,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/utils";
import type { CostCenter } from "@/types";

const STATUS_OPTIONS = [
  { value: "on-track", label: "预算正常" },
  { value: "warning", label: "接近预算" },
  { value: "over-budget", label: "超预算" },
];

const budgetSchema = z.object({
  budgetMonthly: z.coerce.number().min(1_000, "预算至少为 1000 元").max(100_000_000, "预算过高"),
  owner: z.string().min(2, "请填写负责人"),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface ShareRow {
  model: string;
  share: number;
  inputPrice: number;
  outputPrice: number;
}

interface SimInput {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  shares: ShareRow[];
}

interface SimResult {
  totalCost: number;
  modelCost: number;
  perThousandCalls: number;
  platformFee: number;
  byokManagementFee: number;
  breakdown: { model: string; calls: number; cost: number; share: number }[];
}

const DEFAULT_CALLS = 2_000_000;
const DEFAULT_INPUT_TOKENS = 900;
const DEFAULT_OUTPUT_TOKENS = 320;

const DEFAULT_SHARES: ShareRow[] = costSimulationModels.map((model) => ({
  model: model.model,
  share: Math.round(model.share * 100),
  inputPrice: model.inputPrice,
  outputPrice: model.outputPrice,
}));

function computeSimulation(input: SimInput): SimResult {
  const breakdown = input.shares.map((share) => {
    const modelCalls = input.calls * (share.share / 100);
    const inputTokens = modelCalls * input.inputTokens;
    const outputTokens = modelCalls * input.outputTokens;
    const cost =
      (inputTokens / 1_000_000) * share.inputPrice + (outputTokens / 1_000_000) * share.outputPrice;
    return { model: share.model, calls: modelCalls, cost, share: share.share };
  });
  const modelCost = breakdown.reduce((total, item) => total + item.cost, 0);
  const platformFee = Number((modelCost * 0.08).toFixed(2));
  const byokManagementFee = Number((modelCost * 0.03).toFixed(2));
  const totalCost = Number((modelCost + platformFee + byokManagementFee).toFixed(2));
  const perThousandCalls = input.calls > 0 ? Number((totalCost / (input.calls / 1000)).toFixed(2)) : 0;
  return { totalCost, modelCost, perThousandCalls, platformFee, byokManagementFee, breakdown };
}

export default function CostsPage() {
  const [centerList, setCenterList] = React.useState<CostCenter[]>(costCenters);
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [departmentFilter, setDepartmentFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [detailCenter, setDetailCenter] = React.useState<CostCenter | null>(null);
  const [editCenter, setEditCenter] = React.useState<CostCenter | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CostCenter | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const [simCalls, setSimCalls] = React.useState(DEFAULT_CALLS);
  const [simInputTokens, setSimInputTokens] = React.useState(DEFAULT_INPUT_TOKENS);
  const [simOutputTokens, setSimOutputTokens] = React.useState(DEFAULT_OUTPUT_TOKENS);
  const [shares, setShares] = React.useState<ShareRow[]>(DEFAULT_SHARES);
  const [submitted, setSubmitted] = React.useState<SimInput | null>(null);
  const [runId, setRunId] = React.useState(0);

  const costBreakdownValue = React.useMemo(
    () => ({
      platform: costBreakdown.find((item) => item.name === "平台模型费")?.value ?? 0,
      custom: costBreakdown.find((item) => item.name === "自定义模型费")?.value ?? 0,
      byok: costBreakdown.find((item) => item.name === "BYOK 管理费")?.value ?? 0,
      sandbox: costBreakdown.find((item) => item.name === "沙箱与存储")?.value ?? 0,
    }),
    [],
  );

  const stats = React.useMemo(() => {
    const total = costBreakdown.reduce((sum, item) => sum + item.value, 0);
    const overBudget = centerList.filter((center) => center.status === "over-budget").length;
    return { total, overBudget };
  }, [centerList]);

  const tenantOptions = React.useMemo(
    () => Array.from(new Set(centerList.map((center) => center.tenantName))).map((value) => ({ value, label: value })),
    [centerList],
  );
  const departmentOptions = React.useMemo(
    () => Array.from(new Set(centerList.map((center) => center.department))).map((value) => ({ value, label: value })),
    [centerList],
  );

  const filteredCenters = React.useMemo(
    () =>
      centerList.filter(
        (center) =>
          (tenantFilter === "all" || center.tenantName === tenantFilter) &&
          (departmentFilter === "all" || center.department === departmentFilter) &&
          (statusFilter === "all" || center.status === statusFilter),
      ),
    [centerList, tenantFilter, departmentFilter, statusFilter],
  );

  const activeFilterCount = [tenantFilter, departmentFilter, statusFilter].filter(
    (value) => value !== "all",
  ).length;

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { budgetMonthly: 100_000, owner: "" },
  });

  React.useEffect(() => {
    if (editCenter) {
      form.reset({ budgetMonthly: editCenter.budgetMonthly, owner: editCenter.owner });
    }
  }, [editCenter, form]);

  const onSaveBudget = (values: BudgetFormValues) => {
    if (!editCenter) return;
    const variance = Number((((editCenter.forecast - values.budgetMonthly) / values.budgetMonthly) * 100).toFixed(1));
    setCenterList((list) =>
      list.map((center) =>
        center.id === editCenter.id
          ? {
              ...center,
              budgetMonthly: values.budgetMonthly,
              owner: values.owner,
              variance,
              status: variance > 5 ? "over-budget" : variance > 0 ? "warning" : "on-track",
              updatedAt: new Date().toISOString(),
            }
          : center,
      ),
    );
    toast.success(`已更新「${editCenter.name}」的预算`);
    setEditCenter(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setCenterList((list) => list.filter((center) => center.id !== deleteTarget.id));
      toast.success(`已删除成本中心「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 500);
  };

  const shareTotal = React.useMemo(() => shares.reduce((sum, share) => sum + share.share, 0), [shares]);

  const updateShare = (model: string, next: number) => {
    const clamped = Number.isNaN(next) ? 0 : Math.min(100, Math.max(0, Math.round(next)));
    setShares((list) => list.map((share) => (share.model === model ? { ...share, share: clamped } : share)));
  };

  const computed = React.useMemo(
    () =>
      computeSimulation(
        submitted ?? {
          calls: DEFAULT_CALLS,
          inputTokens: DEFAULT_INPUT_TOKENS,
          outputTokens: DEFAULT_OUTPUT_TOKENS,
          shares: DEFAULT_SHARES,
        },
      ),
    [submitted],
  );

  const { data: simResult, isFetching } = useMockQuery(
    ["cost-simulation", runId, submitted],
    computed,
    420,
  );

  const runSimulation = () => {
    if (shareTotal !== 100) {
      toast.error(`模型占比合计需为 100%，当前为 ${shareTotal}%`);
      return;
    }
    setSubmitted({ calls: simCalls, inputTokens: simInputTokens, outputTokens: simOutputTokens, shares });
    setRunId((value) => value + 1);
    toast.success("已提交成本模拟计算");
  };

  const columns = React.useMemo<ColumnDef<CostCenter, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "成本中心",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">{row.original.department}</p>
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
        id: "budgetMonthly",
        accessorKey: "budgetMonthly",
        header: "预算",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.budgetMonthly)}</span>
        ),
      },
      {
        id: "spentMonthly",
        accessorKey: "spentMonthly",
        header: "已用",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.spentMonthly)}</span>
        ),
      },
      {
        id: "forecast",
        accessorKey: "forecast",
        header: "预测",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.forecast)}</span>
        ),
      },
      {
        id: "variance",
        accessorKey: "variance",
        header: "偏差",
        cell: ({ row }) => (
          <span
            className={cn(
              "num text-xs font-medium",
              row.original.variance > 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatPercent(row.original.variance)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "topModels",
        header: "Top 模型",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.topModels.map((model) => (
              <Badge key={model} variant="outline">
                {model}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新",
        cell: ({ row }) => (
          <span className="text-muted-foreground num text-2xs">
            {formatRelativeTime(row.original.updatedAt)}
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
            viewLabel="成本详情"
            onView={() => setDetailCenter(row.original)}
            onEdit={() => setEditCenter(row.original)}
            onDelete={() => setDeleteTarget(row.original)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="成本与预算"
        description="查看平台成本构成与趋势，管理成本中心预算，并通过模拟器预测不同调用结构下的费用。数据为本地演示数据。"
        badges={<Badge variant="info">FinOps</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filteredCenters.length} 个成本中心账单（演示）`)}
            >
              <Download />
              导出成本报告
            </Button>
            <Button size="sm" onClick={() => setEditCenter(centerList[0] ?? null)}>
              <Plus />
              编辑预算
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ChartCard title="成本构成" description="本月费用拆分（元）">
          <DonutChart
            data={costBreakdown}
            height={260}
            valueFormatter={(value) => formatCompactCurrency(value)}
          />
        </ChartCard>
        <ChartCard title="成本趋势" description="近 30 天每日成本走势" className="xl:col-span-2">
          <AreaTrendChart
            data={dashboardSeries}
            xKey="date"
            height={260}
            series={[{ key: "cost", name: "成本（元）", color: "var(--chart-3)" }]}
            valueFormatter={(value) => formatCompactCurrency(value)}
          />
        </ChartCard>
      </div>

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="本月总成本"
          value={stats.total}
          icon={Coins}
          delta={4.2}
          invertDelta
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="平台模型费"
          value={costBreakdownValue.platform}
          icon={Cpu}
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="自定义模型费"
          value={costBreakdownValue.custom}
          icon={Sparkles}
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="BYOK 管理费"
          value={costBreakdownValue.byok}
          icon={Wallet}
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="沙箱存储费"
          value={costBreakdownValue.sandbox}
          icon={Database}
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="超支成本中心"
          value={stats.overBudget}
          unit="个"
          icon={TriangleAlert}
          tone="danger"
          hint="预测偏差超过 5%"
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTenantFilter("all");
          setDepartmentFilter("all");
          setStatusFilter("all");
        }}
      >
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
        <FilterSelect
          label="部门"
          value={departmentFilter}
          onChange={setDepartmentFilter}
          options={departmentOptions}
        />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </FilterBar>

      <Tabs defaultValue="centers">
        <TabsList>
          <TabsTrigger value="centers">成本中心</TabsTrigger>
          <TabsTrigger value="simulator">成本模拟器</TabsTrigger>
          <TabsTrigger value="rules">分摊规则</TabsTrigger>
        </TabsList>

        <TabsContent value="centers">
          <DataTable
            columns={columns}
            data={filteredCenters}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索成本中心、部门、负责人…"
            onRowClick={(row) => setDetailCenter(row)}
            emptyTitle="没有符合条件的成本中心"
          />
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4">
          <Card className="gap-0 py-4">
            <CardHeader className="pb-3">
              <CardTitle>模拟参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sim-calls">月调用量（次）</Label>
                  <Input
                    id="sim-calls"
                    type="number"
                    min={0}
                    value={simCalls}
                    onChange={(event) => setSimCalls(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-input">平均输入 Token</Label>
                  <Input
                    id="sim-input"
                    type="number"
                    min={0}
                    value={simInputTokens}
                    onChange={(event) => setSimInputTokens(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-output">平均输出 Token</Label>
                  <Input
                    id="sim-output"
                    type="number"
                    min={0}
                    value={simOutputTokens}
                    onChange={(event) => setSimOutputTokens(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionHeader
                    title="模型占比"
                    description="按调用量占比分配，合计必须等于 100%"
                    className="flex-1"
                  />
                  <Badge variant={shareTotal === 100 ? "success" : "danger"} className="num ml-3">
                    合计 {shareTotal}%
                  </Badge>
                </div>
                <div className="space-y-2">
                  {shares.map((share) => (
                    <div
                      key={share.model}
                      className="grid grid-cols-[1fr_6rem_5rem_5rem] items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-medium">{share.model}</p>
                        <p className="text-muted-foreground num text-2xs">
                          输入 ¥{share.inputPrice}/M · 输出 ¥{share.outputPrice}/M
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`${share.model} 占比`}
                        value={share.share}
                        onChange={(event) => updateShare(share.model, Number(event.target.value))}
                        className="h-8"
                      />
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${Math.min(100, share.share)}%` }}
                        />
                      </div>
                      <span className="num text-right text-2xs">{share.share}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShares(DEFAULT_SHARES);
                    setSimCalls(DEFAULT_CALLS);
                    setSimInputTokens(DEFAULT_INPUT_TOKENS);
                    setSimOutputTokens(DEFAULT_OUTPUT_TOKENS);
                    toast.success("已重置模拟参数");
                  }}
                >
                  重置
                </Button>
                <Button size="sm" onClick={runSimulation} disabled={isFetching || shareTotal !== 100}>
                  <Calculator />
                  {isFetching ? "计算中…" : "开始计算"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {submitted && simResult ? (
            <>
              <StatCardGrid className="xl:grid-cols-4">
                <StatCard
                  label="总成本（预估）"
                  value={simResult.totalCost}
                  icon={Coins}
                  tone="warning"
                  valueFormatter={(value) => formatCompactCurrency(value)}
                />
                <StatCard
                  label="每千次调用成本"
                  value={simResult.perThousandCalls}
                  icon={Calculator}
                  tone="info"
                  valueFormatter={(value) => formatCurrency(value)}
                />
                <StatCard
                  label="平台服务费"
                  value={simResult.platformFee}
                  icon={Server}
                  valueFormatter={(value) => formatCompactCurrency(value)}
                />
                <StatCard
                  label="BYOK 管理费"
                  value={simResult.byokManagementFee}
                  icon={Wallet}
                  valueFormatter={(value) => formatCompactCurrency(value)}
                />
              </StatCardGrid>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <SectionHeader title="模型成本明细" description={`模型成本合计 ${formatCurrency(simResult.modelCost)}`} />
                  <Badge variant="outline" className="num">
                    占比合计 100%
                  </Badge>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">模型</th>
                      <th className="px-3 py-2 text-right font-medium">占比</th>
                      <th className="px-3 py-2 text-right font-medium">调用量</th>
                      <th className="px-3 py-2 text-right font-medium">成本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResult.breakdown.map((item) => (
                      <tr key={item.model} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-2xs">{item.model}</td>
                        <td className="num px-3 py-2 text-right">{item.share}%</td>
                        <td className="num px-3 py-2 text-right">{formatNumber(Math.round(item.calls))}</td>
                        <td className="num px-3 py-2 text-right">{formatCurrency(item.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-2xs">
                计算口径：模型成本按 Token 单价计费，平台服务费为模型成本的 8%，BYOK 管理费为模型成本的 3%。
              </p>
            </>
          ) : (
            <Card className="gap-0 py-10">
              <CardContent className="flex flex-col items-center gap-2 text-center">
                <Calculator className="text-muted-foreground size-6" />
                <p className="text-xs font-medium">填写参数后点击「开始计算」</p>
                <p className="text-muted-foreground text-2xs">模拟结果将异步返回并展示成本明细。</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              {
                title: "平台模型费",
                badge: "按 Token 计量",
                description: "调用平台模型按输入/输出 Token 单价计费，归属到发起调用的成本中心。",
                points: [
                  "输入与输出 Token 分别按模型目录价计费。",
                  "路由到兜底模型时按实际执行模型计价。",
                  "跨成本中心的共享调用按调用方归属。",
                ],
              },
              {
                title: "自定义模型费",
                badge: "按 Endpoint 计量",
                description: "自定义 Endpoint 与本地模型由租户自行结算，平台仅收取网关与观测费用。",
                points: [
                  "网关转发按调用次数收取固定服务费。",
                  "本地模型仅计量不计费，用于成本分析。",
                  "BYOK 模型不产生模型费，仅产生管理费。",
                ],
              },
              {
                title: "BYOK 管理费",
                badge: "按密钥数计量",
                description: "平台托管 BYOK 密钥、执行轮换与访问审计，按密钥数量与调用量组合计费。",
                points: [
                  "每个活跃密钥按月收取基础托管费。",
                  "超出免费额度部分按调用量阶梯计费。",
                  "密钥轮换与应急撤销不额外收费。",
                ],
              },
              {
                title: "降级费用归属",
                badge: "按降级原因",
                description: "高峰期降级到低成本模型时，差额费用的归属取决于降级触发原因。",
                points: [
                  "平台容量原因导致的降级由平台承担差额。",
                  "租户配额原因导致的降级由租户承担。",
                  "自定义模型故障触发的降级按 6:4 分担。",
                ],
              },
            ].map((rule) => (
              <Card key={rule.title} className="gap-0 py-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{rule.title}</CardTitle>
                    <Badge variant="secondary">{rule.badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground text-2xs leading-relaxed">{rule.description}</p>
                  <ul className="space-y-1.5">
                    {rule.points.map((point) => (
                      <li key={point} className="flex items-start gap-1.5 text-2xs leading-relaxed">
                        <Percent className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-3 gap-0 py-4">
            <CardContent className="space-y-2">
              <SectionHeader title="费用口径说明" description="以上规则用于演示，实际以商务合同与账单为准" />
              <div className="grid gap-2 text-2xs sm:grid-cols-3">
                <div className="rounded-md border border-border p-3">
                  <p className="text-muted-foreground">计量精度</p>
                  <p className="num mt-0.5 font-medium">Token 精确到个位</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-muted-foreground">结算周期</p>
                  <p className="mt-0.5 font-medium">自然月，次月 3 日出账</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-muted-foreground">汇率与税费</p>
                  <p className="mt-0.5 font-medium">人民币含税（6%）</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={editCenter !== null}
        onOpenChange={(open) => {
          if (!open) setEditCenter(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑成本预算</DialogTitle>
            <DialogDescription>
              {editCenter ? `${editCenter.name} · 当前预算 ${formatCompactCurrency(editCenter.budgetMonthly)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSaveBudget)} className="space-y-4">
              <FormField
                control={form.control}
                name="budgetMonthly"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>月度预算（元）</FormLabel>
                    <FormControl>
                      <Input type="number" min={1000} step="1000" {...field} />
                    </FormControl>
                    <FormDescription>调整后按预测值重新计算偏差与状态。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>负责人</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：孙倩" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditCenter(null)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  保存预算
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailCenter !== null}
        onOpenChange={(open) => {
          if (!open) setDetailCenter(null);
        }}
        title={detailCenter?.name ?? "成本中心详情"}
        description={detailCenter ? `${detailCenter.tenantName} · ${detailCenter.department}` : undefined}
        footer={
          detailCenter ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailCenter.status} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditCenter(detailCenter)}>
                  编辑预算
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(detailCenter)}>
                  删除
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailCenter ? (
          <>
            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="负责人">{detailCenter.owner}</DetailRow>
                <DetailRow label="部门">{detailCenter.department}</DetailRow>
                <DetailRow label="所属租户">{detailCenter.tenantName}</DetailRow>
                <DetailRow label="更新时间">
                  <span className="num">{formatDate(detailCenter.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="预算与消耗">
              <DetailGrid>
                <DetailRow label="月度预算">
                  <span className="num">{formatCompactCurrency(detailCenter.budgetMonthly)}</span>
                </DetailRow>
                <DetailRow label="已用">
                  <span className="num">{formatCompactCurrency(detailCenter.spentMonthly)}</span>
                </DetailRow>
                <DetailRow label="预测">
                  <span className="num">{formatCompactCurrency(detailCenter.forecast)}</span>
                </DetailRow>
                <DetailRow label="偏差">
                  <span
                    className={cn(
                      "num",
                      detailCenter.variance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600",
                    )}
                  >
                    {formatPercent(detailCenter.variance)}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="主要消耗模型">
              <div className="flex flex-wrap gap-1.5">
                {detailCenter.topModels.map((model) => (
                  <Badge key={model} variant="outline">
                    {model}
                  </Badge>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="消耗进度">
              <div className="space-y-1">
                <div className="text-2xs text-muted-foreground flex items-center justify-between">
                  <span>已用 / 预算</span>
                  <span className="num">
                    {formatCompact(detailCenter.spentMonthly)} / {formatCompact(detailCenter.budgetMonthly)}
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      detailCenter.spentMonthly / detailCenter.budgetMonthly >= 1
                        ? "bg-red-500"
                        : detailCenter.spentMonthly / detailCenter.budgetMonthly >= 0.8
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{
                      width: `${Math.min(100, Math.round((detailCenter.spentMonthly / detailCenter.budgetMonthly) * 100))}%`,
                    }}
                  />
                </div>
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
        title={`删除成本中心「${deleteTarget?.name ?? ""}」？`}
        description="删除后该成本中心的历史用量将归入「未分配」，预算与告警一并失效，操作不可撤销。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />

      <div className="text-muted-foreground flex items-center gap-1.5 text-2xs">
        <Layers className="size-3.5" />
        <span>成本数据基于用量明细聚合，模拟结果仅用于容量与预算规划。</span>
      </div>
    </PageContainer>
  );
}
