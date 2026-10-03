"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Coins,
  Database,
  Download,
  EyeOff,
  FolderTree,
  KeyRound,
  Monitor,
  PauseCircle,
  Plus,
  Receipt,
  Rocket,
  Server,
  ShieldCheck,
  Wrench,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { projects as projectSeed } from "@/lib/mock-data/capability";
import { label } from "@/lib/labels";
import {
  formatCompact,
  formatCompactCurrency,
  formatDate,
  truncate,
} from "@/lib/utils";
import type { Project } from "@/types";

const TYPE_OPTIONS = [
  { value: "frontend", label: "前端" },
  { value: "backend", label: "后端" },
  { value: "data", label: "数据分析" },
  { value: "ops", label: "运维" },
  { value: "research", label: "研究" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "paused", label: "已暂停" },
  { value: "archived", label: "已归档" },
  { value: "provisioning", label: "开通中" },
];

const BRANCH_OPTIONS = [
  { value: "主干保护 + PR 双人评审", label: "主干保护 + PR 双人评审" },
  { value: "GitFlow（develop/release）", label: "GitFlow（develop/release）" },
  { value: "Trunk-based + 特性开关", label: "Trunk-based + 特性开关" },
];

const MODEL_POLICY_OPTIONS = [
  { value: "仅平台模型", label: "仅平台模型" },
  { value: "允许 BYOK", label: "允许 BYOK" },
  { value: "允许本地模型", label: "允许本地模型" },
  { value: "允许共享模型", label: "允许共享模型" },
];

const TOOL_POLICY_OPTIONS = [
  { value: "只读工具", label: "只读工具" },
  { value: "标准工具集", label: "标准工具集" },
  { value: "含终端执行（受限）", label: "含终端执行（受限）" },
  { value: "自定义工具需审批", label: "自定义工具需审批" },
];

const projectSchema = z.object({
  name: z.string().min(2, "项目名称至少 2 个字符").max(40, "项目名称过长"),
  code: z
    .string()
    .min(2, "项目编码至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "只能包含小写字母、数字与连字符"),
  tenantId: z.string().min(1, "请选择租户"),
  type: z.enum(["frontend", "backend", "data", "ops", "research"]),
  status: z.enum(["active", "paused", "archived", "provisioning"]),
  repo: z.string().min(4, "请填写仓库地址"),
  branchStrategy: z.string().min(2, "请选择分支策略"),
  budgetMonthly: z.coerce.number().int().min(1_000, "预算不得低于 1,000 元").max(10_000_000, "预算过大"),
  modelPolicy: z.string().min(1, "请选择模型策略"),
  toolPolicy: z.string().min(1, "请选择工具策略"),
  sensitiveFileProtection: z.boolean(),
  ignoreRules: z.string(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface TemplateCard {
  name: string;
  type: Project["type"];
  description: string;
  icon: typeof Monitor;
  modelPolicy: string;
  toolPolicy: string;
  branchStrategy: string;
  ignoreRules: string;
}

const PROJECT_TEMPLATES: TemplateCard[] = [
  {
    name: "前端项目模板",
    type: "frontend",
    description: "面向 Web 前端仓库，预置构建、组件测试与预览环境策略。",
    icon: Monitor,
    modelPolicy: "仅平台模型",
    toolPolicy: "标准工具集",
    branchStrategy: "主干保护 + PR 双人评审",
    ignoreRules: ".env, node_modules/**, dist/**, *.map",
  },
  {
    name: "后端服务模板",
    type: "backend",
    description: "面向服务端仓库，默认开启终端限制与生产配置保护。",
    icon: Server,
    modelPolicy: "允许 BYOK",
    toolPolicy: "含终端执行（受限）",
    branchStrategy: "GitFlow（develop/release）",
    ignoreRules: ".env, config/prod.yaml, *.pem, secrets/**",
  },
  {
    name: "数据流水线模板",
    type: "data",
    description: "面向数仓与 ETL 仓库，强制只读查询与脱敏数据源。",
    icon: Database,
    modelPolicy: "仅平台模型",
    toolPolicy: "只读工具",
    branchStrategy: "Trunk-based + 特性开关",
    ignoreRules: ".env, data/raw/**, *.parquet, *.csv",
  },
  {
    name: "运维自动化模板",
    type: "ops",
    description: "面向基础设施仓库，高风险操作一律走审批与双人复核。",
    icon: Wrench,
    modelPolicy: "允许 BYOK",
    toolPolicy: "自定义工具需审批",
    branchStrategy: "主干保护 + PR 双人评审",
    ignoreRules: ".env, terraform.tfstate, kubeconfig, *.key",
  },
];

export default function ProjectsPage() {
  const [projectList, setProjectList] = React.useState<Project[]>(projectSeed);
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [detailProject, setDetailProject] = React.useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Project | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const tenantOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    projectList.forEach((project) => map.set(project.tenantId, project.tenantName));
    return Array.from(map.entries()).map(([value, name]) => ({ value, label: name }));
  }, [projectList]);

  const filtered = React.useMemo(
    () =>
      projectList.filter(
        (project) =>
          (tenantFilter === "all" || project.tenantId === tenantFilter) &&
          (typeFilter === "all" || project.type === typeFilter) &&
          (statusFilter === "all" || project.status === statusFilter),
      ),
    [projectList, tenantFilter, typeFilter, statusFilter],
  );

  const activeFilterCount = [tenantFilter, typeFilter, statusFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = projectList.length;
    const active = projectList.filter((project) => project.status === "active").length;
    const archived = projectList.filter((project) => project.status === "archived").length;
    const paused = projectList.filter((project) => project.status === "paused").length;
    const budget = projectList.reduce((sum, project) => sum + project.budgetMonthly, 0);
    const spent = projectList.reduce((sum, project) => sum + project.spentMonthly, 0);
    return { total, active, archived, paused, budget, spent };
  }, [projectList]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      code: "",
      tenantId: "",
      type: "frontend",
      status: "active",
      repo: "",
      branchStrategy: BRANCH_OPTIONS[0]?.value ?? "主干保护 + PR 双人评审",
      budgetMonthly: 20_000,
      modelPolicy: MODEL_POLICY_OPTIONS[0]?.value ?? "仅平台模型",
      toolPolicy: TOOL_POLICY_OPTIONS[1]?.value ?? "标准工具集",
      sensitiveFileProtection: true,
      ignoreRules: ".env, *.pem, secrets/**",
    },
  });

  React.useEffect(() => {
    if (editingProject) {
      form.reset({
        name: editingProject.name,
        code: editingProject.code,
        tenantId: editingProject.tenantId,
        type: editingProject.type,
        status: editingProject.status,
        repo: editingProject.repo,
        branchStrategy: editingProject.branchStrategy,
        budgetMonthly: editingProject.budgetMonthly,
        modelPolicy: editingProject.modelPolicy,
        toolPolicy: editingProject.toolPolicy,
        sensitiveFileProtection: editingProject.sensitiveFileProtection,
        ignoreRules: editingProject.ignoreRules,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        tenantId: "",
        type: "frontend",
        status: "active",
        repo: "",
        branchStrategy: BRANCH_OPTIONS[0]?.value ?? "主干保护 + PR 双人评审",
        budgetMonthly: 20_000,
        modelPolicy: MODEL_POLICY_OPTIONS[0]?.value ?? "仅平台模型",
        toolPolicy: TOOL_POLICY_OPTIONS[1]?.value ?? "标准工具集",
        sensitiveFileProtection: true,
        ignoreRules: ".env, *.pem, secrets/**",
      });
    }
  }, [editingProject, form]);

  const onSubmit = (values: ProjectFormValues) => {
    const tenantName =
      tenantOptions.find((option) => option.value === values.tenantId)?.label ?? "—";
    if (editingProject) {
      setProjectList((list) =>
        list.map((project) =>
          project.id === editingProject.id ? { ...project, ...values, tenantName } : project,
        ),
      );
      toast.success(`已更新项目「${values.name}」`);
      setEditingProject(null);
      return;
    }
    const newProject: Project = {
      id: `pj-${String(projectList.length + 1).padStart(2, "0")}`,
      ...values,
      tenantName,
      envCount: 2,
      memberCount: 1,
      agentCount: 0,
      spentMonthly: 0,
      owner: "当前管理员",
      workspaces: 0,
      createdAt: new Date().toISOString(),
    };
    setProjectList((list) => [newProject, ...list]);
    toast.success(`已创建项目「${values.name}」`);
    setCreateOpen(false);
    form.reset();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setProjectList((list) => list.filter((project) => project.id !== deleteTarget.id));
      toast.success(`已删除项目「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 500);
  };

  const applyTemplate = (template: TemplateCard) => {
    toast.success(`已应用「${template.name}」，新建项目时将默认使用其策略`);
  };

  const columns = React.useMemo<ColumnDef<Project, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "项目",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.code}</p>
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
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.type)}</Badge>,
      },
      {
        id: "repo",
        accessorKey: "repo",
        header: "仓库",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.repo}>
            {truncate(row.original.repo, 30)}
          </span>
        ),
      },
      {
        id: "branchStrategy",
        accessorKey: "branchStrategy",
        header: "分支策略",
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-1 text-2xs">
            {row.original.branchStrategy}
          </span>
        ),
      },
      {
        id: "resources",
        header: "成员 / Agent / 工作区",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="num text-2xs">
            {row.original.memberCount} / {row.original.agentCount} / {row.original.workspaces}
          </span>
        ),
      },
      {
        id: "budget",
        header: "预算与消耗",
        enableSorting: false,
        cell: ({ row }) => {
          const ratio =
            row.original.budgetMonthly === 0
              ? 0
              : row.original.spentMonthly / row.original.budgetMonthly;
          const percent = Math.min(100, Math.round(ratio * 100));
          return (
            <div className="min-w-32 space-y-1">
              <div className="flex items-center justify-between text-2xs">
                <span className="num">{formatCompactCurrency(row.original.spentMonthly)}</span>
                <span className="text-muted-foreground num">
                  / {formatCompactCurrency(row.original.budgetMonthly)}
                </span>
              </div>
              <Progress
                value={percent}
                indicatorClassName={
                  ratio > 1 ? "bg-red-500" : ratio > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                }
              />
            </div>
          );
        },
      },
      {
        id: "modelPolicy",
        accessorKey: "modelPolicy",
        header: "模型策略",
        cell: ({ row }) => <span className="text-2xs">{row.original.modelPolicy}</span>,
      },
      {
        id: "toolPolicy",
        accessorKey: "toolPolicy",
        header: "工具策略",
        cell: ({ row }) => <span className="text-2xs">{row.original.toolPolicy}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "负责人",
        cell: ({ row }) => <span className="text-2xs">{row.original.owner}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailProject(row.original)}
            onEdit={() => setEditingProject(row.original)}
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
        title="项目管理"
        description="管理项目仓库、分支策略、预算与 Agent 工作区策略，并统一文件访问与密钥托管规范。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条项目数据（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              新建项目
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="项目总数" value={stats.total} icon={Boxes} delta={4.5} />
        <StatCard label="活跃项目" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatCard label="已归档" value={stats.archived} icon={Archive} tone="info" />
        <StatCard label="已暂停" value={stats.paused} icon={PauseCircle} tone="warning" />
        <StatCard
          label="月度总预算"
          value={stats.budget}
          icon={Coins}
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="本月消耗"
          value={stats.spent}
          icon={Receipt}
          tone="warning"
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
      </StatCardGrid>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">
            <Boxes />
            项目
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Rocket />
            项目模板
          </TabsTrigger>
          <TabsTrigger value="policies">
            <ShieldCheck />
            策略说明
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-3">
          <FilterBar
            activeCount={activeFilterCount}
            onReset={() => {
              setTenantFilter("all");
              setTypeFilter("all");
              setStatusFilter("all");
            }}
          >
            <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
            <FilterSelect label="类型" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          </FilterBar>

          <DataTable
            columns={columns}
            data={filtered}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索项目名称、编码、仓库、负责人…"
            onRowClick={(row) => setDetailProject(row)}
            emptyTitle="没有符合条件的项目"
            emptyAction={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                新建项目
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-3">
          <SectionHeader
            title="项目模板"
            description="按项目类型预置推荐策略，应用后新建项目将默认继承"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PROJECT_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <div key={template.name} className="bg-card flex flex-col gap-3 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium">{template.name}</p>
                      <p className="text-muted-foreground text-2xs">{label(template.type)}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-2xs leading-relaxed">{template.description}</p>
                  <div className="space-y-1.5 text-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">模型策略</span>
                      <span>{template.modelPolicy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">工具策略</span>
                      <span>{template.toolPolicy}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">分支策略</span>
                      <span className="truncate text-right">{template.branchStrategy}</span>
                    </div>
                  </div>
                  <Button size="xs" variant="outline" className="mt-auto" onClick={() => applyTemplate(template)}>
                    <Rocket />
                    应用模板
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Alert variant="info">
              <FolderTree />
              <AlertTitle>文件访问策略</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>默认仅允许读取项目仓库内文件，写入范围限制在工作区临时目录与仓库副本。</li>
                  <li>跨目录访问需显式声明路径白名单，越界访问会被拦截并记录审计日志。</li>
                  <li>删除、重命名等破坏性文件操作一律需要二次确认。</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <ShieldCheck />
              <AlertTitle>敏感文件保护</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>开启后自动屏蔽 .env、*.pem、*.key、secrets/** 等敏感文件的读取与写入。</li>
                  <li>疑似密钥内容在输出前会进行脱敏处理，避免出现在对话与日志中。</li>
                  <li>命中保护规则的操作会触发告警并通知项目负责人。</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <EyeOff />
              <AlertTitle>忽略规则</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>遵循仓库根目录 .agentignore 与项目级忽略规则，支持通配符与目录匹配。</li>
                  <li>被忽略的文件不会进入上下文，也不会被搜索与索引。</li>
                  <li>依赖目录、构建产物与大数据文件建议全部忽略以控制 Token 消耗。</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert variant="success">
              <KeyRound />
              <AlertTitle>环境变量与密钥托管</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>密钥统一托管在平台密钥库，运行时以引用方式注入容器，不落盘、不回显。</li>
                  <li>支持按项目与环境维度授权，最小权限原则，定期自动轮换。</li>
                  <li>所有密钥读取均记录调用方、时间与用途，可在审计日志中追溯。</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen || editingProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingProject(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? `编辑项目 · ${editingProject.name}` : "新建项目"}</DialogTitle>
            <DialogDescription>
              项目级策略会覆盖租户默认值，敏感文件保护建议保持开启。
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
                      <FormLabel>项目名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：订单服务" {...field} />
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
                      <FormLabel>项目编码</FormLabel>
                      <FormControl>
                        <Input placeholder="order-service" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属租户</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="请选择租户" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenantOptions.map((option) => (
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>项目类型</FormLabel>
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
                          {STATUS_OPTIONS.map((option) => (
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
                  name="budgetMonthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>月度预算（元）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1000} step={1000} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="repo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仓库地址</FormLabel>
                    <FormControl>
                      <Input placeholder="git@github.com:org/repo.git" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="branchStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分支策略</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRANCH_OPTIONS.map((option) => (
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODEL_POLICY_OPTIONS.map((option) => (
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
                  name="toolPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>工具策略</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TOOL_POLICY_OPTIONS.map((option) => (
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
                  name="sensitiveFileProtection"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <Label htmlFor="sensitive-protection" className="text-xs font-normal">
                          敏感文件保护
                        </Label>
                        <p className="text-muted-foreground text-2xs">禁止读写 .env、密钥与证书文件。</p>
                      </div>
                      <Switch
                        id="sensitive-protection"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="ignoreRules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>忽略规则</FormLabel>
                    <FormControl>
                      <Textarea rows={3} className="font-mono text-2xs" placeholder=".env, *.pem, secrets/**" {...field} />
                    </FormControl>
                    <FormDescription>以逗号或换行分隔，支持通配符，被忽略文件不会进入上下文。</FormDescription>
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
                    setEditingProject(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingProject ? "保存修改" : "创建项目"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailProject !== null}
        onOpenChange={(open) => {
          if (!open) setDetailProject(null);
        }}
        title={detailProject?.name ?? "项目详情"}
        description={detailProject ? `${detailProject.code} · ${detailProject.tenantName}` : undefined}
        footer={
          detailProject ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-2xs">
                负责人 {detailProject.owner} · 创建于 {formatDate(detailProject.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingProject(detailProject)}>
                  编辑
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("已触发策略同步（演示）")}>
                  同步策略
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailProject ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailProject.status} />
              <Badge variant="secondary">{label(detailProject.type)}</Badge>
              <Badge variant="outline">{detailProject.branchStrategy}</Badge>
            </div>

            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="项目 ID" mono>
                  {detailProject.id}
                </DetailRow>
                <DetailRow label="所属租户">{detailProject.tenantName}</DetailRow>
                <DetailRow label="仓库" mono>
                  {detailProject.repo}
                </DetailRow>
                <DetailRow label="负责人">{detailProject.owner}</DetailRow>
                <DetailRow label="环境数">
                  <span className="num">{detailProject.envCount}</span>
                </DetailRow>
                <DetailRow label="成员 / Agent / 工作区">
                  <span className="num">
                    {detailProject.memberCount} / {detailProject.agentCount} / {detailProject.workspaces}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="预算与消耗">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-muted-foreground">本月消耗 / 预算</span>
                  <span className="num">
                    {formatCompactCurrency(detailProject.spentMonthly)} /{" "}
                    {formatCompactCurrency(detailProject.budgetMonthly)}
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    Math.round(
                      (detailProject.spentMonthly / Math.max(1, detailProject.budgetMonthly)) * 100,
                    ),
                  )}
                />
              </div>
            </DetailSection>

            <DetailSection title="策略配置">
              <DetailGrid>
                <DetailRow label="模型策略">{detailProject.modelPolicy}</DetailRow>
                <DetailRow label="工具策略">{detailProject.toolPolicy}</DetailRow>
                <DetailRow label="敏感文件保护">
                  <StatusBadge status={detailProject.sensitiveFileProtection ? "enabled" : "disabled"} />
                </DetailRow>
                <DetailRow label="代码规模">
                  <span className="num">{formatCompact(detailProject.memberCount * 1200)} 行</span>
                </DetailRow>
              </DetailGrid>
              <DetailRow label="忽略规则" mono className="mt-1">
                {detailProject.ignoreRules}
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
        title={`删除项目「${deleteTarget?.name ?? ""}」？`}
        description="删除后项目下的工作区会被回收，历史会话与用量数据进入 30 天回收站。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
