"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FlaskConical,
  Package,
  Plus,
  PowerOff,
  RotateCcw,
  Star,
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { agentTemplates as templateSeed, tools } from "@/lib/mock-data/capability";
import { label } from "@/lib/labels";
import { formatCompact, formatDate } from "@/lib/utils";
import type { AgentTemplate, AgentTemplateCategory } from "@/types";

const CATEGORIES: AgentTemplateCategory[] = [
  "coding",
  "review",
  "testing",
  "ops",
  "data",
  "writing",
  "support",
];

const CATEGORY_OPTIONS = CATEGORIES.map((value) => ({ value, label: label(value) }));

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "in-review", label: "审核中" },
  { value: "published", label: "已上架" },
  { value: "gray", label: "灰度发布" },
  { value: "offline", label: "已下线" },
  { value: "rejected", label: "已拒绝" },
];

const VISIBILITY_OPTIONS = [
  { value: "platform", label: "平台级" },
  { value: "market", label: "市场可见" },
  { value: "tenant", label: "租户可见" },
  { value: "private", label: "私有" },
];

const VISIBILITY_LABEL: Record<AgentTemplate["visibility"], string> = {
  platform: "平台级",
  market: "市场可见",
  tenant: "租户可见",
  private: "私有",
};

const templateSchema = z.object({
  name: z.string().min(2, "模板名称至少 2 个字符").max(40, "模板名称过长"),
  code: z
    .string()
    .min(2, "模板编码至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "只能包含小写字母、数字与连字符"),
  category: z.enum(["coding", "review", "testing", "ops", "data", "writing", "support"]),
  description: z.string().min(4, "请填写模板描述").max(160, "描述过长"),
  systemPrompt: z.string().min(10, "系统提示词至少 10 个字符").max(2000, "系统提示词过长"),
  modelPolicy: z.string().min(2, "请填写模型策略").max(80, "模型策略过长"),
  toolWhitelist: z.array(z.string()),
  knowledgeBases: z.string(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function AgentTemplatesPage() {
  const [templateList, setTemplateList] = React.useState<AgentTemplate[]>(templateSeed);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [visibilityFilter, setVisibilityFilter] = React.useState("all");
  const [publisherFilter, setPublisherFilter] = React.useState("all");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<AgentTemplate | null>(null);
  const [detailTemplate, setDetailTemplate] = React.useState<AgentTemplate | null>(null);
  const [grayTarget, setGrayTarget] = React.useState<AgentTemplate | null>(null);
  const [grayPercent, setGrayPercent] = React.useState(10);
  const [rollbackTarget, setRollbackTarget] = React.useState<AgentTemplate | null>(null);

  const publisherOptions = React.useMemo(
    () =>
      Array.from(new Set(templateList.map((template) => template.publisher))).map((value) => ({
        value,
        label: value,
      })),
    [templateList],
  );

  const filtered = React.useMemo(
    () =>
      templateList.filter(
        (template) =>
          (categoryFilter === "all" || template.category === categoryFilter) &&
          (statusFilter === "all" || template.status === statusFilter) &&
          (visibilityFilter === "all" || template.visibility === visibilityFilter) &&
          (publisherFilter === "all" || template.publisher === publisherFilter),
      ),
    [templateList, categoryFilter, statusFilter, visibilityFilter, publisherFilter],
  );

  const activeFilterCount = [categoryFilter, statusFilter, visibilityFilter, publisherFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = templateList.length;
    const published = templateList.filter((template) => template.status === "published").length;
    const inReview = templateList.filter((template) => template.status === "in-review").length;
    const gray = templateList.filter((template) => template.status === "gray").length;
    const offline = templateList.filter(
      (template) => template.status === "offline" || template.status === "rejected",
    ).length;
    const installs = templateList.reduce((sum, template) => sum + template.installs, 0);
    return { total, published, inReview, gray, offline, installs };
  }, [templateList]);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "coding",
      description: "",
      systemPrompt: "",
      modelPolicy: "claude-sonnet-4.5 主，gpt-4.1 兜底",
      toolWhitelist: [],
      knowledgeBases: "",
    },
  });

  React.useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        code: editingTemplate.code,
        category: editingTemplate.category,
        description: editingTemplate.description,
        systemPrompt: editingTemplate.systemPrompt,
        modelPolicy: editingTemplate.modelPolicy,
        toolWhitelist: editingTemplate.toolWhitelist,
        knowledgeBases: editingTemplate.knowledgeBases.join("\n"),
      });
    } else {
      form.reset({
        name: "",
        code: "",
        category: "coding",
        description: "",
        systemPrompt: "",
        modelPolicy: "claude-sonnet-4.5 主，gpt-4.1 兜底",
        toolWhitelist: [],
        knowledgeBases: "",
      });
    }
  }, [editingTemplate, form]);

  const onSubmit = (values: TemplateFormValues) => {
    const knowledgeBases = values.knowledgeBases
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (editingTemplate) {
      setTemplateList((list) =>
        list.map((template) =>
          template.id === editingTemplate.id
            ? { ...template, ...values, knowledgeBases }
            : template,
        ),
      );
      toast.success(`已更新模板「${values.name}」`);
      setEditingTemplate(null);
      return;
    }
    const newTemplate: AgentTemplate = {
      id: `at-${String(templateList.length + 1).padStart(2, "0")}`,
      ...values,
      knowledgeBases,
      forbiddenModels: [],
      forbiddenTools: [],
      version: "0.1.0",
      status: "draft",
      visibility: "private",
      installs: 0,
      rating: 0,
      reviews: 0,
      publisher: "当前管理员",
      grayPercent: 0,
      changelog: "初始版本。",
      updatedAt: new Date().toISOString(),
    };
    setTemplateList((list) => [newTemplate, ...list]);
    toast.success(`已创建模板「${values.name}」并保存为草稿`);
    setCreateOpen(false);
    form.reset();
  };

  const updateStatus = (template: AgentTemplate, status: AgentTemplate["status"], message: string) => {
    setTemplateList((list) =>
      list.map((item) =>
        item.id === template.id
          ? { ...item, status, grayPercent: status === "gray" ? item.grayPercent : 0 }
          : item,
      ),
    );
    toast.success(message);
  };

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("已复制系统提示词");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const columns = React.useMemo<ColumnDef<AgentTemplate, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "模板",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.code}</p>
          </div>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "分类",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.category)}</Badge>,
      },
      {
        id: "version",
        accessorKey: "version",
        header: "版本",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">v{row.original.version}</span>
        ),
      },
      {
        id: "modelPolicy",
        accessorKey: "modelPolicy",
        header: "模型策略",
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-1 text-2xs">{row.original.modelPolicy}</span>
        ),
      },
      {
        id: "toolWhitelist",
        header: "工具数",
        enableSorting: false,
        cell: ({ row }) => <span className="num text-xs">{row.original.toolWhitelist.length}</span>,
      },
      {
        id: "knowledgeBases",
        header: "知识库数",
        enableSorting: false,
        cell: ({ row }) => <span className="num text-xs">{row.original.knowledgeBases.length}</span>,
      },
      {
        id: "installs",
        accessorKey: "installs",
        header: "安装量",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.installs)}</span>,
      },
      {
        id: "rating",
        accessorKey: "rating",
        header: "评分",
        cell: ({ row }) => (
          <span className="num flex items-center gap-1 text-xs">
            <Star className="size-3 text-amber-500" />
            {row.original.rating.toFixed(2)}
            <span className="text-muted-foreground">({formatCompact(row.original.reviews)})</span>
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
        id: "publisher",
        accessorKey: "publisher",
        header: "发布者",
        cell: ({ row }) => <span className="text-2xs">{row.original.publisher}</span>,
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.updatedAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => {
          const template = row.original;
          return (
            <RowActions
              onView={() => setDetailTemplate(template)}
              onEdit={() => setEditingTemplate(template)}
              extraItems={[
                ...(template.status !== "published"
                  ? [
                      {
                        label: "上架模板",
                        onSelect: () =>
                          updateStatus(template, "published", `已上架模板「${template.name}」`),
                      },
                    ]
                  : []),
                ...(template.status === "published" || template.status === "gray"
                  ? [
                      {
                        label: "下架模板",
                        onSelect: () =>
                          updateStatus(template, "offline", `已下架模板「${template.name}」`),
                      },
                    ]
                  : []),
                {
                  label: "设置灰度",
                  onSelect: () => {
                    setGrayPercent(template.grayPercent > 0 ? template.grayPercent : 10);
                    setGrayTarget(template);
                  },
                },
                {
                  label: "回滚版本",
                  onSelect: () => setRollbackTarget(template),
                },
              ]}
            />
          );
        },
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Agent 模板"
        description="维护 Agent 的系统提示词、模型策略、工具白名单与知识库，并管理上下架与灰度发布。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条模板数据（演示）`)}
            >
              <Upload />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              创建模板
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="模板总数" value={stats.total} icon={Package} delta={3.1} />
        <StatCard label="已上架" value={stats.published} icon={CheckCircle2} tone="success" />
        <StatCard label="审核中" value={stats.inReview} icon={Clock} tone="info" />
        <StatCard label="灰度中" value={stats.gray} icon={FlaskConical} tone="warning" />
        <StatCard label="已下线" value={stats.offline} icon={PowerOff} tone="danger" />
        <StatCard
          label="总安装量"
          value={stats.installs}
          icon={Download}
          valueFormatter={(value) => formatCompact(value)}
          delta={12.4}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setCategoryFilter("all");
          setStatusFilter("all");
          setVisibilityFilter("all");
          setPublisherFilter("all");
        }}
      >
        <FilterSelect label="分类" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="可见范围" value={visibilityFilter} onChange={setVisibilityFilter} options={VISIBILITY_OPTIONS} />
        <FilterSelect label="发布者" value={publisherFilter} onChange={setPublisherFilter} options={publisherOptions} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索模板名称、编码、发布者…"
        onRowClick={(row) => setDetailTemplate(row)}
        emptyTitle="没有符合条件的 Agent 模板"
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            创建模板
          </Button>
        }
      />

      <Dialog
        open={createOpen || editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingTemplate(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? `编辑模板 · ${editingTemplate.name}` : "创建 Agent 模板"}</DialogTitle>
            <DialogDescription>
              新建模板默认保存为私有草稿，提交审核通过后可按平台、租户或市场范围发布。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模板名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：接口联调助手" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模板编码</FormLabel>
                      <FormControl>
                        <Input placeholder="api-integration" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分类</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
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
                  name="modelPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模型策略</FormLabel>
                      <FormControl>
                        <Input placeholder="主模型与兜底模型" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模板描述</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="一句话说明模板的适用场景" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>系统提示词</FormLabel>
                    <FormControl>
                      <Textarea rows={6} className="font-mono text-2xs" placeholder="定义角色、约束与输出规范" {...field} />
                    </FormControl>
                    <FormDescription>提示词会随模板版本一起发布与回滚。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toolWhitelist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>工具白名单</FormLabel>
                    <ScrollArea className="h-40 rounded-md border border-border p-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {tools.map((tool) => {
                          const checked = field.value.includes(tool.code);
                          return (
                            <label
                              key={tool.id}
                              className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-2xs hover:bg-accent"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  if (value === true) {
                                    field.onChange([...field.value, tool.code]);
                                  } else {
                                    field.onChange(field.value.filter((code) => code !== tool.code));
                                  }
                                }}
                              />
                              <span className="truncate">{tool.name}</span>
                              <span className="text-muted-foreground ml-auto font-mono">{tool.code}</span>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <FormDescription>仅白名单内的工具可被该模板调用，敏感工具建议保持关闭。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="knowledgeBases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联知识库</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={"仓库规范\nAPI 手册（每行一个）"} {...field} />
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
                    setEditingTemplate(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingTemplate ? "保存修改" : "创建模板"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={grayTarget !== null}
        onOpenChange={(open) => {
          if (!open) setGrayTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>设置灰度比例</DialogTitle>
            <DialogDescription>
              灰度期间仅指定比例的流量会路由到新版本，其余流量继续使用线上稳定版本。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">灰度流量比例</span>
              <span className="num font-medium">{grayPercent}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={grayPercent}
              onChange={(event) => setGrayPercent(Number(event.target.value))}
              className="w-full accent-primary"
              aria-label="灰度比例"
            />
            <div className="flex justify-between text-2xs text-muted-foreground">
              <span>5%</span>
              <span>50%</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGrayTarget(null)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!grayTarget) return;
                setTemplateList((list) =>
                  list.map((item) =>
                    item.id === grayTarget.id ? { ...item, status: "gray", grayPercent } : item,
                  ),
                );
                toast.success(`已按 ${grayPercent}% 灰度发布「${grayTarget.name}」`);
                setGrayTarget(null);
              }}
            >
              开始灰度
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTemplate(null);
        }}
        title={detailTemplate?.name ?? "模板详情"}
        description={detailTemplate ? `${detailTemplate.code} · v${detailTemplate.version}` : undefined}
        footer={
          detailTemplate ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-2xs">
                {VISIBILITY_LABEL[detailTemplate.visibility]} · 更新于 {formatDate(detailTemplate.updatedAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingTemplate(detailTemplate)}>
                  编辑
                </Button>
                {detailTemplate.status === "published" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatus(detailTemplate, "offline", `已下架模板「${detailTemplate.name}」`)
                    }
                  >
                    下架模板
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatus(detailTemplate, "published", `已上架模板「${detailTemplate.name}」`)
                    }
                  >
                    上架模板
                  </Button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {detailTemplate ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailTemplate.status} />
              <Badge variant="secondary">{label(detailTemplate.category)}</Badge>
              <Badge variant="outline">{VISIBILITY_LABEL[detailTemplate.visibility]}</Badge>
              <Badge variant="neutral">v{detailTemplate.version}</Badge>
            </div>

            <DetailSection title="模板描述">
              <p className="text-muted-foreground text-2xs leading-relaxed">{detailTemplate.description}</p>
            </DetailSection>

            <DetailSection
              title="系统提示词"
              description="运行时注入的系统级指令"
            >
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => void copyPrompt(detailTemplate.systemPrompt)}
                  >
                    <Copy />
                    复制提示词
                  </Button>
                </div>
                <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-2xs leading-relaxed whitespace-pre-wrap">
                  {detailTemplate.systemPrompt}
                </pre>
              </div>
            </DetailSection>

            <DetailSection title="模型策略">
              <DetailGrid>
                <DetailRow label="策略">{detailTemplate.modelPolicy}</DetailRow>
                <DetailRow label="禁止模型">
                  <div className="flex flex-wrap gap-1">
                    {detailTemplate.forbiddenModels.length > 0 ? (
                      detailTemplate.forbiddenModels.map((model) => (
                        <Badge key={model} variant="danger">
                          {model}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-2xs">无</span>
                    )}
                  </div>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="工具白名单">
              {detailTemplate.toolWhitelist.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {detailTemplate.toolWhitelist.map((code) => (
                    <Badge key={code} variant="outline" className="font-mono">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-2xs">未配置工具白名单，该模板无法调用任何工具。</p>
              )}
              {detailTemplate.forbiddenTools.length > 0 ? (
                <div className="mt-2">
                  <p className="text-muted-foreground mb-1 text-2xs">显式禁止的工具</p>
                  <div className="flex flex-wrap gap-1">
                    {detailTemplate.forbiddenTools.map((code) => (
                      <Badge key={code} variant="danger" className="font-mono">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </DetailSection>

            <DetailSection title="知识库">
              {detailTemplate.knowledgeBases.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {detailTemplate.knowledgeBases.map((knowledge) => (
                    <Badge key={knowledge} variant="secondary">
                      {knowledge}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-2xs">未关联知识库。</p>
              )}
            </DetailSection>

            <DetailSection title="版本与变更">
              <DetailGrid>
                <DetailRow label="当前版本" mono>
                  v{detailTemplate.version}
                </DetailRow>
                <DetailRow label="安装量">
                  <span className="num">{formatCompact(detailTemplate.installs)}</span>
                </DetailRow>
              </DetailGrid>
              <p className="text-muted-foreground mt-1 text-2xs leading-relaxed">
                {detailTemplate.changelog}
              </p>
            </DetailSection>

            <DetailSection title="灰度发布" description="仅灰度状态下的模板会展示实际放量比例">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-muted-foreground">灰度流量比例</span>
                  <span className="num">{detailTemplate.grayPercent}%</span>
                </div>
                <Progress value={detailTemplate.grayPercent} />
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={rollbackTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRollbackTarget(null);
        }}
        title={`回滚模板「${rollbackTarget?.name ?? ""}」？`}
        description="回滚会将提示词、模型策略与工具白名单恢复到上一个线上版本，当前版本会被归档保留。"
        confirmLabel="确认回滚"
        onConfirm={() => {
          if (!rollbackTarget) return;
          setTemplateList((list) =>
            list.map((item) =>
              item.id === rollbackTarget.id ? { ...item, status: "published", grayPercent: 0 } : item,
            ),
          );
          toast.success(`已将「${rollbackTarget.name}」回滚到上一版本`);
          setRollbackTarget(null);
        }}
      />

      <div className="text-muted-foreground flex items-center gap-2 text-2xs">
        <RotateCcw className="size-3.5" />
        <span>模板数据为本地静态演示数据，发布操作仅更新当前页面状态。</span>
      </div>
    </PageContainer>
  );
}
