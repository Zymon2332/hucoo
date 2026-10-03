"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowRight,
  Download,
  Gauge,
  GitBranch,
  Layers,
  Network,
  Plus,
  Route,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { platformModels, providerRoutes, routingRules } from "@/lib/mock-data/models";
import { label } from "@/lib/labels";
import { formatCompact, formatDate, formatPercent } from "@/lib/utils";
import type { ProviderRoute, RoutingRule } from "@/types";

const STRATEGY_OPTIONS = [
  { value: "cost", label: "成本优先" },
  { value: "latency", label: "延迟优先" },
  { value: "availability", label: "可用性优先" },
  { value: "quality", label: "质量优先" },
  { value: "round-robin", label: "轮询" },
];

const RULE_STATUS_OPTIONS = [
  { value: "enabled", label: "已启用" },
  { value: "draft", label: "草稿" },
  { value: "disabled", label: "已禁用" },
];

const COST_OWNER_OPTIONS = [
  { value: "tenant", label: "租户承担" },
  { value: "platform", label: "平台承担" },
  { value: "shared", label: "共同承担" },
];

const MODEL_OPTIONS = platformModels.map((model) => ({
  value: model.name,
  label: `${model.displayName}（${model.name}）`,
}));

const ruleSchema = z.object({
  name: z.string().min(2, "规则名称至少 2 个字符").max(40, "规则名称过长"),
  scope: z.string().min(1, "请填写作用域").max(20, "作用域过长"),
  priority: z.coerce.number().int("优先级必须为整数").min(1, "优先级至少为 1").max(99, "优先级过高"),
  matchTask: z.string().min(1, "请填写匹配任务").max(30, "匹配任务过长"),
  strategy: z.enum(["cost", "latency", "availability", "quality", "round-robin"]),
  primaryModel: z.string().min(1, "请选择主模型"),
  fallbackModels: z.array(z.string()),
  degradeToPlatform: z.boolean(),
  costOwnerOnFallback: z.enum(["tenant", "platform", "shared"]),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

const weightSchema = z.object({
  weight: z.coerce
    .number()
    .int("权重必须为整数")
    .min(0, "权重不能为负")
    .max(100, "权重不能超过 100"),
});

type WeightFormValues = z.infer<typeof weightSchema>;

const STRATEGY_CARDS: { strategy: string; title: string; description: string }[] = [
  {
    strategy: "cost",
    title: "按成本路由",
    description: "在满足质量基线的前提下优先选择单价更低或缓存命中率更高的模型，适合批处理与后台任务。",
  },
  {
    strategy: "latency",
    title: "按延迟路由",
    description: "根据 P95 延迟与队列深度选择最快可用模型，适合在线交互与实时 Agent。",
  },
  {
    strategy: "availability",
    title: "按可用性路由",
    description: "综合错误率与熔断状态，将流量导向最稳定的模型，适合合规与关键链路。",
  },
];

export default function ModelRoutingPage() {
  const [ruleList, setRuleList] = React.useState<RoutingRule[]>(routingRules);
  const [routeList, setRouteList] = React.useState<ProviderRoute[]>(providerRoutes);
  const [strategyFilter, setStrategyFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [scopeFilter, setScopeFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<RoutingRule | null>(null);
  const [detailRule, setDetailRule] = React.useState<RoutingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<RoutingRule | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [editingRoute, setEditingRoute] = React.useState<ProviderRoute | null>(null);

  const scopeOptions = React.useMemo(
    () =>
      Array.from(new Set(ruleList.map((rule) => rule.scope))).map((value) => ({
        value,
        label: value,
      })),
    [ruleList],
  );

  const filtered = React.useMemo(
    () =>
      ruleList.filter(
        (rule) =>
          (strategyFilter === "all" || rule.strategy === strategyFilter) &&
          (statusFilter === "all" || rule.status === statusFilter) &&
          (scopeFilter === "all" || rule.scope === scopeFilter),
      ),
    [ruleList, strategyFilter, statusFilter, scopeFilter],
  );

  const activeFilterCount = [strategyFilter, statusFilter, scopeFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const enabled = ruleList.filter((rule) => rule.status === "enabled").length;
    const draft = ruleList.filter((rule) => rule.status === "draft").length;
    const disabled = ruleList.filter((rule) => rule.status === "disabled").length;
    const averageHitRate =
      ruleList.length === 0
        ? 0
        : ruleList.reduce((sum, rule) => sum + rule.hitRate, 0) / ruleList.length;
    const degradeCount = Math.round(
      ruleList
        .filter((rule) => rule.degradeToPlatform)
        .reduce((sum, rule) => sum + rule.hitRate * 120, 0),
    );
    const providerCount = routeList.length;
    return { enabled, draft, disabled, averageHitRate, degradeCount, providerCount };
  }, [ruleList, routeList]);

  const ruleForm = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      scope: "全局",
      priority: ruleList.length + 1,
      matchTask: "default",
      strategy: "quality",
      primaryModel: platformModels[0]?.name ?? "",
      fallbackModels: [],
      degradeToPlatform: true,
      costOwnerOnFallback: "tenant",
    },
  });

  React.useEffect(() => {
    if (editingRule) {
      ruleForm.reset({
        name: editingRule.name,
        scope: editingRule.scope,
        priority: editingRule.priority,
        matchTask: editingRule.matchTask,
        strategy: editingRule.strategy,
        primaryModel: editingRule.primaryModel,
        fallbackModels: editingRule.fallbackModels,
        degradeToPlatform: editingRule.degradeToPlatform,
        costOwnerOnFallback: editingRule.costOwnerOnFallback,
      });
    } else {
      ruleForm.reset();
    }
  }, [editingRule, ruleForm]);

  const weightForm = useForm<WeightFormValues>({
    resolver: zodResolver(weightSchema),
    defaultValues: { weight: 30 },
  });

  React.useEffect(() => {
    if (editingRoute) {
      weightForm.reset({ weight: editingRoute.weight });
    }
  }, [editingRoute, weightForm]);

  const weightPreview = editingRoute
    ? routeList.reduce(
        (sum, route) => sum + (route.id === editingRoute.id ? 0 : route.weight),
        Number(weightForm.watch("weight") ?? 0),
      )
    : 0;

  const onRuleSubmit = (values: RuleFormValues) => {
    if (editingRule) {
      setRuleList((list) =>
        list.map((rule) =>
          rule.id === editingRule.id
            ? { ...rule, ...values, updatedAt: new Date().toISOString() }
            : rule,
        ),
      );
      toast.success(`已更新路由规则「${values.name}」`);
      setEditingRule(null);
      return;
    }
    const newRule: RoutingRule = {
      id: `rr-${String(ruleList.length + 1).padStart(2, "0")}`,
      name: values.name,
      scope: values.scope,
      priority: values.priority,
      matchTask: values.matchTask,
      matchTenantTier: values.scope === "全局" || values.scope === "平台默认" ? "全部" : "企业版",
      strategy: values.strategy,
      primaryModel: values.primaryModel,
      fallbackModels: values.fallbackModels,
      degradeToPlatform: values.degradeToPlatform,
      costOwnerOnFallback: values.costOwnerOnFallback,
      status: "draft",
      hitRate: 0,
      updatedAt: new Date().toISOString(),
    };
    setRuleList((list) => [newRule, ...list]);
    toast.success(`已创建路由规则「${values.name}」（草稿）`);
    setCreateOpen(false);
    ruleForm.reset();
  };

  const toggleRuleStatus = (rule: RoutingRule) => {
    const next: RoutingRule["status"] = rule.status === "enabled" ? "disabled" : "enabled";
    setRuleList((list) =>
      list.map((item) => (item.id === rule.id ? { ...item, status: next } : item)),
    );
    toast.success(next === "enabled" ? `已启用「${rule.name}」` : `已禁用「${rule.name}」`);
  };

  const duplicateRule = (rule: RoutingRule) => {
    setRuleList((list) => [
      {
        ...rule,
        id: `rr-${String(list.length + 1).padStart(2, "0")}`,
        name: `${rule.name}（副本）`,
        status: "draft",
        hitRate: 0,
        updatedAt: new Date().toISOString(),
      },
      ...list,
    ]);
    toast.success("已复制路由规则为草稿");
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setRuleList((list) => list.filter((rule) => rule.id !== deleteTarget.id));
      toast.success(`已删除路由规则「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 500);
  };

  const onWeightSubmit = (values: WeightFormValues) => {
    if (!editingRoute) return;
    const total = routeList.reduce(
      (sum, route) => sum + (route.id === editingRoute.id ? values.weight : route.weight),
      0,
    );
    if (total !== 100) {
      toast.error(`权重合计需为 100，当前为 ${total}`);
      return;
    }
    setRouteList((list) =>
      list.map((route) => (route.id === editingRoute.id ? { ...route, weight: values.weight } : route)),
    );
    toast.success(`已更新「${editingRoute.providerName}」的权重为 ${values.weight}`);
    setEditingRoute(null);
  };

  const ruleColumns: ColumnDef<RoutingRule, unknown>[] = [
    {
      id: "name",
        accessorKey: "name",
        header: "规则名",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">优先级 {row.original.priority}</p>
          </div>
        ),
      },
      {
        id: "scope",
        accessorKey: "scope",
        header: "作用域",
        cell: ({ row }) => <span className="text-2xs">{row.original.scope}</span>,
      },
      {
        id: "matchTask",
        accessorKey: "matchTask",
        header: "匹配任务",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.matchTask}</Badge>
        ),
      },
      {
        id: "strategy",
        accessorKey: "strategy",
        header: "策略",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.strategy)}</Badge>,
      },
      {
        id: "primaryModel",
        accessorKey: "primaryModel",
        header: "主模型",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.primaryModel}</span>,
      },
      {
        id: "fallbackModels",
        header: "兜底模型",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.fallbackModels.join("、")}>
            {row.original.fallbackModels.join(", ")}
          </span>
        ),
      },
      {
        id: "degradeToPlatform",
        accessorKey: "degradeToPlatform",
        header: "降级到平台",
        cell: ({ row }) =>
          row.original.degradeToPlatform ? (
            <Badge variant="success">已开启</Badge>
          ) : (
            <Badge variant="neutral">关闭</Badge>
          ),
      },
      {
        id: "costOwnerOnFallback",
        accessorKey: "costOwnerOnFallback",
        header: "降级费用归属",
        cell: ({ row }) => <span className="text-2xs">{label(row.original.costOwnerOnFallback)}</span>,
      },
      {
        id: "hitRate",
        accessorKey: "hitRate",
        header: "命中率",
        cell: ({ row }) => (
          <span className="num text-xs">{formatPercent(row.original.hitRate)}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.updatedAt, "yyyy-MM-dd HH:mm")}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailRule(row.original)}
            onEdit={() => setEditingRule(row.original)}
            onDuplicate={() => duplicateRule(row.original)}
            onToggleStatus={() => toggleRuleStatus(row.original)}
            statusActive={row.original.status === "enabled"}
            onDelete={() => setDeleteTarget(row.original)}
          />
        ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="模型路由"
        description="配置任务级路由策略、供应商权重与降级链路，在成本、延迟与可用性之间取得平衡。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条路由规则（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              新建规则
            </Button>
          </>
        }
        badges={<Badge variant="secondary">流量调度</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="启用规则" value={stats.enabled} icon={Route} tone="success" />
        <StatCard label="草稿" value={stats.draft} icon={Layers} tone="info" />
        <StatCard label="已禁用" value={stats.disabled} icon={GitBranch} />
        <StatCard
          label="平均命中率"
          value={stats.averageHitRate}
          valueFormatter={(value) => formatPercent(value)}
          icon={TrendingUp}
        />
        <StatCard
          label="降级次数（近似）"
          value={stats.degradeCount}
          valueFormatter={(value) => formatCompact(value)}
          icon={ShieldAlert}
          tone="warning"
        />
        <StatCard label="涉及供应商" value={stats.providerCount} icon={Network} />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setStrategyFilter("all");
          setStatusFilter("all");
          setScopeFilter("all");
        }}
      >
        <FilterSelect
          label="策略"
          value={strategyFilter}
          onChange={setStrategyFilter}
          options={STRATEGY_OPTIONS}
        />
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={RULE_STATUS_OPTIONS}
        />
        <FilterSelect label="作用域" value={scopeFilter} onChange={setScopeFilter} options={scopeOptions} />
      </FilterBar>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">路由规则</TabsTrigger>
          <TabsTrigger value="providers">供应商路由</TabsTrigger>
          <TabsTrigger value="degrade">降级策略说明</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <DataTable
            columns={ruleColumns}
            data={filtered}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索规则名、作用域、模型…"
            onRowClick={(row) => setDetailRule(row)}
            emptyTitle="没有符合条件的路由规则"
            emptyDescription="调整策略、状态或作用域筛选，或新建一条路由规则。"
            emptyAction={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                新建规则
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="providers">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-2xs">
                供应商权重之和需保持 100%，用于轮询与加权负载均衡。
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("已按当前权重下发供应商路由配置")}
              >
                <Gauge />
                下发配置
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {["供应商", "区域", "权重", "最大并发", "超时", "重试次数", "状态", ""].map(
                      (head) => (
                        <TableHead key={head}>{head}</TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routeList.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="text-xs font-medium">{route.providerName}</TableCell>
                      <TableCell className="text-2xs">{route.region}</TableCell>
                      <TableCell>
                        <div className="flex w-40 items-center gap-2">
                          <Progress value={route.weight} className="flex-1" />
                          <span className="num w-8 text-right text-2xs">{route.weight}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="num text-xs">{route.maxConcurrency}</TableCell>
                      <TableCell className="num text-xs">{formatCompact(route.timeoutMs)} ms</TableCell>
                      <TableCell className="num text-xs">{route.retries}</TableCell>
                      <TableCell>
                        <StatusBadge status={route.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <RowActions
                            onEdit={() => setEditingRoute(route)}
                            extraItems={[
                              {
                                label: "编辑权重",
                                onSelect: () => setEditingRoute(route),
                              },
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="degrade">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {STRATEGY_CARDS.map((card) => (
                <Card key={card.strategy} className="gap-0 py-4">
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
                        <Route className="size-4" />
                      </span>
                      <p className="text-xs font-semibold">{card.title}</p>
                    </div>
                    <p className="text-muted-foreground text-2xs leading-relaxed">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="gap-0 py-4">
              <CardContent className="space-y-3">
                <SectionHeader title="Fallback 链" description="主模型不可用时按顺序逐级降级" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">主模型</Badge>
                  <ArrowRight className="text-muted-foreground size-3.5" />
                  <Badge variant="secondary">兜底模型 1</Badge>
                  <ArrowRight className="text-muted-foreground size-3.5" />
                  <Badge variant="secondary">兜底模型 2</Badge>
                  <ArrowRight className="text-muted-foreground size-3.5" />
                  <Badge variant="outline">平台默认模型</Badge>
                </div>
                <p className="text-muted-foreground text-2xs leading-relaxed">
                  当主模型触发熔断、超时或错误率阈值时，请求自动切换到兜底模型；若全部兜底失败，则降级到平台默认模型，
                  保证任务不中断。
                </p>
              </CardContent>
            </Card>

            <Card className="gap-0 py-4">
              <CardContent className="space-y-3">
                <SectionHeader
                  title="降级费用归属规则"
                  description="明确降级后产生的调用由谁承担，避免结算争议"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  {COST_OWNER_OPTIONS.map((option) => (
                    <div key={option.value} className="rounded-md border border-border p-3">
                      <p className="text-xs font-medium">{option.label}</p>
                      <p className="text-muted-foreground mt-1 text-2xs leading-relaxed">
                        {option.value === "tenant"
                          ? "降级调用费用由发起调用的租户承担，计入其月度账单。"
                          : option.value === "platform"
                            ? "因平台侧故障触发的降级由平台承担费用，不计入租户账单。"
                            : "按约定的比例在平台与租户之间分摊，默认 6:4。"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen || editingRule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingRule(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? `编辑规则 · ${editingRule.name}` : "新建路由规则"}</DialogTitle>
            <DialogDescription>
              配置匹配任务、优先级、主模型与兜底链路。新建规则默认保存为草稿。
            </DialogDescription>
          </DialogHeader>
          <Form {...ruleForm}>
            <form onSubmit={ruleForm.handleSubmit(onRuleSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={ruleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>规则名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：研发代码任务路由" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作用域</FormLabel>
                      <FormControl>
                        <Input placeholder="全局 / 平台默认 / 租户名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={99} {...field} />
                      </FormControl>
                      <FormDescription>数值越小优先级越高。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="matchTask"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>匹配任务</FormLabel>
                      <FormControl>
                        <Input placeholder="coding / support / default" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="strategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>路由策略</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STRATEGY_OPTIONS.map((option) => (
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
                  control={ruleForm.control}
                  name="primaryModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主模型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODEL_OPTIONS.map((option) => (
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
                  control={ruleForm.control}
                  name="costOwnerOnFallback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>降级费用归属</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COST_OWNER_OPTIONS.map((option) => (
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
                control={ruleForm.control}
                name="fallbackModels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>兜底模型</FormLabel>
                    <div className="grid max-h-52 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
                      {MODEL_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-2xs hover:bg-accent"
                        >
                          <Checkbox
                            checked={field.value.includes(option.value)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, option.value]
                                  : field.value.filter((value) => value !== option.value),
                              )
                            }
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <FormDescription>按选择顺序作为降级链路。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={ruleForm.control}
                name="degradeToPlatform"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <p className="text-xs font-medium">降级到平台模型</p>
                        <p className="text-muted-foreground text-2xs">
                          开启后，全部兜底模型不可用时自动降级到平台默认模型。
                        </p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingRule(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingRule ? "保存修改" : "创建规则"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingRoute !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRoute(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? `编辑权重 · ${editingRoute.providerName}` : "编辑权重"}
            </DialogTitle>
            <DialogDescription>调整供应商权重后，全部供应商权重合计必须为 100%。</DialogDescription>
          </DialogHeader>
          <Form {...weightForm}>
            <form onSubmit={weightForm.handleSubmit(onWeightSubmit)} className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-2xs">
                <span className="text-muted-foreground">权重合计</span>
                <span
                  className={
                    weightPreview === 100
                      ? "num font-medium text-emerald-600 dark:text-emerald-400"
                      : "num font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {weightPreview}%
                </span>
              </div>
              <FormField
                control={weightForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>权重（%）</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormDescription>
                      其余 {routeList.length - 1} 个供应商已占用 {weightPreview - Number(weightForm.watch("weight") ?? 0)}%。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRoute(null)}>
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={weightPreview !== 100}>
                  保存权重
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailRule !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRule(null);
        }}
        title={detailRule?.name ?? "路由规则详情"}
        description={detailRule ? `${detailRule.scope} · 优先级 ${detailRule.priority}` : undefined}
        footer={
          detailRule ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailRule.status} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleRuleStatus(detailRule)}>
                  {detailRule.status === "enabled" ? "禁用" : "启用"}
                </Button>
                <Button size="sm" onClick={() => setEditingRule(detailRule)}>
                  编辑
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailRule ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailRule.status} />
              <Badge variant="secondary">{label(detailRule.strategy)}</Badge>
              <Badge variant="outline">匹配 {detailRule.matchTask}</Badge>
            </div>

            <DetailSection title="规则配置">
              <DetailGrid>
                <DetailRow label="作用域">{detailRule.scope}</DetailRow>
                <DetailRow label="优先级">
                  <span className="num">{detailRule.priority}</span>
                </DetailRow>
                <DetailRow label="匹配任务">{detailRule.matchTask}</DetailRow>
                <DetailRow label="租户等级">{detailRule.matchTenantTier}</DetailRow>
                <DetailRow label="路由策略">{label(detailRule.strategy)}</DetailRow>
                <DetailRow label="命中率">
                  <span className="num">{formatPercent(detailRule.hitRate)}</span>
                </DetailRow>
                <DetailRow label="降级到平台">
                  {detailRule.degradeToPlatform ? "已开启" : "关闭"}
                </DetailRow>
                <DetailRow label="降级费用归属">{label(detailRule.costOwnerOnFallback)}</DetailRow>
                <DetailRow label="更新时间">
                  <span className="num">{formatDate(detailRule.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="模型链路">
              <DetailRow label="主模型" mono>
                {detailRule.primaryModel}
              </DetailRow>
              <DetailRow label="兜底模型">
                {detailRule.fallbackModels.length === 0 ? (
                  <span className="text-muted-foreground text-2xs">未配置</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {detailRule.fallbackModels.map((model) => (
                      <Badge key={model} variant="outline" className="font-mono">
                        {model}
                      </Badge>
                    ))}
                  </div>
                )}
              </DetailRow>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除路由规则「${deleteTarget?.name ?? ""}」？`}
        description="删除后匹配该任务的流量将回退到平台默认路由策略，操作不可撤销。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
