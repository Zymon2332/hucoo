"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Coins,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  MemoryStick,
  Moon,
  PowerOff,
  Trash2,
  TriangleAlert,
  Zap,
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
import { FilterBar, FilterSelect, FilterToggle } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { workspaces as workspaceSeed } from "@/lib/mock-data/capability";
import { formatCompactCurrency, formatDate, truncate } from "@/lib/utils";
import type { Workspace } from "@/types";

const CPU_OPTIONS = ["2C", "4C", "8C", "16C"];
const MEMORY_OPTIONS = ["4Gi", "8Gi", "16Gi", "32Gi", "64Gi"];
const GPU_OPTIONS = ["无", "1×A10", "1×A100"];

const STATUS_OPTIONS = [
  { value: "running", label: "运行中" },
  { value: "idle", label: "空闲" },
  { value: "stopped", label: "已停止" },
  { value: "error", label: "异常" },
  { value: "provisioning", label: "开通中" },
];

const workspaceSchema = z.object({
  cpu: z.enum(["2C", "4C", "8C", "16C"]),
  memory: z.enum(["4Gi", "8Gi", "16Gi", "32Gi", "64Gi"]),
  disk: z.coerce.number().int().min(10, "磁盘至少 10Gi").max(500, "磁盘最多 500Gi"),
  gpu: z.enum(["无", "1×A10", "1×A100"]),
  timeoutMinutes: z.coerce.number().int().min(15, "超时至少 15 分钟").max(1440, "超时最多 1440 分钟"),
  idleRecycleMinutes: z.coerce.number().int().min(5, "回收至少 5 分钟").max(240, "回收最多 240 分钟"),
  concurrencyLimit: z.coerce.number().int().min(1, "并发至少 1").max(64, "并发最多 64"),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

const parseDisk = (disk: string) => {
  const value = Number.parseInt(disk.replace("Gi", ""), 10);
  return Number.isNaN(value) ? 20 : value;
};

interface SpecTier {
  name: string;
  cpu: string;
  memory: string;
  disk: string;
  gpu: string;
  scene: string;
}

const SPEC_TIERS: SpecTier[] = [
  { name: "基础", cpu: "2C", memory: "4Gi", disk: "20Gi", gpu: "无", scene: "轻量脚本、问答与文档处理" },
  { name: "标准", cpu: "4C", memory: "8Gi", disk: "50Gi", gpu: "无", scene: "前端开发与常规后端服务" },
  { name: "进阶", cpu: "8C", memory: "16Gi", disk: "100Gi", gpu: "可选 1×A10", scene: "中等编译、推理与数据分析" },
  { name: "计算", cpu: "16C", memory: "64Gi", disk: "200Gi", gpu: "1×A100", scene: "模型训练与大规模批处理" },
];

export default function WorkspacesPage() {
  const [workspaceList, setWorkspaceList] = React.useState<Workspace[]>(workspaceSeed);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [projectFilter, setProjectFilter] = React.useState("all");
  const [regionFilter, setRegionFilter] = React.useState("all");
  const [gpuOnly, setGpuOnly] = React.useState(false);

  const [detailWorkspace, setDetailWorkspace] = React.useState<Workspace | null>(null);
  const [editingWorkspace, setEditingWorkspace] = React.useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Workspace | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [recycleTargets, setRecycleTargets] = React.useState<Workspace[]>([]);
  const clearSelectionRef = React.useRef<(() => void) | null>(null);

  const projectOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    workspaceList.forEach((workspace) => map.set(workspace.projectId, workspace.projectName));
    return Array.from(map.entries()).map(([value, name]) => ({ value, label: name }));
  }, [workspaceList]);

  const regionOptions = React.useMemo(
    () =>
      Array.from(new Set(workspaceList.map((workspace) => workspace.region))).map((value) => ({
        value,
        label: value,
      })),
    [workspaceList],
  );

  const filtered = React.useMemo(
    () =>
      workspaceList.filter(
        (workspace) =>
          (statusFilter === "all" || workspace.status === statusFilter) &&
          (projectFilter === "all" || workspace.projectId === projectFilter) &&
          (regionFilter === "all" || workspace.region === regionFilter) &&
          (!gpuOnly || workspace.gpu !== "无"),
      ),
    [workspaceList, statusFilter, projectFilter, regionFilter, gpuOnly],
  );

  const activeFilterCount =
    [statusFilter, projectFilter, regionFilter].filter((value) => value !== "all").length +
    (gpuOnly ? 1 : 0);

  const stats = React.useMemo(() => {
    const total = workspaceList.length;
    const running = workspaceList.filter((workspace) => workspace.status === "running").length;
    const idle = workspaceList.filter((workspace) => workspace.status === "idle").length;
    const stopped = workspaceList.filter((workspace) => workspace.status === "stopped").length;
    const error = workspaceList.filter((workspace) => workspace.status === "error").length;
    const cost = workspaceList.reduce((sum, workspace) => sum + workspace.monthlyCost, 0);
    return { total, running, idle, stopped, error, cost };
  }, [workspaceList]);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      cpu: "4C",
      memory: "8Gi",
      disk: 50,
      gpu: "无",
      timeoutMinutes: 120,
      idleRecycleMinutes: 30,
      concurrencyLimit: 8,
    },
  });

  React.useEffect(() => {
    if (editingWorkspace) {
      form.reset({
        cpu: (CPU_OPTIONS.includes(editingWorkspace.cpu) ? editingWorkspace.cpu : "4C") as WorkspaceFormValues["cpu"],
        memory: (MEMORY_OPTIONS.includes(editingWorkspace.memory)
          ? editingWorkspace.memory
          : "8Gi") as WorkspaceFormValues["memory"],
        disk: parseDisk(editingWorkspace.disk),
        gpu: (GPU_OPTIONS.includes(editingWorkspace.gpu) ? editingWorkspace.gpu : "无") as WorkspaceFormValues["gpu"],
        timeoutMinutes: editingWorkspace.timeoutMinutes,
        idleRecycleMinutes: editingWorkspace.idleRecycleMinutes,
        concurrencyLimit: editingWorkspace.concurrencyLimit,
      });
    }
  }, [editingWorkspace, form]);

  const onSubmit = (values: WorkspaceFormValues) => {
    if (!editingWorkspace) return;
    setWorkspaceList((list) =>
      list.map((workspace) =>
        workspace.id === editingWorkspace.id
          ? {
              ...workspace,
              cpu: values.cpu,
              memory: values.memory,
              disk: `${values.disk}Gi`,
              gpu: values.gpu,
              timeoutMinutes: values.timeoutMinutes,
              idleRecycleMinutes: values.idleRecycleMinutes,
              concurrencyLimit: values.concurrencyLimit,
            }
          : workspace,
      ),
    );
    toast.success(`已更新工作区「${editingWorkspace.name}」资源规格`);
    setEditingWorkspace(null);
  };

  const toggleStatus = (workspace: Workspace) => {
    if (workspace.status === "running" || workspace.status === "provisioning") {
      setWorkspaceList((list) =>
        list.map((item) => (item.id === workspace.id ? { ...item, status: "stopped" } : item)),
      );
      toast.success(`已停止工作区「${workspace.name}」`);
      return;
    }
    setWorkspaceList((list) =>
      list.map((item) => (item.id === workspace.id ? { ...item, status: "running" } : item)),
    );
    toast.success(`已启动工作区「${workspace.name}」`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setWorkspaceList((list) => list.filter((workspace) => workspace.id !== deleteTarget.id));
      toast.success(`已回收工作区「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 500);
  };

  const confirmRecycle = () => {
    const ids = new Set(recycleTargets.map((workspace) => workspace.id));
    setWorkspaceList((list) => list.filter((workspace) => !ids.has(workspace.id)));
    toast.success(`已批量回收 ${recycleTargets.length} 个工作区`);
    clearSelectionRef.current?.();
    setRecycleTargets([]);
  };

  const columns = React.useMemo<ColumnDef<Workspace, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "工作区",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: "projectName",
        accessorKey: "projectName",
        header: "项目 / 租户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-2xs">{row.original.projectName}</p>
            <p className="text-muted-foreground text-2xs">{row.original.tenantName}</p>
          </div>
        ),
      },
      {
        id: "image",
        accessorKey: "image",
        header: "镜像",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.image}>
            {truncate(row.original.image, 30)}
          </span>
        ),
      },
      {
        id: "resources",
        header: "CPU / 内存 / 磁盘 / GPU",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="num text-2xs">
            {row.original.cpu} / {row.original.memory} / {row.original.disk} / {row.original.gpu}
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
        id: "timeoutMinutes",
        accessorKey: "timeoutMinutes",
        header: "超时",
        cell: ({ row }) => <span className="num text-2xs">{row.original.timeoutMinutes} 分</span>,
      },
      {
        id: "idleRecycleMinutes",
        accessorKey: "idleRecycleMinutes",
        header: "空闲回收",
        cell: ({ row }) => (
          <span className="num text-2xs">{row.original.idleRecycleMinutes} 分</span>
        ),
      },
      {
        id: "concurrencyLimit",
        accessorKey: "concurrencyLimit",
        header: "并发上限",
        cell: ({ row }) => <span className="num text-2xs">{row.original.concurrencyLimit}</span>,
      },
      {
        id: "region",
        accessorKey: "region",
        header: "区域",
        cell: ({ row }) => <span className="text-2xs">{row.original.region}</span>,
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "负责人",
        cell: ({ row }) => <span className="text-2xs">{row.original.owner}</span>,
      },
      {
        id: "monthlyCost",
        accessorKey: "monthlyCost",
        header: "月度成本",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.monthlyCost)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailWorkspace(row.original)}
            onEdit={() => setEditingWorkspace(row.original)}
            statusActive={row.original.status === "running" || row.original.status === "provisioning"}
            onToggleStatus={() => toggleStatus(row.original)}
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
        title="工作区"
        description="管理 Agent 运行工作区的镜像、资源规格、生命周期与成本，支持批量回收闲置实例。"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success(`已导出 ${filtered.length} 条工作区数据（演示）`)}
          >
            <Download />
            导出
          </Button>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="工作区总数" value={stats.total} icon={Gauge} delta={2.7} />
        <StatCard label="运行中" value={stats.running} icon={Activity} tone="success" />
        <StatCard label="空闲" value={stats.idle} icon={Moon} tone="info" />
        <StatCard label="已停止" value={stats.stopped} icon={PowerOff} />
        <StatCard label="异常" value={stats.error} icon={TriangleAlert} tone="danger" />
        <StatCard
          label="月度成本"
          value={stats.cost}
          icon={Coins}
          tone="warning"
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setStatusFilter("all");
          setProjectFilter("all");
          setRegionFilter("all");
          setGpuOnly(false);
        }}
      >
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="项目" value={projectFilter} onChange={setProjectFilter} options={projectOptions} />
        <FilterSelect label="区域" value={regionFilter} onChange={setRegionFilter} options={regionOptions} />
        <FilterToggle label="仅 GPU 实例" active={gpuOnly} onClick={() => setGpuOnly((value) => !value)} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索工作区名称、项目、镜像、负责人…"
        onRowClick={(row) => setDetailWorkspace(row)}
        enableRowSelection
        bulkActions={(rows, clear) => (
          <Button
            variant="ghost"
            size="xs"
            className="text-destructive"
            onClick={() => {
              clearSelectionRef.current = clear;
              setRecycleTargets(rows);
            }}
          >
            <Trash2 />
            批量回收
          </Button>
        )}
        emptyTitle="没有符合条件的工作区"
      />

      <SectionHeader title="资源规格说明" description="常见规格档位与推荐适用场景" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>档位</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Cpu className="size-3.5" />
                  CPU
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <MemoryStick className="size-3.5" />
                  内存
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <HardDrive className="size-3.5" />
                  磁盘
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Zap className="size-3.5" />
                  GPU
                </span>
              </TableHead>
              <TableHead>推荐场景</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SPEC_TIERS.map((tier) => (
              <TableRow key={tier.name}>
                <TableCell>
                  <Badge variant="secondary">{tier.name}</Badge>
                </TableCell>
                <TableCell className="num text-xs">{tier.cpu}</TableCell>
                <TableCell className="num text-xs">{tier.memory}</TableCell>
                <TableCell className="num text-xs">{tier.disk}</TableCell>
                <TableCell className="num text-xs">{tier.gpu}</TableCell>
                <TableCell className="text-muted-foreground text-2xs">{tier.scene}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editingWorkspace !== null}
        onOpenChange={(open) => {
          if (!open) setEditingWorkspace(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorkspace ? `编辑工作区 · ${editingWorkspace.name}` : "编辑工作区"}
            </DialogTitle>
            <DialogDescription>
              调整资源规格会触发工作区重建，重建期间该工作区的会话会短暂不可用。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="cpu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPU</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CPU_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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
                  name="memory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>内存</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MEMORY_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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
                  name="gpu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPU</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GPU_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
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
                  name="disk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>磁盘（Gi）</FormLabel>
                      <FormControl>
                        <Input type="number" min={10} max={500} step={10} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timeoutMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>运行超时（分钟）</FormLabel>
                      <FormControl>
                        <Input type="number" min={15} max={1440} step={15} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idleRecycleMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>空闲回收（分钟）</FormLabel>
                      <FormControl>
                        <Input type="number" min={5} max={240} step={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="concurrencyLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>并发上限</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={64} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingWorkspace(null)}
                >
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
        open={detailWorkspace !== null}
        onOpenChange={(open) => {
          if (!open) setDetailWorkspace(null);
        }}
        title={detailWorkspace?.name ?? "工作区详情"}
        description={detailWorkspace ? `${detailWorkspace.projectName} · ${detailWorkspace.region}` : undefined}
        footer={
          detailWorkspace ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-2xs">
                负责人 {detailWorkspace.owner} · 创建于 {formatDate(detailWorkspace.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingWorkspace(detailWorkspace)}>
                  编辑
                </Button>
                <Button size="sm" onClick={() => toggleStatus(detailWorkspace)}>
                  {detailWorkspace.status === "running" ? "停止工作区" : "启动工作区"}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailWorkspace ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailWorkspace.status} />
              <Badge variant="outline">{detailWorkspace.tenantName}</Badge>
              <Badge variant={detailWorkspace.gpu !== "无" ? "warning" : "neutral"}>
                {detailWorkspace.gpu === "无" ? "无 GPU" : detailWorkspace.gpu}
              </Badge>
            </div>

            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="工作区 ID" mono>
                  {detailWorkspace.id}
                </DetailRow>
                <DetailRow label="项目">{detailWorkspace.projectName}</DetailRow>
                <DetailRow label="镜像" mono>
                  {detailWorkspace.image}
                </DetailRow>
                <DetailRow label="区域">{detailWorkspace.region}</DetailRow>
                <DetailRow label="负责人">{detailWorkspace.owner}</DetailRow>
                <DetailRow label="月度成本">
                  <span className="num">{formatCompactCurrency(detailWorkspace.monthlyCost)}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="资源规格">
              <DetailGrid columns={3}>
                <DetailRow label="CPU">
                  <span className="num">{detailWorkspace.cpu}</span>
                </DetailRow>
                <DetailRow label="内存">
                  <span className="num">{detailWorkspace.memory}</span>
                </DetailRow>
                <DetailRow label="磁盘">
                  <span className="num">{detailWorkspace.disk}</span>
                </DetailRow>
                <DetailRow label="GPU">
                  <span className="num">{detailWorkspace.gpu}</span>
                </DetailRow>
                <DetailRow label="运行超时">
                  <span className="num">{detailWorkspace.timeoutMinutes} 分钟</span>
                </DetailRow>
                <DetailRow label="空闲回收">
                  <span className="num">{detailWorkspace.idleRecycleMinutes} 分钟</span>
                </DetailRow>
                <DetailRow label="并发上限">
                  <span className="num">{detailWorkspace.concurrencyLimit}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={recycleTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) setRecycleTargets([]);
        }}
        title={`批量回收 ${recycleTargets.length} 个工作区？`}
        description={`已选中 ${recycleTargets.length} 个工作区，回收后磁盘数据将被清除且不可恢复，正在运行的会话会立即中断。`}
        confirmLabel={`回收 ${recycleTargets.length} 个工作区`}
        onConfirm={confirmRecycle}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`回收工作区「${deleteTarget?.name ?? ""}」？`}
        description="回收后该工作区的容器与磁盘会被删除，未提交的工作区文件将无法找回。"
        confirmLabel="确认回收"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
