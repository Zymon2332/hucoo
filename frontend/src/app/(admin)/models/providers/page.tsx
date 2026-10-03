"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Coins,
  Download,
  HeartPulse,
  KeyRound,
  RefreshCw,
  Server,
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
import { Switch } from "@/components/ui/switch";
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
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { ChartCard } from "@/components/common/chart-card";
import { SparkLine } from "@/components/charts";
import { modelProviders, platformModels } from "@/lib/mock-data/models";
import { formatDate, formatNumber, formatRelativeTime, truncate } from "@/lib/utils";
import type { ModelProvider } from "@/types";

const PROVIDER_TYPE_LABEL: Record<ModelProvider["type"], string> = {
  platform: "平台直连",
  "open-source": "开源模型池",
  local: "本地部署",
  gateway: "企业网关",
};

const PROVIDER_TYPE_OPTIONS = [
  { value: "platform", label: "平台直连" },
  { value: "open-source", label: "开源模型池" },
  { value: "local", label: "本地部署" },
  { value: "gateway", label: "企业网关" },
];

const PROVIDER_STATUS_OPTIONS = [
  { value: "healthy", label: "健康" },
  { value: "degraded", label: "降级" },
  { value: "down", label: "不可用" },
  { value: "maintenance", label: "维护中" },
];

const PROVIDER_TYPE_BADGE: Record<ModelProvider["type"], "default" | "secondary" | "success" | "warning"> = {
  platform: "default",
  "open-source": "secondary",
  local: "success",
  gateway: "warning",
};

const PROVIDER_NOTES: Record<ModelProvider["type"], string> = {
  platform: "官方商用 API 直连，密钥由平台统一托管与轮换，按官方价目结算。",
  "open-source": "平台自托管开源权重模型池，按集群资源折算成本，无外部密钥。",
  local: "部署在客户机房或专有云，数据不出域，需单独评估网络与容量。",
  gateway: "经企业统一网关代理，集中鉴权限流，需关注网关侧审计与出网策略。",
};

const providerSchema = z.object({
  name: z.string().min(2, "供应商名称至少 2 个字符").max(40, "供应商名称过长"),
  baseUrl: z.string().url("请输入合法的 Base URL"),
  region: z.string().min(1, "请选择区域"),
  rateLimit: z.string().min(1, "请填写限流策略").max(60, "限流策略过长"),
  priceMultiplier: z.coerce
    .number()
    .min(0.1, "价格倍率不得低于 0.1")
    .max(5, "价格倍率不得高于 5"),
  apiKeyManaged: z.boolean(),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

export default function ModelProvidersPage() {
  const [providerList, setProviderList] = React.useState<ModelProvider[]>(modelProviders);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [regionFilter, setRegionFilter] = React.useState("all");
  const [editingProvider, setEditingProvider] = React.useState<ModelProvider | null>(null);
  const [detailProvider, setDetailProvider] = React.useState<ModelProvider | null>(null);

  const regionOptions = React.useMemo(
    () =>
      Array.from(new Set(providerList.map((provider) => provider.region))).map((value) => ({
        value,
        label: value,
      })),
    [providerList],
  );

  const filtered = React.useMemo(
    () =>
      providerList.filter(
        (provider) =>
          (typeFilter === "all" || provider.type === typeFilter) &&
          (statusFilter === "all" || provider.status === statusFilter) &&
          (regionFilter === "all" || provider.region === regionFilter),
      ),
    [providerList, typeFilter, statusFilter, regionFilter],
  );

  const activeFilterCount = [typeFilter, statusFilter, regionFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = providerList.length;
    const healthy = providerList.filter((provider) => provider.status === "healthy").length;
    const degraded = providerList.filter((provider) => provider.status === "degraded").length;
    const maintenance = providerList.filter((provider) => provider.status === "maintenance").length;
    const managedKeys = providerList.filter((provider) => provider.apiKeyManaged).length;
    const averageMultiplier =
      total === 0
        ? 0
        : providerList.reduce((sum, provider) => sum + provider.priceMultiplier, 0) / total;
    return { total, healthy, degraded, maintenance, managedKeys, averageMultiplier };
  }, [providerList]);

  const providerModels = React.useMemo(() => {
    if (!detailProvider) return [];
    return platformModels.filter((model) => model.providerId === detailProvider.id);
  }, [detailProvider]);

  const healthTrend = React.useMemo(() => {
    if (!detailProvider) return [];
    const base = detailProvider.latencyP95;
    return Array.from({ length: 12 }).map((_, index) => ({
      name: `${index + 1}`,
      latency: Math.round(base * (0.82 + ((index * 37) % 32) / 100)),
      errorRate: Number((detailProvider.errorRate * (0.6 + ((index * 53) % 80) / 100)).toFixed(2)),
    }));
  }, [detailProvider]);

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      name: "",
      baseUrl: "",
      region: regionOptions[0]?.value ?? "",
      rateLimit: "",
      priceMultiplier: 1,
      apiKeyManaged: true,
    },
  });

  React.useEffect(() => {
    if (editingProvider) {
      form.reset({
        name: editingProvider.name,
        baseUrl: editingProvider.baseUrl,
        region: editingProvider.region,
        rateLimit: editingProvider.rateLimit,
        priceMultiplier: editingProvider.priceMultiplier,
        apiKeyManaged: editingProvider.apiKeyManaged,
      });
    }
  }, [editingProvider, form]);

  const onSubmit = (values: ProviderFormValues) => {
    if (!editingProvider) return;
    setProviderList((list) =>
      list.map((provider) =>
        provider.id === editingProvider.id ? { ...provider, ...values } : provider,
      ),
    );
    toast.success(`已更新供应商「${values.name}」`);
    setEditingProvider(null);
  };

  const runHealthCheck = (provider: ModelProvider) => {
    const now = new Date().toISOString();
    setProviderList((list) =>
      list.map((item) => (item.id === provider.id ? { ...item, lastCheckedAt: now } : item)),
    );
    toast.success(`已触发「${provider.name}」健康检查，状态已刷新`);
  };

  const runAllHealthChecks = () => {
    const now = new Date().toISOString();
    setProviderList((list) => list.map((provider) => ({ ...provider, lastCheckedAt: now })));
    toast.success(`已对 ${providerList.length} 个供应商发起健康检查`);
  };

  const columns: ColumnDef<ModelProvider, unknown>[] = [
    {
      id: "name",
        accessorKey: "name",
        header: "供应商",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.code}</p>
          </div>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => (
          <Badge variant={PROVIDER_TYPE_BADGE[row.original.type]}>
            {PROVIDER_TYPE_LABEL[row.original.type]}
          </Badge>
        ),
      },
      {
        id: "baseUrl",
        accessorKey: "baseUrl",
        header: "Base URL",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.baseUrl}>
            {truncate(row.original.baseUrl, 30)}
          </span>
        ),
      },
      {
        id: "region",
        accessorKey: "region",
        header: "区域",
        cell: ({ row }) => <span className="text-2xs">{row.original.region}</span>,
      },
      {
        id: "apiKeyManaged",
        accessorKey: "apiKeyManaged",
        header: "API Key 托管",
        cell: ({ row }) =>
          row.original.apiKeyManaged ? (
            <Badge variant="success">已托管</Badge>
          ) : (
            <Badge variant="neutral">不适用</Badge>
          ),
      },
      {
        id: "rateLimit",
        accessorKey: "rateLimit",
        header: "限流",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">{row.original.rateLimit}</span>
        ),
      },
      {
        id: "priceMultiplier",
        accessorKey: "priceMultiplier",
        header: "价格倍率",
        cell: ({ row }) => (
          <span className="num text-xs">×{row.original.priceMultiplier.toFixed(2)}</span>
        ),
      },
      {
        id: "modelCount",
        accessorKey: "modelCount",
        header: "模型数",
        cell: ({ row }) => <span className="num text-xs">{row.original.modelCount}</span>,
      },
      {
        id: "latencyP95",
        accessorKey: "latencyP95",
        header: "P95 延迟",
        cell: ({ row }) => (
          <span className="num text-xs">{formatNumber(row.original.latencyP95)} ms</span>
        ),
      },
      {
        id: "errorRate",
        accessorKey: "errorRate",
        header: "错误率",
        cell: ({ row }) => <span className="num text-xs">{row.original.errorRate.toFixed(2)}%</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "健康状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "lastCheckedAt",
        accessorKey: "lastCheckedAt",
        header: "最后检查",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {formatRelativeTime(row.original.lastCheckedAt)}
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
            onView={() => setDetailProvider(row.original)}
            onEdit={() => setEditingProvider(row.original)}
            extraItems={[{ label: "健康检查", onSelect: () => runHealthCheck(row.original) }]}
          />
        ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="供应商管理"
        description="维护模型供应商的接入地址、区域、限流、价格倍率与健康状态，并托管平台侧 API Key。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 个供应商配置（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={runAllHealthChecks}>
              <RefreshCw />
              健康检查
            </Button>
          </>
        }
        badges={<Badge variant="secondary">接入层</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="供应商数" value={stats.total} icon={Server} />
        <StatCard label="健康" value={stats.healthy} icon={HeartPulse} tone="success" />
        <StatCard label="降级" value={stats.degraded} icon={Activity} tone="warning" />
        <StatCard label="维护中" value={stats.maintenance} icon={Wrench} tone="info" />
        <StatCard label="托管密钥" value={stats.managedKeys} icon={KeyRound} />
        <StatCard
          label="平均价格倍率"
          value={stats.averageMultiplier}
          valueFormatter={(value) => `×${value.toFixed(2)}`}
          icon={Coins}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTypeFilter("all");
          setStatusFilter("all");
          setRegionFilter("all");
        }}
      >
        <FilterSelect
          label="类型"
          value={typeFilter}
          onChange={setTypeFilter}
          options={PROVIDER_TYPE_OPTIONS}
        />
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={PROVIDER_STATUS_OPTIONS}
        />
        <FilterSelect label="区域" value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索供应商名称、编码、Base URL…"
        onRowClick={(row) => setDetailProvider(row)}
        emptyTitle="没有符合条件的供应商"
        emptyDescription="调整类型、状态或区域筛选后重试。"
      />

      <Dialog
        open={editingProvider !== null}
        onOpenChange={(open) => {
          if (!open) setEditingProvider(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? `编辑供应商 · ${editingProvider.name}` : "编辑供应商"}
            </DialogTitle>
            <DialogDescription>修改接入参数后立即对新建流量生效。</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>供应商名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：OpenAI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>区域</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regionOptions.map((option) => (
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
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com/v1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="rateLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>限流策略</FormLabel>
                      <FormControl>
                        <Input placeholder="10,000 RPM · 2M TPM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>价格倍率</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0.1} max={5} {...field} />
                      </FormControl>
                      <FormDescription>取值 0.1 – 5.0。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="apiKeyManaged"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <p className="text-xs font-medium">平台托管 API Key</p>
                        <p className="text-muted-foreground text-2xs">
                          开启后平台负责密钥加密存储与轮换，关闭则使用无密钥或合作方密钥。
                        </p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingProvider(null)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  保存修改
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailProvider !== null}
        onOpenChange={(open) => {
          if (!open) setDetailProvider(null);
        }}
        title={detailProvider?.name ?? "供应商详情"}
        description={detailProvider ? `${detailProvider.code} · ${detailProvider.region}` : undefined}
        footer={
          detailProvider ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailProvider.status} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runHealthCheck(detailProvider)}
                >
                  <RefreshCw />
                  健康检查
                </Button>
                <Button size="sm" onClick={() => setEditingProvider(detailProvider)}>
                  编辑
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailProvider ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailProvider.status} />
              <Badge variant={PROVIDER_TYPE_BADGE[detailProvider.type]}>
                {PROVIDER_TYPE_LABEL[detailProvider.type]}
              </Badge>
              {detailProvider.apiKeyManaged ? (
                <Badge variant="success">密钥已托管</Badge>
              ) : (
                <Badge variant="neutral">无托管密钥</Badge>
              )}
            </div>

            <DetailSection title="接入信息">
              <DetailGrid>
                <DetailRow label="编码">
                  <span className="font-mono text-2xs">{detailProvider.code}</span>
                </DetailRow>
                <DetailRow label="区域">{detailProvider.region}</DetailRow>
                <DetailRow label="Base URL" mono>
                  {detailProvider.baseUrl}
                </DetailRow>
                <DetailRow label="限流">{detailProvider.rateLimit}</DetailRow>
                <DetailRow label="价格倍率">
                  <span className="num">×{detailProvider.priceMultiplier.toFixed(2)}</span>
                </DetailRow>
                <DetailRow label="模型数">
                  <span className="num">{detailProvider.modelCount}</span>
                </DetailRow>
                <DetailRow label="P95 延迟">
                  <span className="num">{formatNumber(detailProvider.latencyP95)} ms</span>
                </DetailRow>
                <DetailRow label="错误率">
                  <span className="num">{detailProvider.errorRate.toFixed(2)}%</span>
                </DetailRow>
                <DetailRow label="最后检查">
                  <span className="num">
                    {formatDate(detailProvider.lastCheckedAt, "yyyy-MM-dd HH:mm")}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <ChartCard
              title="健康趋势"
              description="近 12 次探测的 P95 延迟（ms）与错误率（%）"
              contentClassName="space-y-3"
            >
              <div>
                <p className="text-muted-foreground text-2xs">P95 延迟</p>
                <SparkLine data={healthTrend} dataKey="latency" height={44} />
              </div>
              <div>
                <p className="text-muted-foreground text-2xs">错误率</p>
                <SparkLine data={healthTrend} dataKey="errorRate" height={44} color="var(--chart-3)" />
              </div>
            </ChartCard>

            <DetailSection
              title="平台模型"
              description={`该供应商下共 ${providerModels.length} 个模型`}
            >
              {providerModels.length === 0 ? (
                <p className="text-muted-foreground text-2xs">该供应商下暂无平台模型。</p>
              ) : (
                <div className="overflow-hidden rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>名称</TableHead>
                        <TableHead>上下文</TableHead>
                        <TableHead>价格（入/出）</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerModels.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell>
                            <p className="text-xs font-medium">{model.displayName}</p>
                            <p className="text-muted-foreground font-mono text-2xs">{model.name}</p>
                          </TableCell>
                          <TableCell className="num">
                            {formatNumber(model.contextWindow)}
                          </TableCell>
                          <TableCell className="num text-2xs">
                            ¥{formatNumber(model.inputPrice)} / ¥{formatNumber(model.outputPrice)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={model.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DetailSection>

            <DetailSection title="备注">
              <p className="text-muted-foreground text-2xs leading-relaxed">
                {PROVIDER_NOTES[detailProvider.type]}
              </p>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>
    </PageContainer>
  );
}
