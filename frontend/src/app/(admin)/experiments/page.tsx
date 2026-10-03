"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  FlaskConical,
  Gauge,
  Pause,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ToggleRight,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { RowActions } from "@/components/common/row-actions";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { experiments as experimentSeed, releases as releaseSeed } from "@/lib/mock-data/ops";
import { label } from "@/lib/labels";
import { formatDate, formatNumber, formatRelativeTime } from "@/lib/utils";
import type { Experiment, ReleaseRecord } from "@/types";

const TYPE_OPTIONS = [
  { value: "feature-flag", label: "功能开关" },
  { value: "ab-test", label: "A/B 实验" },
  { value: "rolling-release", label: "灰度发布" },
  { value: "shadow", label: "影子模式" },
];

const STATUS_OPTIONS = [
  { value: "running", label: "运行中" },
  { value: "paused", label: "已暂停" },
  { value: "completed", label: "已完成" },
  { value: "rolled-back", label: "已回滚" },
  { value: "draft", label: "草稿" },
];

const ENVIRONMENT_LABEL: Record<ReleaseRecord["environment"], string> = {
  dev: "开发",
  staging: "预发",
  production: "生产",
};

const ENVIRONMENT_OPTIONS = Object.entries(ENVIRONMENT_LABEL).map(([value, text]) => ({ value, label: text }));

const STRATEGY_OPTIONS = [
  { value: "canary", label: "金丝雀" },
  { value: "blue-green", label: "蓝绿" },
  { value: "rolling", label: "滚动" },
];

const AUDIENCE_OPTIONS = [
  "全部租户",
  "企业版租户",
  "内部员工",
  "新注册租户",
  "指定租户白名单",
].map((value) => ({ value, label: value }));

const variantSchema = z.object({
  name: z.string().min(1, "请填写变体名称"),
  weight: z.coerce.number().int().min(0, "权重不能为负").max(100, "权重不能超过 100"),
});

const experimentSchema = z
  .object({
    key: z
      .string()
      .min(2, "标识至少 2 个字符")
      .regex(/^[a-z0-9-]+$/, "标识只能包含小写字母、数字与连字符"),
    name: z.string().min(2, "名称至少 2 个字符").max(50, "名称过长"),
    type: z.enum(["feature-flag", "ab-test", "rolling-release", "shadow"]),
    trafficPercent: z.coerce.number().int().min(0, "流量不能为负").max(100, "流量不能超过 100"),
    audience: z.string().min(1, "请选择受众"),
    metric: z.string().min(1, "请填写核心指标"),
    variants: z.array(variantSchema).min(2, "至少 2 个变体").max(3, "最多 3 个变体"),
  })
  .refine((values) => values.variants.reduce((total, variant) => total + variant.weight, 0) === 100, {
    message: "变体权重合计必须等于 100",
    path: ["variants"],
  });

type ExperimentFormValues = z.infer<typeof experimentSchema>;

const releaseSchema = z.object({
  version: z.string().min(2, "请填写版本号").max(24, "版本号过长"),
  environment: z.enum(["dev", "staging", "production"]),
  strategy: z.enum(["canary", "blue-green", "rolling"]),
  notes: z.string().min(2, "请填写发布说明"),
});

type ReleaseFormValues = z.infer<typeof releaseSchema>;

function formatLift(value: number) {
  if (value === 0) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default function ExperimentsPage() {
  const [experimentList, setExperimentList] = React.useState<Experiment[]>(experimentSeed);
  const [releaseList, setReleaseList] = React.useState<ReleaseRecord[]>(releaseSeed);

  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");

  const [detailExperiment, setDetailExperiment] = React.useState<Experiment | null>(null);
  const [detailRelease, setDetailRelease] = React.useState<ReleaseRecord | null>(null);
  const [rollbackTarget, setRollbackTarget] = React.useState<Experiment | null>(null);
  const [releaseRollbackTarget, setReleaseRollbackTarget] = React.useState<ReleaseRecord | null>(null);
  const [experimentDialogOpen, setExperimentDialogOpen] = React.useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = React.useState(false);

  const ownerOptions = React.useMemo(
    () => Array.from(new Set(experimentList.map((experiment) => experiment.owner))).map((value) => ({ value, label: value })),
    [experimentList],
  );

  const filteredExperiments = React.useMemo(
    () =>
      experimentList.filter(
        (experiment) =>
          (typeFilter === "all" || experiment.type === typeFilter) &&
          (statusFilter === "all" || experiment.status === statusFilter) &&
          (ownerFilter === "all" || experiment.owner === ownerFilter),
      ),
    [experimentList, typeFilter, statusFilter, ownerFilter],
  );

  const featureFlags = React.useMemo(
    () => experimentList.filter((experiment) => experiment.type === "feature-flag"),
    [experimentList],
  );

  const stats = React.useMemo(() => {
    const running = experimentList.filter((experiment) => experiment.status === "running").length;
    const completed = experimentList.filter((experiment) => experiment.status === "completed").length;
    const paused = experimentList.filter((experiment) => experiment.status === "paused").length;
    const rolledBack = experimentList.filter((experiment) => experiment.status === "rolled-back").length;
    const active = experimentList.filter((experiment) => experiment.status !== "draft");
    const avgLift =
      active.length === 0 ? 0 : active.reduce((total, experiment) => total + experiment.lift, 0) / active.length;
    const avgConfidence =
      experimentList.length === 0
        ? 0
        : experimentList.reduce((total, experiment) => total + experiment.confidence, 0) / experimentList.length;
    return { running, completed, paused, rolledBack, avgLift, avgConfidence };
  }, [experimentList]);

  const experimentForm = useForm<ExperimentFormValues>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      key: "",
      name: "",
      type: "ab-test",
      trafficPercent: 20,
      audience: "全部租户",
      metric: "任务成功率",
      variants: [
        { name: "对照组", weight: 50 },
        { name: "实验组", weight: 50 },
      ],
    },
  });

  const variantArray = useFieldArray({ control: experimentForm.control, name: "variants" });

  const releaseForm = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: { version: "", environment: "staging", strategy: "canary", notes: "" },
  });

  const pauseExperiment = React.useCallback((experiment: Experiment) => {
    setExperimentList((list) =>
      list.map((item) => (item.id === experiment.id ? { ...item, status: "paused" } : item)),
    );
    toast.success(`已暂停「${experiment.name}」`);
  }, []);

  const rampExperiment = React.useCallback((experiment: Experiment) => {
    const nextTraffic = Math.min(100, experiment.trafficPercent + 10);
    setExperimentList((list) =>
      list.map((item) =>
        item.id === experiment.id ? { ...item, trafficPercent: nextTraffic, status: "running" } : item,
      ),
    );
    toast.success(`「${experiment.name}」已放量至 ${nextTraffic}%`);
  }, []);

  const toggleFeatureFlag = (experiment: Experiment, enabled: boolean) => {
    setExperimentList((list) =>
      list.map((item) => (item.id === experiment.id ? { ...item, status: enabled ? "running" : "paused" } : item)),
    );
    toast.success(enabled ? `已启用「${experiment.name}」` : `已停用「${experiment.name}」`);
  };

  const submitExperiment = (values: ExperimentFormValues) => {
    const experiment: Experiment = {
      id: `exp-${String(experimentList.length + 1).padStart(2, "0")}`,
      key: values.key,
      name: values.name,
      type: values.type,
      status: "draft",
      trafficPercent: values.trafficPercent,
      audience: values.audience,
      targetModel: "-",
      metric: values.metric,
      confidence: 0,
      lift: 0,
      variants: values.variants.map((variant, index) => ({
        id: `${values.key}-v${index + 1}`,
        name: variant.name,
        weight: variant.weight,
        metric: 0,
        conversions: 0,
      })),
      owner: "当前管理员",
      startedAt: new Date().toISOString(),
      endedAt: null,
      description: `${values.name}：${values.metric} 实验，流量 ${values.trafficPercent}%。`,
    };
    setExperimentList((list) => [experiment, ...list]);
    toast.success(`已创建实验「${values.name}」`);
    setExperimentDialogOpen(false);
    experimentForm.reset();
  };

  const submitRelease = (values: ReleaseFormValues) => {
    const release: ReleaseRecord = {
      id: `rel-${String(releaseList.length + 1).padStart(2, "0")}`,
      version: values.version,
      environment: values.environment,
      status: "in-progress",
      strategy: values.strategy,
      deployedBy: "当前管理员",
      deployedAt: new Date().toISOString(),
      durationMinutes: 0,
      rollbackAvailable: true,
      notes: values.notes,
    };
    setReleaseList((list) => [release, ...list]);
    toast.success(`已创建发布「${values.version}」并进入灰度`);
    setReleaseDialogOpen(false);
    releaseForm.reset();
  };

  const experimentColumns = React.useMemo<ColumnDef<Experiment, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "实验",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium" title={row.original.name}>
              {row.original.name}
            </p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.key}</p>
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
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "trafficPercent",
        accessorKey: "trafficPercent",
        header: "流量",
        cell: ({ row }) => <span className="num text-xs">{row.original.trafficPercent}%</span>,
      },
      {
        id: "audience",
        accessorKey: "audience",
        header: "受众",
        cell: ({ row }) => <span className="text-2xs">{row.original.audience}</span>,
      },
      {
        id: "metric",
        accessorKey: "metric",
        header: "核心指标",
        cell: ({ row }) => <span className="text-xs">{row.original.metric}</span>,
      },
      {
        id: "lift",
        accessorKey: "lift",
        header: "提升",
        cell: ({ row }) => (
          <span
            className={
              row.original.lift > 0
                ? "num text-xs text-emerald-600 dark:text-emerald-400"
                : row.original.lift < 0
                  ? "num text-xs text-red-600 dark:text-red-400"
                  : "num text-xs"
            }
          >
            {formatLift(row.original.lift)}
          </span>
        ),
      },
      {
        id: "confidence",
        accessorKey: "confidence",
        header: "置信度",
        cell: ({ row }) => (
          <div className="w-24 space-y-1">
            <span className="num text-2xs">{row.original.confidence}%</span>
            <Progress
              value={row.original.confidence}
              indicatorClassName={row.original.confidence >= 95 ? "bg-emerald-500" : "bg-primary"}
            />
          </div>
        ),
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "负责人",
        cell: ({ row }) => <span className="text-2xs">{row.original.owner}</span>,
      },
      {
        id: "startedAt",
        accessorKey: "startedAt",
        header: "开始时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.startedAt, "yyyy-MM-dd")}</span>
        ),
      },
      {
        id: "endedAt",
        accessorKey: "endedAt",
        header: "结束时间",
        cell: ({ row }) => (
          <span className="num text-2xs">
            {row.original.endedAt ? formatDate(row.original.endedAt, "yyyy-MM-dd") : "进行中"}
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
            onView={() => setDetailExperiment(row.original)}
            extraItems={[
              { label: "暂停实验", onSelect: () => pauseExperiment(row.original) },
              { label: "增加放量", onSelect: () => rampExperiment(row.original) },
              { label: "回滚实验", destructive: true, onSelect: () => setRollbackTarget(row.original) },
            ]}
          />
        ),
      },
    ],
    [pauseExperiment, rampExperiment],
  );

  const releaseColumns = React.useMemo<ColumnDef<ReleaseRecord, unknown>[]>(
    () => [
      {
        id: "version",
        accessorKey: "version",
        header: "版本",
        cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.version}</span>,
      },
      {
        id: "environment",
        accessorKey: "environment",
        header: "环境",
        cell: ({ row }) => <Badge variant="secondary">{ENVIRONMENT_LABEL[row.original.environment]}</Badge>,
      },
      {
        id: "strategy",
        accessorKey: "strategy",
        header: "策略",
        cell: ({ row }) => <Badge variant="outline">{label(row.original.strategy)}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "deployedBy",
        accessorKey: "deployedBy",
        header: "发布人",
        cell: ({ row }) => <span className="text-2xs">{row.original.deployedBy}</span>,
      },
      {
        id: "deployedAt",
        accessorKey: "deployedAt",
        header: "时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.deployedAt, "MM-dd HH:mm")}</span>
        ),
      },
      {
        id: "durationMinutes",
        accessorKey: "durationMinutes",
        header: "耗时",
        cell: ({ row }) => <span className="num text-xs">{row.original.durationMinutes} 分钟</span>,
      },
      {
        id: "rollbackAvailable",
        accessorKey: "rollbackAvailable",
        header: "可回滚",
        cell: ({ row }) => (
          <StatusBadge status={row.original.rollbackAvailable ? "enabled" : "disabled"} dot={false} />
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailRelease(row.original)}
            extraItems={[
              {
                label: "立即回滚",
                destructive: true,
                onSelect: () => setReleaseRollbackTarget(row.original),
              },
            ]}
            disabled={!row.original.rollbackAvailable}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="实验与发布"
        description="管理功能开关、A/B 实验、灰度发布与发布流水线，实时跟踪提升幅度与置信度。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setReleaseDialogOpen(true)}>
              <Rocket />
              新建发布
            </Button>
            <Button size="sm" onClick={() => setExperimentDialogOpen(true)}>
              <Plus />
              新建实验
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="运行中" value={stats.running} icon={Play} tone="success" />
        <StatCard label="已完成" value={stats.completed} icon={ShieldCheck} tone="info" />
        <StatCard label="已暂停" value={stats.paused} icon={Pause} tone="warning" />
        <StatCard label="已回滚" value={stats.rolledBack} icon={RotateCcw} tone="danger" />
        <StatCard
          label="平均提升"
          value={stats.avgLift}
          unit="%"
          icon={TrendingUp}
          tone={stats.avgLift >= 0 ? "success" : "danger"}
        />
        <StatCard label="平均置信度" value={stats.avgConfidence} unit="%" icon={Gauge} tone="info" />
      </StatCardGrid>

      <Tabs defaultValue="experiments">
        <TabsList>
          <TabsTrigger value="experiments">
            <FlaskConical />
            实验
          </TabsTrigger>
          <TabsTrigger value="releases">
            <Rocket />
            发布流水线
          </TabsTrigger>
          <TabsTrigger value="flags">
            <ToggleRight />
            功能开关
          </TabsTrigger>
        </TabsList>

        <TabsContent value="experiments" className="space-y-3">
          <FilterBar
            activeCount={[typeFilter, statusFilter, ownerFilter].filter((value) => value !== "all").length}
            onReset={() => {
              setTypeFilter("all");
              setStatusFilter("all");
              setOwnerFilter("all");
            }}
          >
            <FilterSelect label="类型" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            <FilterSelect label="负责人" value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} />
          </FilterBar>

          <DataTable
            columns={experimentColumns}
            data={filteredExperiments}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索实验名称、标识、指标…"
            onRowClick={(row) => setDetailExperiment(row)}
            emptyTitle="没有符合条件的实验"
          />
        </TabsContent>

        <TabsContent value="releases" className="space-y-3">
          <DataTable
            columns={releaseColumns}
            data={releaseList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索版本、发布人、说明…"
            onRowClick={(row) => setDetailRelease(row)}
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setReleaseDialogOpen(true)}>
                <Rocket />
                新建发布
              </Button>
            }
            emptyTitle="没有发布记录"
          />
        </TabsContent>

        <TabsContent value="flags" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featureFlags.map((flag) => (
              <Card key={flag.id} className="gap-0 py-4">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{flag.name}</p>
                      <p className="text-muted-foreground font-mono text-2xs">{flag.key}</p>
                    </div>
                    <Switch
                      checked={flag.status === "running"}
                      onCheckedChange={(value) => toggleFeatureFlag(flag, value)}
                      aria-label={`切换开关 ${flag.key}`}
                    />
                  </div>
                  <p className="text-muted-foreground text-2xs">{flag.description}</p>
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-muted-foreground">放量</span>
                    <span className="num">{flag.trafficPercent}%</span>
                  </div>
                  <Progress value={flag.trafficPercent} />
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={flag.status} />
                    <Badge variant="outline">白名单：{flag.audience}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <DetailSheet
        open={detailExperiment !== null}
        onOpenChange={(open) => {
          if (!open) setDetailExperiment(null);
        }}
        title={detailExperiment?.name ?? "实验详情"}
        description={detailExperiment ? `${detailExperiment.key} · ${label(detailExperiment.type)}` : undefined}
        footer={
          detailExperiment ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  pauseExperiment(detailExperiment);
                  setDetailExperiment(null);
                }}
              >
                <Pause />
                暂停
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    rampExperiment(detailExperiment);
                    setDetailExperiment(null);
                  }}
                >
                  <Sparkles />
                  增加放量
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setRollbackTarget(detailExperiment)}>
                  回滚
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailExperiment ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailExperiment.status} />
              <Badge variant="secondary">{label(detailExperiment.type)}</Badge>
              <Badge variant="outline">{detailExperiment.audience}</Badge>
            </div>

            <DetailSection title="实验概览">
              <DetailGrid>
                <DetailRow label="实验标识" mono>
                  {detailExperiment.key}
                </DetailRow>
                <DetailRow label="核心指标">{detailExperiment.metric}</DetailRow>
                <DetailRow label="目标模型" mono>
                  {detailExperiment.targetModel}
                </DetailRow>
                <DetailRow label="流量">
                  <span className="num">{detailExperiment.trafficPercent}%</span>
                </DetailRow>
                <DetailRow label="提升">
                  <span className="num">{formatLift(detailExperiment.lift)}</span>
                </DetailRow>
                <DetailRow label="负责人">{detailExperiment.owner}</DetailRow>
                <DetailRow label="开始时间">
                  <span className="num">{formatDate(detailExperiment.startedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="结束时间">
                  {detailExperiment.endedAt
                    ? formatDate(detailExperiment.endedAt, "yyyy-MM-dd HH:mm")
                    : "进行中"}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="变体表现" description="各变体的权重、指标与转化数">
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground text-2xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">变体</th>
                      <th className="px-3 py-2 text-right font-medium">权重</th>
                      <th className="px-3 py-2 text-right font-medium">指标</th>
                      <th className="px-3 py-2 text-right font-medium">转化数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailExperiment.variants.map((variant) => (
                      <tr key={variant.id} className="border-t border-border">
                        <td className="px-3 py-2">{variant.name}</td>
                        <td className="num px-3 py-2 text-right">{variant.weight}%</td>
                        <td className="num px-3 py-2 text-right">{variant.metric}</td>
                        <td className="num px-3 py-2 text-right">{formatNumber(variant.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailSection>

            <Alert variant={detailExperiment.confidence >= 95 ? "success" : "warning"}>
              <Activity />
              <AlertTitle>
                {detailExperiment.confidence >= 95 ? "结果达到统计显著" : "尚未达到统计显著"}
              </AlertTitle>
              <AlertDescription>
                当前置信度 {detailExperiment.confidence}%。
                {detailExperiment.confidence >= 95
                  ? "可考虑全量发布或将实验流量提升至 100%。"
                  : "建议继续累积样本，达到 95% 置信度后再做决策。"}
              </AlertDescription>
            </Alert>

            <DetailSection title="自动放量策略" description="根据指标表现自动调整流量的规则">
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
                <li>连续 2 小时核心指标优于基线且置信度 ≥ 95%，每次放量 10%。</li>
                <li>核心指标劣化超过 5% 时自动暂停并通知负责人。</li>
                <li>单次放量不超过 20%，24 小时内累计不超过 50%。</li>
              </ul>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <DetailSheet
        open={detailRelease !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRelease(null);
        }}
        title={`发布 ${detailRelease?.version ?? ""}`}
        description={detailRelease ? `${ENVIRONMENT_LABEL[detailRelease.environment]} · ${label(detailRelease.strategy)}` : undefined}
        footer={
          detailRelease ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground num text-2xs">
                {formatRelativeTime(detailRelease.deployedAt)}
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={!detailRelease.rollbackAvailable}
                onClick={() => setReleaseRollbackTarget(detailRelease)}
              >
                <RotateCcw />
                立即回滚
              </Button>
            </div>
          ) : null
        }
      >
        {detailRelease ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailRelease.status} />
              <Badge variant="secondary">{ENVIRONMENT_LABEL[detailRelease.environment]}</Badge>
              <Badge variant="outline">{label(detailRelease.strategy)}</Badge>
            </div>

            <DetailSection title="发布信息">
              <DetailGrid>
                <DetailRow label="版本" mono>
                  {detailRelease.version}
                </DetailRow>
                <DetailRow label="发布人">{detailRelease.deployedBy}</DetailRow>
                <DetailRow label="发布时间">
                  <span className="num">{formatDate(detailRelease.deployedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="耗时">
                  <span className="num">{detailRelease.durationMinutes} 分钟</span>
                </DetailRow>
                <DetailRow label="可回滚">
                  <StatusBadge status={detailRelease.rollbackAvailable ? "enabled" : "disabled"} />
                </DetailRow>
                <DetailRow label="发布编号" mono>
                  {detailRelease.id}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="发布说明">
              <p className="rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                {detailRelease.notes}
              </p>
            </DetailSection>

            <DetailSection title="回滚步骤" description="如需回滚，请按以下顺序执行">
              <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-xs">
                <li>将流量切回上一个稳定版本 {detailRelease.version} 的上一个发布。</li>
                <li>确认灰度实例全部下线并清理新版本镜像缓存。</li>
                <li>校验核心指标恢复基线后，解除变更冻结并归档复盘。</li>
              </ol>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <Dialog open={experimentDialogOpen} onOpenChange={setExperimentDialogOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建实验</DialogTitle>
            <DialogDescription>实验创建后为草稿状态，确认后即可开始放量。</DialogDescription>
          </DialogHeader>
          <Form {...experimentForm}>
            <form onSubmit={experimentForm.handleSubmit(submitExperiment)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={experimentForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>实验标识</FormLabel>
                      <FormControl>
                        <Input placeholder="ab-cheap-router" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={experimentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>实验名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：成本优先路由 A/B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={experimentForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>实验类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPE_OPTIONS.map((option) => (
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
                  control={experimentForm.control}
                  name="trafficPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>流量占比（%）</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={experimentForm.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>受众</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AUDIENCE_OPTIONS.map((option) => (
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
                  control={experimentForm.control}
                  name="metric"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>核心指标</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：任务成功率" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">变体配置</p>
                    <p className="text-muted-foreground text-2xs">2-3 个变体，权重合计必须为 100%。</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={variantArray.fields.length >= 3}
                    onClick={() => variantArray.append({ name: `变体 ${variantArray.fields.length + 1}`, weight: 0 })}
                  >
                    <Plus />
                    添加变体
                  </Button>
                </div>
                <div className="space-y-2">
                  {variantArray.fields.map((variant, index) => (
                    <div key={variant.id} className="flex items-end gap-2">
                      <FormField
                        control={experimentForm.control}
                        name={`variants.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-2xs">变体名称</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={experimentForm.control}
                        name={`variants.${index}.weight`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormLabel className="text-2xs">权重</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={100} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="移除变体"
                        disabled={variantArray.fields.length <= 2}
                        onClick={() => variantArray.remove(index)}
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
                {experimentForm.formState.errors.variants?.message ? (
                  <p className="text-destructive text-2xs">{experimentForm.formState.errors.variants.message}</p>
                ) : null}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setExperimentDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建实验
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建发布</DialogTitle>
            <DialogDescription>发布创建后进入灰度阶段，可按需回滚。</DialogDescription>
          </DialogHeader>
          <Form {...releaseForm}>
            <form onSubmit={releaseForm.handleSubmit(submitRelease)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={releaseForm.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>版本号</FormLabel>
                      <FormControl>
                        <Input placeholder="v2.16.0" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={releaseForm.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>环境</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ENVIRONMENT_OPTIONS.map((option) => (
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
                  control={releaseForm.control}
                  name="strategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>发布策略</FormLabel>
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
              </div>
              <FormField
                control={releaseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>发布说明</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="本次发布包含的变更…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setReleaseDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  开始发布
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rollbackTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRollbackTarget(null);
        }}
        title={`回滚实验「${rollbackTarget?.name ?? ""}」？`}
        description="回滚后实验流量将归零并恢复基线，已产生的样本数据仍会保留用于复盘。"
        confirmLabel="确认回滚"
        onConfirm={() => {
          if (!rollbackTarget) return;
          setExperimentList((list) =>
            list.map((item) =>
              item.id === rollbackTarget.id ? { ...item, status: "rolled-back", trafficPercent: 0 } : item,
            ),
          );
          toast.success(`已回滚实验「${rollbackTarget.name}」`);
          setRollbackTarget(null);
          setDetailExperiment(null);
        }}
      />

      <ConfirmDialog
        open={releaseRollbackTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReleaseRollbackTarget(null);
        }}
        title={`回滚发布「${releaseRollbackTarget?.version ?? ""}」？`}
        description="回滚会将流量切回上一个稳定版本，操作不可逆，请确认已完成指标评估。"
        confirmLabel="确认回滚"
        onConfirm={() => {
          if (!releaseRollbackTarget) return;
          setReleaseList((list) =>
            list.map((item) =>
              item.id === releaseRollbackTarget.id ? { ...item, status: "rolling-back" } : item,
            ),
          );
          toast.success(`已触发「${releaseRollbackTarget.version}」回滚`);
          setReleaseRollbackTarget(null);
          setDetailRelease(null);
        }}
      />
    </PageContainer>
  );
}
