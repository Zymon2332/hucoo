"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Boxes,
  CheckCircle2,
  CircleOff,
  Coins,
  Download,
  FlaskConical,
  Globe,
  Plus,
  Route,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import {
  customModels,
  modelProviders,
  platformModels,
  routingRules,
} from "@/lib/mock-data/models";
import { label } from "@/lib/labels";
import { formatCompact, formatDate, formatNumber } from "@/lib/utils";
import type { ModelCapability, PlatformModel } from "@/types";

const CAPABILITY_VALUES = [
  "chat",
  "reasoning",
  "vision",
  "audio",
  "embedding",
  "rerank",
  "tool-calling",
  "json-mode",
  "long-context",
] as const;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "公开可见" },
  { value: "tenant", label: "指定租户" },
  { value: "private", label: "平台内部" },
];

const MODEL_STATUS_OPTIONS = [
  { value: "online", label: "已上线" },
  { value: "beta", label: "灰度 beta" },
  { value: "offline", label: "已下线" },
  { value: "deprecated", label: "已弃用" },
];

const PROVIDER_OPTIONS = modelProviders.map((provider) => ({
  value: provider.id,
  label: provider.name,
}));

const platformModelSchema = z.object({
  name: z.string().min(2, "模型名称至少 2 个字符").max(60, "模型名称过长"),
  displayName: z.string().min(1, "请填写展示名称").max(60, "展示名称过长"),
  providerId: z.string().min(1, "请选择供应商"),
  capabilities: z.array(z.enum(CAPABILITY_VALUES)).min(1, "至少选择一项能力"),
  contextWindow: z.coerce
    .number()
    .int("上下文窗口必须为整数")
    .min(1_000, "上下文窗口过小")
    .max(10_000_000, "上下文窗口过大"),
  maxOutput: z.coerce.number().int("最大输出必须为整数").min(0, "最大输出不能为负").max(200_000, "最大输出过大"),
  inputPrice: z.coerce.number().min(0, "输入价格不能为负").max(10_000, "输入价格过高"),
  outputPrice: z.coerce.number().min(0, "输出价格不能为负").max(10_000, "输出价格过高"),
  visibility: z.enum(["public", "tenant", "private"]),
  status: z.enum(["online", "beta", "offline", "deprecated"]),
  description: z.string().min(4, "请填写模型描述").max(200, "描述过长"),
});

type PlatformModelFormValues = z.infer<typeof platformModelSchema>;

const VISIBILITY_BADGE: Record<PlatformModel["visibility"], "success" | "info" | "neutral"> = {
  public: "success",
  tenant: "info",
  private: "neutral",
};

export default function PlatformModelsPage() {
  const [modelList, setModelList] = React.useState<PlatformModel[]>(platformModels);
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [capabilityFilter, setCapabilityFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [visibilityFilter, setVisibilityFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingModel, setEditingModel] = React.useState<PlatformModel | null>(null);
  const [detailModel, setDetailModel] = React.useState<PlatformModel | null>(null);
  const [offlineTarget, setOfflineTarget] = React.useState<PlatformModel | null>(null);
  const [offlinePending, setOfflinePending] = React.useState(false);

  const filtered = React.useMemo(
    () =>
      modelList.filter(
        (model) =>
          (providerFilter === "all" || model.providerId === providerFilter) &&
          (capabilityFilter === "all" ||
            model.capabilities.includes(capabilityFilter as ModelCapability)) &&
          (statusFilter === "all" || model.status === statusFilter) &&
          (visibilityFilter === "all" || model.visibility === visibilityFilter),
      ),
    [modelList, providerFilter, capabilityFilter, statusFilter, visibilityFilter],
  );

  const activeFilterCount = [
    providerFilter,
    capabilityFilter,
    statusFilter,
    visibilityFilter,
  ].filter((value) => value !== "all").length;

  const stats = React.useMemo(() => {
    const total = modelList.length;
    const online = modelList.filter((model) => model.status === "online").length;
    const beta = modelList.filter((model) => model.status === "beta").length;
    const offline = modelList.filter((model) => model.status === "offline").length;
    const publicVisible = modelList.filter((model) => model.visibility === "public").length;
    const averageInput =
      total === 0
        ? 0
        : modelList.reduce((sum, model) => sum + model.inputPrice, 0) / total;
    return { total, online, beta, offline, publicVisible, averageInput };
  }, [modelList]);

  const routingHits = React.useMemo(() => {
    if (!detailModel) return [];
    return routingRules.filter(
      (rule) =>
        rule.primaryModel === detailModel.name ||
        rule.fallbackModels.includes(detailModel.name),
    );
  }, [detailModel]);

  const offlineImpact = React.useMemo(() => {
    if (!offlineTarget) return { rules: 0, models: 0 };
    const rules = routingRules.filter(
      (rule) =>
        rule.primaryModel === offlineTarget.name ||
        rule.fallbackModels.includes(offlineTarget.name),
    ).length;
    const models = customModels.filter(
      (model) => model.fallbackModel === offlineTarget.name,
    ).length;
    return { rules, models };
  }, [offlineTarget]);

  const form = useForm<PlatformModelFormValues>({
    resolver: zodResolver(platformModelSchema),
    defaultValues: {
      name: "",
      displayName: "",
      providerId: modelProviders[0]?.id ?? "",
      capabilities: ["chat"],
      contextWindow: 128_000,
      maxOutput: 16_384,
      inputPrice: 1,
      outputPrice: 4,
      visibility: "public",
      status: "beta",
      description: "",
    },
  });

  React.useEffect(() => {
    if (editingModel) {
      form.reset({
        name: editingModel.name,
        displayName: editingModel.displayName,
        providerId: editingModel.providerId,
        capabilities: editingModel.capabilities,
        contextWindow: editingModel.contextWindow,
        maxOutput: editingModel.maxOutput,
        inputPrice: editingModel.inputPrice,
        outputPrice: editingModel.outputPrice,
        visibility: editingModel.visibility,
        status: editingModel.status,
        description: editingModel.description,
      });
    } else {
      form.reset();
    }
  }, [editingModel, form]);

  const onSubmit = (values: PlatformModelFormValues) => {
    const provider = modelProviders.find((item) => item.id === values.providerId);

    if (editingModel) {
      setModelList((list) =>
        list.map((model) =>
          model.id === editingModel.id
            ? {
                ...model,
                ...values,
                providerName: provider?.name ?? model.providerName,
                rateLimit: provider?.rateLimit ?? model.rateLimit,
                updatedAt: new Date().toISOString(),
              }
            : model,
        ),
      );
      toast.success(`已更新模型「${values.displayName}」`);
      setEditingModel(null);
      return;
    }

    const newModel: PlatformModel = {
      id: `pm-${String(modelList.length + 1).padStart(2, "0")}`,
      name: values.name,
      displayName: values.displayName,
      providerId: values.providerId,
      providerName: provider?.name ?? "—",
      capabilities: values.capabilities,
      contextWindow: values.contextWindow,
      maxOutput: values.maxOutput,
      inputPrice: values.inputPrice,
      outputPrice: values.outputPrice,
      currency: "CNY",
      status: values.status,
      visibility: values.visibility,
      rateLimit: provider?.rateLimit ?? "—",
      tags: ["新建"],
      description: values.description,
      updatedAt: new Date().toISOString(),
    };

    setModelList((list) => [newModel, ...list]);
    toast.success(`已上架模型「${values.displayName}」`);
    setCreateOpen(false);
    form.reset();
  };

  const publishModel = (model: PlatformModel) => {
    setModelList((list) =>
      list.map((item) =>
        item.id === model.id
          ? { ...item, status: "online", updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    toast.success(`已上架「${model.displayName}」，对${label(model.visibility)}生效`);
  };

  const confirmOffline = () => {
    if (!offlineTarget) return;
    setOfflinePending(true);
    window.setTimeout(() => {
      setModelList((list) =>
        list.map((item) =>
          item.id === offlineTarget.id
            ? { ...item, status: "offline", updatedAt: new Date().toISOString() }
            : item,
        ),
      );
      toast.success(`已下架「${offlineTarget.displayName}」，调用将回退到兜底模型`);
      setOfflinePending(false);
      setOfflineTarget(null);
    }, 500);
  };

  const duplicateModel = (model: PlatformModel) => {
    setModelList((list) => [
      {
        ...model,
        id: `pm-${String(list.length + 1).padStart(2, "0")}`,
        name: `${model.name}-copy`,
        displayName: `${model.displayName}（副本）`,
        status: "beta",
        updatedAt: new Date().toISOString(),
      },
      ...list,
    ]);
    toast.success(`已复制模型「${model.displayName}」为灰度草稿`);
  };

  const columns: ColumnDef<PlatformModel, unknown>[] = [
    {
      id: "displayName",
        accessorKey: "displayName",
        header: "模型",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{row.original.displayName}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.name}</p>
          </div>
        ),
      },
      {
        id: "providerName",
        accessorKey: "providerName",
        header: "供应商",
        cell: ({ row }) => <span className="text-2xs">{row.original.providerName}</span>,
      },
      {
        id: "capabilities",
        header: "能力",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex max-w-[15rem] flex-wrap gap-1">
            {row.original.capabilities.slice(0, 3).map((capability) => (
              <Badge key={capability} variant="outline">
                {label(capability)}
              </Badge>
            ))}
            {row.original.capabilities.length > 3 ? (
              <Badge variant="secondary" className="num">
                +{row.original.capabilities.length - 3}
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: "contextWindow",
        accessorKey: "contextWindow",
        header: "上下文",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompact(row.original.contextWindow)}</span>
        ),
      },
      {
        id: "price",
        header: "价格（元/百万 token）",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>入 {formatNumber(row.original.inputPrice)}</p>
            <p className="text-muted-foreground">出 {formatNumber(row.original.outputPrice)}</p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "visibility",
        accessorKey: "visibility",
        header: "可见范围",
        cell: ({ row }) => (
          <Badge variant={VISIBILITY_BADGE[row.original.visibility]}>
            {label(row.original.visibility)}
          </Badge>
        ),
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
            onView={() => setDetailModel(row.original)}
            onEdit={() => setEditingModel(row.original)}
            onDuplicate={() => duplicateModel(row.original)}
            extraItems={
              row.original.status === "offline"
                ? [
                    {
                      label: "上架开放",
                      onSelect: () => publishModel(row.original),
                    },
                  ]
                : [
                    {
                      label: "下架模型",
                      onSelect: () => setOfflineTarget(row.original),
                      destructive: true,
                    },
                  ]
            }
          />
        ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="平台模型治理"
        description="维护平台托管的模型目录，管理上下架、可见范围、能力标签与定价。所有操作仅更新本地演示状态。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条模型数据（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              上架模型
            </Button>
          </>
        }
        badges={<Badge variant="secondary">平台目录</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="平台模型数" value={stats.total} icon={Boxes} hint="含上下架与灰度模型" />
        <StatCard label="在线模型" value={stats.online} icon={CheckCircle2} tone="success" />
        <StatCard label="灰度 beta" value={stats.beta} icon={FlaskConical} tone="info" hint="仅对受邀租户开放" />
        <StatCard label="已下线" value={stats.offline} icon={CircleOff} tone="warning" />
        <StatCard label="公开可见" value={stats.publicVisible} icon={Globe} tone="info" />
        <StatCard
          label="平均输入价"
          value={stats.averageInput}
          valueFormatter={(value) => `¥${value.toFixed(2)}`}
          unit="元/百万"
          icon={Coins}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setProviderFilter("all");
          setCapabilityFilter("all");
          setStatusFilter("all");
          setVisibilityFilter("all");
        }}
      >
        <FilterSelect
          label="供应商"
          value={providerFilter}
          onChange={setProviderFilter}
          options={PROVIDER_OPTIONS}
        />
        <FilterSelect
          label="能力"
          value={capabilityFilter}
          onChange={setCapabilityFilter}
          options={CAPABILITY_VALUES.map((value) => ({ value, label: label(value) }))}
        />
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={MODEL_STATUS_OPTIONS}
        />
        <FilterSelect
          label="可见范围"
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={VISIBILITY_OPTIONS}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索模型名称、标签、供应商…"
        onRowClick={(row) => setDetailModel(row)}
        emptyTitle="没有符合条件的模型"
        emptyDescription="调整供应商、能力或状态筛选，或上架一个新的平台模型。"
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            上架模型
          </Button>
        }
      />

      <Dialog
        open={createOpen || editingModel !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingModel(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? `编辑模型 · ${editingModel.displayName}` : "上架模型"}
            </DialogTitle>
            <DialogDescription>
              配置模型能力、上下文与定价。上架后立即进入租户可选目录（按可见范围生效）。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>展示名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：GPT-4.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模型标识</FormLabel>
                      <FormControl>
                        <Input placeholder="gpt-4.1" {...field} />
                      </FormControl>
                      <FormDescription>调用时使用的 model 参数。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>供应商</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROVIDER_OPTIONS.map((option) => (
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
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>可见范围</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VISIBILITY_OPTIONS.map((option) => (
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
                  name="contextWindow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>上下文窗口（token）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1000} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxOutput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最大输出（token）</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inputPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>输入价格（元/百万）</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outputPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>输出价格（元/百万）</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>状态</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODEL_STATUS_OPTIONS.map((option) => (
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
                name="capabilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模型能力</FormLabel>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CAPABILITY_VALUES.map((capability) => (
                        <label
                          key={capability}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-2xs"
                        >
                          <Checkbox
                            checked={field.value.includes(capability)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, capability]
                                  : field.value.filter((item) => item !== capability),
                              )
                            }
                          />
                          {label(capability)}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模型描述</FormLabel>
                    <FormControl>
                      <Textarea placeholder="描述适用场景与限制…" {...field} />
                    </FormControl>
                    <FormMessage />
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
                    setEditingModel(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingModel ? (
                    <>
                      <Upload />
                      保存修改
                    </>
                  ) : (
                    <>
                      <Upload />
                      确认上架
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailModel !== null}
        onOpenChange={(open) => {
          if (!open) setDetailModel(null);
        }}
        title={detailModel?.displayName ?? "模型详情"}
        description={detailModel ? `${detailModel.name} · ${detailModel.providerName}` : undefined}
        footer={
          detailModel ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailModel.status} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingModel(detailModel)}>
                  编辑
                </Button>
                {detailModel.status === "offline" ? (
                  <Button size="sm" onClick={() => publishModel(detailModel)}>
                    上架开放
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={() => setOfflineTarget(detailModel)}>
                    下架模型
                  </Button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {detailModel ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailModel.status} />
              <Badge variant={VISIBILITY_BADGE[detailModel.visibility]}>
                {label(detailModel.visibility)}
              </Badge>
              {detailModel.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <DetailSection title="模型能力">
              <div className="flex flex-wrap gap-1.5">
                {detailModel.capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary">
                    {label(capability)}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-2xs leading-relaxed">{detailModel.description}</p>
            </DetailSection>

            <DetailSection title="价格与上下文">
              <DetailGrid>
                <DetailRow label="上下文窗口">
                  <span className="num">{formatNumber(detailModel.contextWindow)} token</span>
                </DetailRow>
                <DetailRow label="最大输出">
                  <span className="num">{formatNumber(detailModel.maxOutput)} token</span>
                </DetailRow>
                <DetailRow label="输入价格">
                  <span className="num">¥{formatNumber(detailModel.inputPrice)} / 百万</span>
                </DetailRow>
                <DetailRow label="输出价格">
                  <span className="num">¥{formatNumber(detailModel.outputPrice)} / 百万</span>
                </DetailRow>
                <DetailRow label="币种">{detailModel.currency}</DetailRow>
                <DetailRow label="更新时间">
                  <span className="num">{formatDate(detailModel.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="限流与标签">
              <DetailRow label="限流策略">{detailModel.rateLimit}</DetailRow>
              <DetailRow label="标签">
                <div className="flex flex-wrap gap-1.5">
                  {detailModel.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
            </DetailSection>

            <DetailSection title="可见范围">
              <DetailRow label="范围类型">
                <Badge variant={VISIBILITY_BADGE[detailModel.visibility]}>
                  {label(detailModel.visibility)}
                </Badge>
              </DetailRow>
            </DetailSection>

            <DetailSection
              title="路由命中"
              description={`${routingHits.length} 条路由规则引用该模型`}
            >
              {routingHits.length === 0 ? (
                <p className="text-muted-foreground text-2xs">暂无路由规则引用该模型。</p>
              ) : (
                <div className="space-y-1.5">
                  {routingHits.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Route className="text-muted-foreground size-3.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{rule.name}</p>
                          <p className="text-muted-foreground text-2xs">
                            {rule.scope} · {label(rule.strategy)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {rule.primaryModel === detailModel.name ? (
                          <Badge variant="default">主模型</Badge>
                        ) : (
                          <Badge variant="outline">兜底</Badge>
                        )}
                        <span className="num text-2xs">{rule.hitRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={offlineTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOfflineTarget(null);
        }}
        title={`下架模型「${offlineTarget?.displayName ?? ""}」？`}
        description={
          <span>
            下架后将停止新调用，预计影响 <span className="num font-medium">{offlineImpact.rules}</span> 条路由规则与{" "}
            <span className="num font-medium">{offlineImpact.models}</span> 个自定义模型的兜底链路，请确认已有替代模型。
          </span>
        }
        confirmLabel="确认下架"
        loading={offlinePending}
        onConfirm={confirmOffline}
      />
    </PageContainer>
  );
}
