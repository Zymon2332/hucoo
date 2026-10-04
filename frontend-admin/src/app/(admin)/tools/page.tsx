"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Braces,
  CheckCircle2,
  Globe,
  Package,
  PackageCheck,
  Plus,
  ScrollText,
  ShieldAlert,
  Star,
  Terminal,
  Upload,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { RiskBadge, StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import {
  commandPolicies as commandSeed,
  networkPolicyEntries as networkSeed,
  pluginPackages as pluginSeed,
  tools as toolSeed,
} from "@/lib/mock-data/capability";
import { label, RISK_LABEL } from "@/lib/labels";
import { formatCompact, formatDate } from "@/lib/utils";
import type {
  CommandPolicy,
  NetworkPolicyEntry,
  PluginPackage,
  Tool,
  ToolCategory,
} from "@/types";

const TOOL_CATEGORIES: ToolCategory[] = [
  "file",
  "terminal",
  "search",
  "git",
  "browser",
  "http",
  "database",
  "custom",
];

const CATEGORY_OPTIONS = TOOL_CATEGORIES.map((value) => ({ value, label: label(value) }));

const SOURCE_OPTIONS = [
  { value: "builtin", label: "内置" },
  { value: "custom", label: "自定义" },
  { value: "marketplace", label: "市场" },
  { value: "openapi", label: "OpenAPI 导入" },
];

const RISK_OPTIONS = (["low", "medium", "high", "critical"] as const).map((value) => ({
  value,
  label: RISK_LABEL[value] ?? value,
}));

const STATUS_OPTIONS = [
  { value: "enabled", label: "已启用" },
  { value: "disabled", label: "已禁用" },
  { value: "pending-review", label: "待审核" },
  { value: "rejected", label: "已拒绝" },
];

const EFFECT_OPTIONS = [
  { value: "allow", label: "允许" },
  { value: "deny", label: "禁止" },
  { value: "ask", label: "需确认" },
];

const DIRECTION_LABEL: Record<NetworkPolicyEntry["direction"], string> = {
  egress: "出站",
  ingress: "入站",
};

const isJsonObject = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
};

const toolSchema = z.object({
  name: z.string().min(2, "工具名称至少 2 个字符").max(40, "工具名称过长"),
  code: z
    .string()
    .min(2, "工具编码至少 2 个字符")
    .regex(/^[a-z0-9._-]+$/, "只能包含小写字母、数字、点、下划线或连字符"),
  category: z.enum(["file", "terminal", "search", "git", "browser", "http", "database", "custom"]),
  description: z.string().min(4, "请填写工具描述").max(200, "描述过长"),
  parameterSchema: z.string().refine(isJsonObject, "参数 Schema 必须是可解析的 JSON 对象"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  requiresApproval: z.boolean(),
});

type ToolFormValues = z.infer<typeof toolSchema>;

const commandSchema = z.object({
  pattern: z.string().min(1, "请填写命令模式").max(80, "命令模式过长"),
  effect: z.enum(["allow", "deny", "ask"]),
  scope: z.string().min(1, "请填写生效范围").max(40, "范围过长"),
  reason: z.string().min(2, "请填写策略说明").max(120, "说明过长"),
});

type CommandFormValues = z.infer<typeof commandSchema>;

const networkSchema = z.object({
  domain: z.string().min(1, "请填写域名或 CIDR").max(120, "内容过长"),
  direction: z.enum(["egress", "ingress"]),
  effect: z.enum(["allow", "deny", "ask"]),
  cidr: z.string().min(1, "请填写 CIDR"),
  note: z.string().min(2, "请填写说明").max(120, "说明过长"),
});

type NetworkFormValues = z.infer<typeof networkSchema>;

const DEFAULT_SCHEMA = '{\n  "type": "object",\n  "properties": {}\n}';

export default function ToolsPage() {
  const [toolList, setToolList] = React.useState<Tool[]>(toolSeed);
  const [commandList, setCommandList] = React.useState<CommandPolicy[]>(commandSeed);
  const [networkList, setNetworkList] = React.useState<NetworkPolicyEntry[]>(networkSeed);
  const [pluginList, setPluginList] = React.useState<PluginPackage[]>(pluginSeed);

  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingTool, setEditingTool] = React.useState<Tool | null>(null);
  const [detailTool, setDetailTool] = React.useState<Tool | null>(null);
  const [reviewTarget, setReviewTarget] = React.useState<{ tool: Tool; approve: boolean } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<Tool | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const [commandOpen, setCommandOpen] = React.useState(false);
  const [networkOpen, setNetworkOpen] = React.useState(false);
  const [blockTarget, setBlockTarget] = React.useState<PluginPackage | null>(null);

  const filtered = React.useMemo(
    () =>
      toolList.filter(
        (tool) =>
          (categoryFilter === "all" || tool.category === categoryFilter) &&
          (sourceFilter === "all" || tool.source === sourceFilter) &&
          (riskFilter === "all" || tool.riskLevel === riskFilter) &&
          (statusFilter === "all" || tool.status === statusFilter),
      ),
    [toolList, categoryFilter, sourceFilter, riskFilter, statusFilter],
  );

  const activeFilterCount = [categoryFilter, sourceFilter, riskFilter, statusFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = toolList.length;
    const enabled = toolList.filter((tool) => tool.status === "enabled").length;
    const pending = toolList.filter((tool) => tool.status === "pending-review").length;
    const highRisk = toolList.filter(
      (tool) => tool.riskLevel === "high" || tool.riskLevel === "critical",
    ).length;
    const rating =
      total === 0 ? 0 : toolList.reduce((sum, tool) => sum + tool.rating, 0) / total;
    const installs = toolList.reduce((sum, tool) => sum + tool.installs, 0);
    return { total, enabled, pending, highRisk, rating, installs };
  }, [toolList]);

  const marketTools = React.useMemo(
    () => [...toolList].sort((a, b) => b.installs - a.installs),
    [toolList],
  );

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "custom",
      description: "",
      parameterSchema: DEFAULT_SCHEMA,
      riskLevel: "medium",
      requiresApproval: true,
    },
  });

  const commandForm = useForm<CommandFormValues>({
    resolver: zodResolver(commandSchema),
    defaultValues: { pattern: "", effect: "ask", scope: "全局", reason: "" },
  });

  const networkForm = useForm<NetworkFormValues>({
    resolver: zodResolver(networkSchema),
    defaultValues: { domain: "", direction: "egress", effect: "allow", cidr: "0.0.0.0/0", note: "" },
  });

  React.useEffect(() => {
    if (editingTool) {
      form.reset({
        name: editingTool.name,
        code: editingTool.code,
        category: editingTool.category,
        description: editingTool.description,
        parameterSchema: editingTool.parameterSchema,
        riskLevel: editingTool.riskLevel,
        requiresApproval: editingTool.requiresApproval,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        category: "custom",
        description: "",
        parameterSchema: DEFAULT_SCHEMA,
        riskLevel: "medium",
        requiresApproval: true,
      });
    }
  }, [editingTool, form]);

  const onSubmitTool = (values: ToolFormValues) => {
    if (editingTool) {
      setToolList((list) =>
        list.map((tool) => (tool.id === editingTool.id ? { ...tool, ...values } : tool)),
      );
      toast.success(`已更新工具「${values.name}」`);
      setEditingTool(null);
      return;
    }
    const newTool: Tool = {
      id: `tool-${String(toolList.length + 1).padStart(2, "0")}`,
      ...values,
      status: "pending-review",
      source: "custom",
      version: "0.1.0",
      author: "当前管理员",
      installs: 0,
      rating: 0,
      reviewCount: 0,
      scopes: [],
      updatedAt: new Date().toISOString(),
    };
    setToolList((list) => [newTool, ...list]);
    toast.success(`已提交「${values.name}」等待审核`);
    setCreateOpen(false);
    form.reset();
  };

  const onSubmitCommand = (values: CommandFormValues) => {
    setCommandList((list) => [
      {
        id: `cmd-${String(list.length + 1).padStart(2, "0")}`,
        ...values,
        updatedAt: new Date().toISOString(),
      },
      ...list,
    ]);
    toast.success(`已新增命令策略「${values.pattern}」`);
    setCommandOpen(false);
    commandForm.reset();
  };

  const onSubmitNetwork = (values: NetworkFormValues) => {
    setNetworkList((list) => [
      {
        id: `net-${String(list.length + 1).padStart(2, "0")}`,
        ...values,
        updatedAt: new Date().toISOString(),
      },
      ...list,
    ]);
    toast.success(`已新增网络策略「${values.domain}」`);
    setNetworkOpen(false);
    networkForm.reset();
  };

  const toggleToolStatus = (tool: Tool) => {
    const next: Tool["status"] = tool.status === "enabled" ? "disabled" : "enabled";
    setToolList((list) => list.map((item) => (item.id === tool.id ? { ...item, status: next } : item)));
    toast.success(next === "disabled" ? `已禁用「${tool.name}」` : `已启用「${tool.name}」`);
  };

  const confirmReview = () => {
    if (!reviewTarget) return;
    const nextStatus: Tool["status"] = reviewTarget.approve ? "enabled" : "rejected";
    setToolList((list) =>
      list.map((item) => (item.id === reviewTarget.tool.id ? { ...item, status: nextStatus } : item)),
    );
    toast.success(reviewTarget.approve ? `已通过「${reviewTarget.tool.name}」` : `已驳回「${reviewTarget.tool.name}」`);
    setReviewTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setToolList((list) => list.filter((tool) => tool.id !== deleteTarget.id));
      toast.success(`已删除工具「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 500);
  };

  const toggleMarketListing = (tool: Tool) => {
    const listed = tool.status === "enabled";
    const next: Tool["status"] = listed ? "disabled" : "enabled";
    setToolList((list) => list.map((item) => (item.id === tool.id ? { ...item, status: next } : item)));
    toast.success(listed ? `已将「${tool.name}」下架` : `已将「${tool.name}」上架`);
  };

  const toolColumns = React.useMemo<ColumnDef<Tool, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "工具",
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
        id: "source",
        accessorKey: "source",
        header: "来源",
        cell: ({ row }) => <span className="text-2xs">{label(row.original.source)}</span>,
      },
      {
        id: "version",
        accessorKey: "version",
        header: "版本",
        cell: ({ row }) => <span className="text-muted-foreground font-mono text-2xs">{row.original.version}</span>,
      },
      {
        id: "riskLevel",
        accessorKey: "riskLevel",
        header: "风险",
        cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} />,
      },
      {
        id: "requiresApproval",
        accessorKey: "requiresApproval",
        header: "需审批",
        cell: ({ row }) =>
          row.original.requiresApproval ? (
            <Badge variant="warning">需审批</Badge>
          ) : (
            <Badge variant="neutral">免审批</Badge>
          ),
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
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailTool(row.original)}
            onEdit={() => setEditingTool(row.original)}
            onToggleStatus={() => toggleToolStatus(row.original)}
            statusActive={row.original.status === "enabled"}
            onDelete={() => setDeleteTarget(row.original)}
            extraItems={
              row.original.status === "pending-review"
                ? [
                    { label: "审核通过", onSelect: () => setReviewTarget({ tool: row.original, approve: true }) },
                    {
                      label: "审核驳回",
                      destructive: true,
                      onSelect: () => setReviewTarget({ tool: row.original, approve: false }),
                    },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [],
  );

  const commandColumns = React.useMemo<ColumnDef<CommandPolicy, unknown>[]>(
    () => [
      {
        id: "pattern",
        accessorKey: "pattern",
        header: "命令模式",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono text-xs">{row.original.pattern}</p>
            <p className="text-muted-foreground text-2xs">{row.original.scope}</p>
          </div>
        ),
      },
      {
        id: "effect",
        accessorKey: "effect",
        header: "效果",
        cell: ({ row }) => <StatusBadge status={row.original.effect} label={label(row.original.effect)} />,
      },
      {
        id: "reason",
        accessorKey: "reason",
        header: "原因",
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-2 text-2xs">{row.original.reason}</span>
        ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.updatedAt)}</span>,
      },
    ],
    [],
  );

  const networkColumns = React.useMemo<ColumnDef<NetworkPolicyEntry, unknown>[]>(
    () => [
      {
        id: "domain",
        accessorKey: "domain",
        header: "域名 / CIDR",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.domain}</span>,
      },
      {
        id: "direction",
        accessorKey: "direction",
        header: "方向",
        cell: ({ row }) => <Badge variant="outline">{DIRECTION_LABEL[row.original.direction]}</Badge>,
      },
      {
        id: "effect",
        accessorKey: "effect",
        header: "效果",
        cell: ({ row }) => <StatusBadge status={row.original.effect} label={label(row.original.effect)} />,
      },
      {
        id: "cidr",
        accessorKey: "cidr",
        header: "CIDR",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.cidr}</span>,
      },
      {
        id: "note",
        accessorKey: "note",
        header: "说明",
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-2 text-2xs">{row.original.note}</span>
        ),
      },
    ],
    [],
  );

  const pluginColumns = React.useMemo<ColumnDef<PluginPackage, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "插件包",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-mono text-xs">{row.original.name}</p>
            <p className="text-muted-foreground num text-2xs">v{row.original.version}</p>
          </div>
        ),
      },
      {
        id: "publisher",
        accessorKey: "publisher",
        header: "发布者",
        cell: ({ row }) => <span className="text-2xs">{row.original.publisher}</span>,
      },
      {
        id: "signed",
        accessorKey: "signed",
        header: "签名",
        cell: ({ row }) =>
          row.original.signed ? (
            <Badge variant="success">已签名</Badge>
          ) : (
            <Badge variant="danger">未签名</Badge>
          ),
      },
      {
        id: "sbomAvailable",
        accessorKey: "sbomAvailable",
        header: "SBOM",
        cell: ({ row }) =>
          row.original.sbomAvailable ? (
            <Badge variant="secondary">已生成</Badge>
          ) : (
            <Badge variant="neutral">缺失</Badge>
          ),
      },
      {
        id: "vulnerabilities",
        accessorKey: "vulnerabilities",
        header: "漏洞数",
        cell: ({ row }) =>
          row.original.vulnerabilities > 0 ? (
            <Badge variant="danger" className="num">
              {row.original.vulnerabilities}
            </Badge>
          ) : (
            <span className="num text-2xs">0</span>
          ),
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
            onView={() => toast.info(`插件「${row.original.name}」详情（演示）`)}
            extraItems={[
              {
                label: "阻断该插件",
                destructive: true,
                onSelect: () => setBlockTarget(row.original),
              },
            ]}
            disabled={row.original.status === "blocked"}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="工具目录"
        description="统一管理内置与自定义工具、命令与网络策略、供应链插件以及工具市场上下架。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条工具数据（演示）`)}
            >
              <Upload />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              注册自定义工具
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="工具总数" value={stats.total} icon={Wrench} delta={2.4} />
        <StatCard label="已启用" value={stats.enabled} icon={CheckCircle2} tone="success" />
        <StatCard label="待审核" value={stats.pending} icon={ShieldAlert} tone="warning" />
        <StatCard label="高风险工具" value={stats.highRisk} icon={ShieldAlert} tone="danger" />
        <StatCard
          label="平均评分"
          value={stats.rating}
          icon={Star}
          valueFormatter={(value) => value.toFixed(2)}
        />
        <StatCard
          label="总安装量"
          value={stats.installs}
          icon={Package}
          valueFormatter={(value) => formatCompact(value)}
          delta={8.1}
        />
      </StatCardGrid>

      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">
            <Wrench />
            工具
          </TabsTrigger>
          <TabsTrigger value="commands">
            <Terminal />
            命令策略
          </TabsTrigger>
          <TabsTrigger value="network">
            <Globe />
            网络策略
          </TabsTrigger>
          <TabsTrigger value="supply">
            <PackageCheck />
            供应链与插件
          </TabsTrigger>
          <TabsTrigger value="market">
            <ScrollText />
            工具市场
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-3">
          <FilterBar
            activeCount={activeFilterCount}
            onReset={() => {
              setCategoryFilter("all");
              setSourceFilter("all");
              setRiskFilter("all");
              setStatusFilter("all");
            }}
          >
            <FilterSelect label="分类" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
            <FilterSelect label="来源" value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} />
            <FilterSelect label="风险" value={riskFilter} onChange={setRiskFilter} options={RISK_OPTIONS} />
            <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          </FilterBar>

          <DataTable
            columns={toolColumns}
            data={filtered}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索工具名称、编码、描述…"
            onRowClick={(row) => setDetailTool(row)}
            emptyTitle="没有符合条件的工具"
            emptyAction={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                注册自定义工具
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="commands" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">
              命令策略按「拒绝优先」顺序匹配，命中即终止后续评估。
            </p>
            <Button size="sm" variant="outline" onClick={() => setCommandOpen(true)}>
              <Plus />
              新增策略
            </Button>
          </div>
          <DataTable
            columns={commandColumns}
            data={commandList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索命令模式、范围…"
            showColumnToggle={false}
            emptyTitle="暂无命令策略"
          />
        </TabsContent>

        <TabsContent value="network" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">
              默认拒绝所有出站，仅放行白名单域名；云元数据地址始终禁止访问。
            </p>
            <Button size="sm" variant="outline" onClick={() => setNetworkOpen(true)}>
              <Plus />
              新增策略
            </Button>
          </div>
          <DataTable
            columns={networkColumns}
            data={networkList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索域名、CIDR、说明…"
            showColumnToggle={false}
            emptyTitle="暂无网络策略"
          />
        </TabsContent>

        <TabsContent value="supply" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">
              仅允许签名且 SBOM 完整、无高危漏洞的插件进入生产环境。
            </p>
          </div>
          <DataTable
            columns={pluginColumns}
            data={pluginList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索插件名、发布者…"
            emptyTitle="暂无插件包"
          />
        </TabsContent>

        <TabsContent value="market">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {marketTools.map((tool) => {
              const listed = tool.status === "enabled";
              return (
                <Card key={tool.id} className="gap-0 py-4">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{tool.name}</p>
                        <p className="text-muted-foreground font-mono text-2xs">{tool.code}</p>
                      </div>
                      <RiskBadge risk={tool.riskLevel} />
                    </div>
                    <p className="text-muted-foreground line-clamp-2 text-2xs">{tool.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-2xs">
                      <div>
                        <p className="text-muted-foreground">评分</p>
                        <p className="num flex items-center gap-1 font-medium">
                          <Star className="size-3 text-amber-500" />
                          {tool.rating.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">评论</p>
                        <p className="num font-medium">{formatCompact(tool.reviewCount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">安装量</p>
                        <p className="num font-medium">{formatCompact(tool.installs)}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                      <StatusBadge status={tool.status} />
                      <Button
                        size="xs"
                        variant={listed ? "outline" : "default"}
                        onClick={() => toggleMarketListing(tool)}
                      >
                        {listed ? "下架" : "上架"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen || editingTool !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingTool(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTool ? `编辑工具 · ${editingTool.name}` : "注册自定义工具"}</DialogTitle>
            <DialogDescription>
              自定义工具提交后进入待审核状态，审核通过后才会进入工具白名单可供 Agent 调用。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitTool)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>工具名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：工单查询" {...field} />
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
                      <FormLabel>工具编码</FormLabel>
                      <FormControl>
                        <Input placeholder="ticket.query" {...field} />
                      </FormControl>
                      <FormDescription>全局唯一，建议使用「模块.动作」格式。</FormDescription>
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
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>工具描述</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="说明工具用途、限制与风险" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parameterSchema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>参数 Schema（JSON）</FormLabel>
                    <FormControl>
                      <Textarea rows={7} className="font-mono text-2xs" {...field} />
                    </FormControl>
                    <FormDescription>提交前会校验 JSON 是否可解析。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiresApproval"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <Label htmlFor="tool-approval" className="text-xs font-normal">
                        调用需要人工审批
                      </Label>
                      <p className="text-muted-foreground text-2xs">开启后每次调用都会生成审批工单。</p>
                    </div>
                    <Switch
                      id="tool-approval"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingTool(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingTool ? "保存修改" : "提交审核"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增命令策略</DialogTitle>
            <DialogDescription>策略按拒绝优先匹配，命中后不再评估后续规则。</DialogDescription>
          </DialogHeader>
          <Form {...commandForm}>
            <form onSubmit={commandForm.handleSubmit(onSubmitCommand)} className="space-y-4">
              <FormField
                control={commandForm.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>命令模式</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：rm -rf *" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={commandForm.control}
                  name="effect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>效果</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EFFECT_OPTIONS.map((option) => (
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
                  control={commandForm.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>生效范围</FormLabel>
                      <FormControl>
                        <Input placeholder="全局 / 项目级 / 生产环境" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={commandForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>策略说明</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="说明设置该策略的原因" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setCommandOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  新增策略
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={networkOpen} onOpenChange={setNetworkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新增网络策略</DialogTitle>
            <DialogDescription>默认拒绝全部出站，仅放行显式声明的域名白名单。</DialogDescription>
          </DialogHeader>
          <Form {...networkForm}>
            <form onSubmit={networkForm.handleSubmit(onSubmitNetwork)} className="space-y-4">
              <FormField
                control={networkForm.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>域名 / 地址</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：api.example.com" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={networkForm.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>方向</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="egress">出站</SelectItem>
                          <SelectItem value="ingress">入站</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={networkForm.control}
                  name="effect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>效果</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EFFECT_OPTIONS.map((option) => (
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
                control={networkForm.control}
                name="cidr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CIDR</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0.0.0/0" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={networkForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>说明</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="说明该条策略的用途" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setNetworkOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  新增策略
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailTool !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTool(null);
        }}
        title={detailTool?.name ?? "工具详情"}
        description={detailTool ? `${detailTool.code} · v${detailTool.version}` : undefined}
        footer={
          detailTool ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-2xs">
                作者 {detailTool.author} · 更新于 {formatDate(detailTool.updatedAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingTool(detailTool)}>
                  编辑
                </Button>
                <Button size="sm" onClick={() => toggleToolStatus(detailTool)}>
                  {detailTool.status === "enabled" ? "禁用工具" : "启用工具"}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailTool ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailTool.status} />
              <Badge variant="secondary">{label(detailTool.category)}</Badge>
              <RiskBadge risk={detailTool.riskLevel} />
              {detailTool.requiresApproval ? (
                <Badge variant="warning">需审批</Badge>
              ) : (
                <Badge variant="neutral">免审批</Badge>
              )}
            </div>

            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="来源">{label(detailTool.source)}</DetailRow>
                <DetailRow label="版本" mono>
                  {detailTool.version}
                </DetailRow>
                <DetailRow label="安装量">
                  <span className="num">{formatCompact(detailTool.installs)}</span>
                </DetailRow>
                <DetailRow label="评分">
                  <span className="num">
                    {detailTool.rating.toFixed(2)}（{formatCompact(detailTool.reviewCount)} 条评论）
                  </span>
                </DetailRow>
                <DetailRow label="Scopes">
                  <div className="flex flex-wrap gap-1">
                    {detailTool.scopes.length > 0 ? (
                      detailTool.scopes.map((scope) => (
                        <Badge key={scope} variant="outline">
                          {scope}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-2xs">未声明</span>
                    )}
                  </div>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="功能说明">
              <p className="text-muted-foreground text-2xs leading-relaxed">{detailTool.description}</p>
            </DetailSection>

            <DetailSection title="参数 Schema">
              <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-2xs leading-relaxed">
                {detailTool.parameterSchema}
              </pre>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        title={
          reviewTarget?.approve
            ? `通过「${reviewTarget.tool.name}」的注册申请？`
            : `驳回「${reviewTarget?.tool.name ?? ""}」的注册申请？`
        }
        description={
          reviewTarget?.approve
            ? "通过后该工具将进入可用工具列表，可按需加入 Agent 工具白名单。"
            : "驳回后申请方需修改参数 Schema 或风险声明后重新提交。"
        }
        confirmLabel={reviewTarget?.approve ? "通过申请" : "驳回申请"}
        variant={reviewTarget?.approve ? "default" : "destructive"}
        onConfirm={confirmReview}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除工具「${deleteTarget?.name ?? ""}」？`}
        description="删除后所有引用该工具的 Agent 模板会立即失效，历史调用记录保留 30 天。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={blockTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBlockTarget(null);
        }}
        title={`阻断插件「${blockTarget?.name ?? ""}」？`}
        description="阻断后该插件将从所有环境卸载，并禁止再次安装；已运行的会话会在下一轮重启时生效。"
        confirmLabel="阻断插件"
        variant="destructive"
        onConfirm={() => {
          if (!blockTarget) return;
          setPluginList((list) =>
            list.map((item) => (item.id === blockTarget.id ? { ...item, status: "blocked" } : item)),
          );
          toast.success(`已阻断插件「${blockTarget.name}」`);
          setBlockTarget(null);
        }}
      />

      <div className="text-muted-foreground flex items-center gap-2 text-2xs">
        <Braces className="size-3.5" />
        <span>工具与策略均为本地静态演示数据，操作仅更新当前页面状态。</span>
        <Button
          variant="link"
          size="xs"
          className="h-auto p-0"
          onClick={() => toast.success("已重新校验全部工具的参数 Schema")}
        >
          重新校验 Schema
        </Button>
      </div>
    </PageContainer>
  );
}
