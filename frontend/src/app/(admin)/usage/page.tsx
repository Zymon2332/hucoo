"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Coins,
  Database,
  Download,
  Gauge,
  Layers,
  Send,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { ChartCard } from "@/components/common/chart-card";
import { BarDistributionChart, DonutChart, SparkLine } from "@/components/charts";
import {
  usageRecords,
  usageSummaries,
} from "@/lib/mock-data/finops";
import { tenants } from "@/lib/mock-data/tenants";
import { createRandom, randomFloat } from "@/lib/mock-data/seed";
import { cn, formatCompact, formatCompactCurrency, formatDate, formatDelta, formatNumber } from "@/lib/utils";
import { label } from "@/lib/labels";
import type { UsageRecord, UsageSummary } from "@/types";

interface TenantUsageRow extends UsageSummary {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  trend: { date: string; calls: number }[];
}

const RANGE_OPTIONS = [
  { value: "7", label: "近 7 天" },
  { value: "30", label: "近 30 天" },
  { value: "90", label: "近 90 天" },
];

const reportSchema = z.object({
  reportType: z.enum(["usage", "cost", "concurrency"], { message: "请选择报表类型" }),
  range: z.enum(["7", "30", "90"], { message: "请选择统计周期" }),
  email: z.string().email("请输入合法邮箱"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function UsagePage() {
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [modelFilter, setModelFilter] = React.useState("all");
  const [agentFilter, setAgentFilter] = React.useState("all");
  const [toolFilter, setToolFilter] = React.useState("all");
  const [rangeFilter, setRangeFilter] = React.useState("30");
  const [recordList, setRecordList] = React.useState<UsageRecord[]>(usageRecords);
  const [detailRecord, setDetailRecord] = React.useState<UsageRecord | null>(null);
  const [detailSummary, setDetailSummary] = React.useState<TenantUsageRow | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [clearPending, setClearPending] = React.useState(false);

  const tenantUsageRows = React.useMemo<TenantUsageRow[]>(
    () =>
      usageSummaries.map((summary, index) => {
        const tenant = tenants[index];
        const random = createRandom(40_000 + index * 31);
        const trend = Array.from({ length: 12 }).map((_, pointIndex) => ({
          date: `${pointIndex + 1}`,
          calls: Math.round((summary.calls / 12) * randomFloat(random, 0.78, 1.22, 3)),
        }));
        return {
          ...summary,
          id: tenant?.id ?? `usage-${index}`,
          tenantId: tenant?.id ?? "",
          tenantName: tenant?.name ?? "—",
          plan: tenant?.plan ?? "team",
          trend,
        };
      }),
    [],
  );

  const stats = React.useMemo(() => {
    const calls = tenantUsageRows.reduce((total, row) => total + row.calls, 0);
    const inputTokens = tenantUsageRows.reduce((total, row) => total + row.inputTokens, 0);
    const outputTokens = tenantUsageRows.reduce((total, row) => total + row.outputTokens, 0);
    const cost = tenantUsageRows.reduce((total, row) => total + row.cost, 0);
    const concurrencyPeak = tenantUsageRows.reduce(
      (peak, row) => Math.max(peak, row.concurrencyPeak),
      0,
    );
    const storageGb = tenantUsageRows.reduce((total, row) => total + row.storageGb, 0);
    return { calls, inputTokens, outputTokens, cost, concurrencyPeak, storageGb };
  }, [tenantUsageRows]);

  const projectOptions = React.useMemo(
    () => Array.from(new Set(recordList.map((record) => record.projectName))).map((value) => ({ value, label: value })),
    [recordList],
  );
  const modelOptions = React.useMemo(
    () => Array.from(new Set(recordList.map((record) => record.modelName))).map((value) => ({ value, label: value })),
    [recordList],
  );
  const agentOptions = React.useMemo(
    () => Array.from(new Set(recordList.map((record) => record.agentName))).map((value) => ({ value, label: value })),
    [recordList],
  );
  const toolOptions = React.useMemo(
    () => Array.from(new Set(recordList.map((record) => record.toolName))).map((value) => ({ value, label: value })),
    [recordList],
  );
  const tenantOptions = React.useMemo(
    () => tenantUsageRows.map((row) => ({ value: row.tenantName, label: row.tenantName })),
    [tenantUsageRows],
  );

  const latestDate = React.useMemo(
    () => recordList.reduce((max, record) => (record.date > max ? record.date : max), "0000-00-00"),
    [recordList],
  );

  const filteredRecords = React.useMemo(() => {
    const rangeDays = rangeFilter === "7" ? 7 : rangeFilter === "90" ? 90 : 30;
    const cutoff = Date.parse(`${latestDate}T23:59:59`) - rangeDays * 86_400_000;
    return recordList.filter(
      (record) =>
        (tenantFilter === "all" || record.tenantName === tenantFilter) &&
        (projectFilter === "all" || record.projectName === projectFilter) &&
        (modelFilter === "all" || record.modelName === modelFilter) &&
        (agentFilter === "all" || record.agentName === agentFilter) &&
        (toolFilter === "all" || record.toolName === toolFilter) &&
        Date.parse(`${record.date}T00:00:00`) >= cutoff,
    );
  }, [recordList, tenantFilter, projectFilter, modelFilter, agentFilter, toolFilter, rangeFilter, latestDate]);

  const filteredSummaries = React.useMemo(
    () => tenantUsageRows.filter((row) => tenantFilter === "all" || row.tenantName === tenantFilter),
    [tenantUsageRows, tenantFilter],
  );

  const activeFilterCount = [tenantFilter, projectFilter, modelFilter, agentFilter, toolFilter, rangeFilter].filter(
    (value, index) => (index === 5 ? value !== "30" : value !== "all"),
  ).length;

  const modelAggregation = React.useMemo(() => {
    const map = new Map<string, { name: string; calls: number; tokens: number }>();
    filteredRecords.forEach((record) => {
      const entry = map.get(record.modelName) ?? { name: record.modelName, calls: 0, tokens: 0 };
      entry.calls += record.calls;
      entry.tokens += record.inputTokens + record.outputTokens;
      map.set(record.modelName, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.calls - a.calls);
  }, [filteredRecords]);

  const toolAggregation = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredRecords.forEach((record) => {
      map.set(record.toolName, (map.get(record.toolName) ?? 0) + record.calls);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords]);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reportType: "usage", range: "30", email: "" },
  });

  const onSubmit = (values: ReportFormValues) => {
    toast.success(`已创建${values.reportType === "cost" ? "成本" : values.reportType === "usage" ? "用量" : "并发"}报表订阅`);
    setReportOpen(false);
    form.reset();
  };

  const confirmClear = () => {
    const cutoff = Date.parse(`${latestDate}T00:00:00`) - 7 * 86_400_000;
    setClearPending(true);
    window.setTimeout(() => {
      setRecordList((list) => list.filter((record) => Date.parse(`${record.date}T00:00:00`) >= cutoff));
      toast.success("已清理 7 天前的用量明细（演示）");
      setClearPending(false);
      setClearOpen(false);
    }, 500);
  };

  const summaryColumns = React.useMemo<ColumnDef<TenantUsageRow, unknown>[]>(
    () => [
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.tenantName}</p>
            <Badge variant="secondary">{label(row.original.plan)}</Badge>
          </div>
        ),
      },
      {
        id: "calls",
        accessorKey: "calls",
        header: "调用量",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.calls)}</span>,
      },
      {
        id: "tokens",
        header: "Token",
        accessorKey: "inputTokens",
        cell: ({ row }) => {
          const tokens = row.original.inputTokens + row.original.outputTokens;
          return <span className="num text-xs">{formatCompact(tokens)}</span>;
        },
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: "成本",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.cost)}</span>
        ),
      },
      {
        id: "delta",
        header: "调用环比",
        enableSorting: false,
        cell: ({ row }) => {
          const delta =
            row.original.previousCalls > 0
              ? ((row.original.calls - row.original.previousCalls) / row.original.previousCalls) * 100
              : 0;
          const positive = delta >= 0;
          const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
          return (
            <span
              className={cn(
                "num inline-flex items-center gap-0.5 text-2xs font-medium",
                positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
              )}
            >
              <DeltaIcon className="size-3" />
              {formatDelta(delta)}
            </span>
          );
        },
      },
      {
        id: "concurrencyPeak",
        accessorKey: "concurrencyPeak",
        header: "峰值并发",
        cell: ({ row }) => <span className="num text-xs">{row.original.concurrencyPeak}</span>,
      },
      {
        id: "storageGb",
        accessorKey: "storageGb",
        header: "存储",
        cell: ({ row }) => <span className="num text-xs">{row.original.storageGb} GB</span>,
      },
      {
        id: "trend",
        header: "近期趋势",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="w-24">
            <SparkLine data={row.original.trend} dataKey="calls" height={28} />
          </div>
        ),
      },
    ],
    [],
  );

  const recordColumns = React.useMemo<ColumnDef<UsageRecord, unknown>[]>(
    () => [
      {
        id: "date",
        accessorKey: "date",
        header: "日期",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.date)}</span>,
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs">{row.original.tenantName}</span>,
      },
      {
        id: "userName",
        accessorKey: "userName",
        header: "用户",
        cell: ({ row }) => <span className="text-xs">{row.original.userName}</span>,
      },
      {
        id: "projectName",
        accessorKey: "projectName",
        header: "项目",
        cell: ({ row }) => <span className="text-xs">{row.original.projectName}</span>,
      },
      {
        id: "agentName",
        accessorKey: "agentName",
        header: "Agent",
        cell: ({ row }) => <span className="text-xs">{row.original.agentName}</span>,
      },
      {
        id: "modelName",
        accessorKey: "modelName",
        header: "模型",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.modelName}</span>,
      },
      {
        id: "toolName",
        accessorKey: "toolName",
        header: "工具",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.toolName}</span>,
      },
      {
        id: "calls",
        accessorKey: "calls",
        header: "调用",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.calls)}</span>,
      },
      {
        id: "inputTokens",
        accessorKey: "inputTokens",
        header: "输入 Token",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.inputTokens)}</span>,
      },
      {
        id: "outputTokens",
        accessorKey: "outputTokens",
        header: "输出 Token",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.outputTokens)}</span>,
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: "成本",
        cell: ({ row }) => <span className="num text-xs">{formatCompactCurrency(row.original.cost)}</span>,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="用量统计"
        description="按租户、模型与工具查看调用量、Token 与成本分布，支持明细下钻与报表订阅。数据为本地演示数据。"
        badges={<Badge variant="info">每小时更新</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filteredRecords.length} 条用量明细（演示）`)}
            >
              <Download />
              导出明细
            </Button>
            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
              <Trash2 />
              清理明细
            </Button>
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <Send />
              订阅报表
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="本月调用量" value={stats.calls} icon={Activity} delta={8.6} valueFormatter={formatCompact} />
        <StatCard
          label="输入 Token"
          value={stats.inputTokens}
          icon={Layers}
          delta={6.2}
          valueFormatter={formatCompact}
        />
        <StatCard
          label="输出 Token"
          value={stats.outputTokens}
          icon={Database}
          delta={3.4}
          valueFormatter={formatCompact}
        />
        <StatCard
          label="本月成本"
          value={stats.cost}
          icon={Coins}
          delta={-6.8}
          invertDelta
          tone="warning"
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="峰值并发"
          value={stats.concurrencyPeak}
          unit="并发"
          icon={Gauge}
          tone="info"
          hint="所有租户中的最大并发"
        />
        <StatCard
          label="存储占用"
          value={stats.storageGb}
          unit="GB"
          icon={Boxes}
          tone="success"
          hint="含沙箱快照与产物"
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTenantFilter("all");
          setProjectFilter("all");
          setModelFilter("all");
          setAgentFilter("all");
          setToolFilter("all");
          setRangeFilter("30");
        }}
      >
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
        <FilterSelect label="项目" value={projectFilter} onChange={setProjectFilter} options={projectOptions} />
        <FilterSelect label="模型" value={modelFilter} onChange={setModelFilter} options={modelOptions} />
        <FilterSelect label="Agent" value={agentFilter} onChange={setAgentFilter} options={agentOptions} />
        <FilterSelect label="工具" value={toolFilter} onChange={setToolFilter} options={toolOptions} />
        <FilterSelect label="日期范围" value={rangeFilter} onChange={setRangeFilter} options={RANGE_OPTIONS} allLabel="近 30 天" />
      </FilterBar>

      <Tabs defaultValue="tenant">
        <TabsList>
          <TabsTrigger value="tenant">按租户</TabsTrigger>
          <TabsTrigger value="records">明细</TabsTrigger>
          <TabsTrigger value="models">按模型</TabsTrigger>
          <TabsTrigger value="tools">按工具</TabsTrigger>
        </TabsList>

        <TabsContent value="tenant">
          <DataTable
            columns={summaryColumns}
            data={filteredSummaries}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索租户…"
            onRowClick={(row) => setDetailSummary(row)}
            emptyTitle="没有符合条件的租户用量"
          />
        </TabsContent>

        <TabsContent value="records">
          <DataTable
            columns={recordColumns}
            data={filteredRecords}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索用户、项目、模型、工具…"
            pageSize={12}
            enableRowSelection
            onRowClick={(row) => setDetailRecord(row)}
            bulkActions={(rows, clear) => (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  toast.success(`已导出 ${rows.length} 条用量明细（演示）`);
                  clear();
                }}
              >
                <Download />
                批量导出
              </Button>
            )}
            emptyTitle="没有符合条件的用量明细"
          />
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <ChartCard
            title="模型调用与 Token 分布"
            description={`基于当前筛选的 ${filteredRecords.length} 条明细聚合，按模型排序`}
          >
            <BarDistributionChart
              data={modelAggregation}
              xKey="name"
              layout="vertical"
              height={Math.max(240, modelAggregation.length * 34)}
              series={[
                { key: "calls", name: "调用量", color: "var(--chart-1)" },
                { key: "tokens", name: "Token", color: "var(--chart-2)" },
              ]}
              valueFormatter={(value) => formatCompact(value)}
            />
          </ChartCard>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">模型</th>
                  <th className="px-3 py-2 text-right font-medium">调用量</th>
                  <th className="px-3 py-2 text-right font-medium">Token</th>
                  <th className="px-3 py-2 text-right font-medium">调用占比</th>
                </tr>
              </thead>
              <tbody>
                {modelAggregation.map((item) => {
                  const totalCalls = modelAggregation.reduce((total, entry) => total + entry.calls, 0);
                  const percent = totalCalls > 0 ? (item.calls / totalCalls) * 100 : 0;
                  return (
                    <tr key={item.name} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-2xs">{item.name}</td>
                      <td className="num px-3 py-2 text-right">{formatNumber(item.calls)}</td>
                      <td className="num px-3 py-2 text-right">{formatCompact(item.tokens)}</td>
                      <td className="num px-3 py-2 text-right">{percent.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-3">
          <section className="space-y-3">
            <SectionHeader
              title="工具调用占比"
              description="按调用次数统计，忽略小于 1% 的长尾工具不利于阅读时可切换筛选"
            />
            <ChartCard title="工具调用分布" description={`共 ${toolAggregation.length} 个工具产生调用`}>
              <DonutChart
                data={toolAggregation}
                height={320}
                valueFormatter={(value) => formatCompact(value)}
              />
            </ChartCard>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReportOpen(false);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>订阅用量报表</DialogTitle>
            <DialogDescription>按周期生成用量与成本报表，并发送到指定邮箱。</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>报表类型</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="usage">用量明细</SelectItem>
                        <SelectItem value="cost">成本汇总</SelectItem>
                        <SelectItem value="concurrency">并发峰值</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>统计周期</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RANGE_OPTIONS.map((option) => (
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>接收邮箱</FormLabel>
                    <FormControl>
                      <Input placeholder="finops@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setReportOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <Send />
                  创建订阅
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailSummary !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSummary(null);
        }}
        title={detailSummary?.tenantName ?? "租户用量"}
        description={detailSummary ? `${detailSummary.period} · ${label(detailSummary.plan)}` : undefined}
      >
        {detailSummary ? (
          <>
            <DetailSection title="用量概览">
              <DetailGrid>
                <DetailRow label="调用量">
                  <span className="num">{formatNumber(detailSummary.calls)}</span>
                </DetailRow>
                <DetailRow label="成本">
                  <span className="num">{formatCompactCurrency(detailSummary.cost)}</span>
                </DetailRow>
                <DetailRow label="输入 Token">
                  <span className="num">{formatCompact(detailSummary.inputTokens)}</span>
                </DetailRow>
                <DetailRow label="输出 Token">
                  <span className="num">{formatCompact(detailSummary.outputTokens)}</span>
                </DetailRow>
                <DetailRow label="峰值并发">
                  <span className="num">{detailSummary.concurrencyPeak}</span>
                </DetailRow>
                <DetailRow label="存储占用">
                  <span className="num">{detailSummary.storageGb} GB</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="环比变化" description="与上一个月度周期对比">
              <DetailGrid>
                <DetailRow label="调用环比">
                  <span className="num">
                    {detailSummary.previousCalls > 0
                      ? formatDelta(
                          ((detailSummary.calls - detailSummary.previousCalls) / detailSummary.previousCalls) * 100,
                        )
                      : "—"}
                  </span>
                </DetailRow>
                <DetailRow label="成本环比">
                  <span className="num">
                    {detailSummary.previousCost > 0
                      ? formatDelta(
                          ((detailSummary.cost - detailSummary.previousCost) / detailSummary.previousCost) * 100,
                        )
                      : "—"}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="调用趋势" description="按周期内的相对分布展示">
              <SparkLine data={detailSummary.trend} dataKey="calls" height={96} />
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <DetailSheet
        open={detailRecord !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRecord(null);
        }}
        title={detailRecord ? `${detailRecord.date} 用量明细` : "用量明细"}
        description={detailRecord ? `${detailRecord.tenantName} · ${detailRecord.userName}` : undefined}
      >
        {detailRecord ? (
          <>
            <DetailSection title="归属信息">
              <DetailGrid>
                <DetailRow label="租户">{detailRecord.tenantName}</DetailRow>
                <DetailRow label="用户">{detailRecord.userName}</DetailRow>
                <DetailRow label="项目">{detailRecord.projectName}</DetailRow>
                <DetailRow label="Agent">{detailRecord.agentName}</DetailRow>
                <DetailRow label="模型" mono>
                  {detailRecord.modelName}
                </DetailRow>
                <DetailRow label="工具" mono>
                  {detailRecord.toolName}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="用量与计费">
              <DetailGrid>
                <DetailRow label="调用量">
                  <span className="num">{formatNumber(detailRecord.calls)}</span>
                </DetailRow>
                <DetailRow label="输入 Token">
                  <span className="num">{formatNumber(detailRecord.inputTokens)}</span>
                </DetailRow>
                <DetailRow label="输出 Token">
                  <span className="num">{formatNumber(detailRecord.outputTokens)}</span>
                </DetailRow>
                <DetailRow label="成本">
                  <span className="num">{formatCompactCurrency(detailRecord.cost)}</span>
                </DetailRow>
                <DetailRow label="币种">{detailRecord.currency}</DetailRow>
                <DetailRow label="记录 ID" mono>
                  {detailRecord.id}
                </DetailRow>
              </DetailGrid>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="清理 7 天前的用量明细？"
        description="清理仅影响本地演示数据，统计汇总不受影响；该操作不可撤销。"
        confirmLabel="确认清理"
        loading={clearPending}
        onConfirm={confirmClear}
      />

      <div className="text-muted-foreground flex items-center gap-1.5 text-2xs">
        <Wrench className="size-3.5" />
        <span>用量数据按小时聚合，明细保留 30 天，用于演示与联调。</span>
      </div>
    </PageContainer>
  );
}
