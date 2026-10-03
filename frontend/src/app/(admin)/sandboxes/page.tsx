"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Bug,
  Download,
  Plus,
  RotateCcw,
  ScanLine,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect, FilterToggle } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { ChartCard } from "@/components/common/chart-card";
import { SparkLine } from "@/components/charts";
import { sandboxes as sandboxSeed } from "@/lib/mock-data/capability";
import { label } from "@/lib/labels";
import { formatCompact, formatDate, formatRelativeTime } from "@/lib/utils";
import type { Sandbox } from "@/types";

const NETWORK_POLICY_LABEL: Record<Sandbox["networkPolicy"], string> = {
  "deny-all": "全部禁止",
  allowlist: "白名单",
  "proxy-only": "仅代理",
  open: "开放",
};

const STATUS_OPTIONS = [
  { value: "ready", label: "可用" },
  { value: "scanning", label: "扫描中" },
  { value: "vulnerable", label: "存在漏洞" },
  { value: "deprecated", label: "已弃用" },
  { value: "building", label: "构建中" },
];

const NETWORK_OPTIONS = [
  { value: "deny-all", label: "全部禁止" },
  { value: "allowlist", label: "白名单" },
  { value: "proxy-only", label: "仅代理" },
  { value: "open", label: "开放" },
];

const BASELINE_OPTIONS = [
  { value: "cis", label: "CIS Benchmark" },
  { value: "pci-dss", label: "PCI-DSS 基线" },
  { value: "internal", label: "内部基线" },
];

const sandboxSchema = z.object({
  name: z
    .string()
    .min(2, "名称至少 2 个字符")
    .max(40, "名称过长")
    .regex(/^[a-z0-9-]+$/, "只能包含小写字母、数字与连字符"),
  projectName: z.string().min(1, "请选择所属项目"),
  image: z.string().min(4, "请填写镜像地址"),
  cpu: z.enum(["2C", "4C", "8C", "16C"]),
  memory: z.enum(["4Gi", "8Gi", "16Gi", "32Gi", "64Gi"]),
  disk: z.coerce.number().int().min(10, "磁盘至少 10Gi").max(500, "磁盘最多 500Gi"),
  gpu: z.enum(["无", "1×A10", "1×A100"]),
  networkPolicy: z.enum(["deny-all", "allowlist", "proxy-only", "open"]),
  snapshotEnabled: z.boolean(),
});

type SandboxFormValues = z.infer<typeof sandboxSchema>;

const CPU_OPTIONS = ["2C", "4C", "8C", "16C"];
const MEMORY_OPTIONS = ["4Gi", "8Gi", "16Gi", "32Gi", "64Gi"];
const GPU_OPTIONS = ["无", "1×A10", "1×A100"];

const hashOf = (value: string) =>
  value.split("").reduce((accumulator, char) => (accumulator * 37 + char.charCodeAt(0)) % 9973, 5);

const buildTrend = (seed: number, base: number) =>
  Array.from({ length: 14 }, (_, index) => {
    const wave = 0.7 + ((seed + index * 23) % 48) / 100;
    return {
      label: `D-${13 - index}`,
      executions: Math.max(0, Math.round(base * wave * (1 + index * 0.012))),
    };
  });

export default function SandboxesPage() {
  const [sandboxList, setSandboxList] = React.useState<Sandbox[]>(sandboxSeed);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [networkFilter, setNetworkFilter] = React.useState("all");
  const [baselineFilter, setBaselineFilter] = React.useState("all");
  const [snapshotOnly, setSnapshotOnly] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailSandbox, setDetailSandbox] = React.useState<Sandbox | null>(null);
  const [deprecateTarget, setDeprecateTarget] = React.useState<Sandbox | null>(null);

  const projectOptions = React.useMemo(
    () =>
      Array.from(new Set(sandboxList.map((sandbox) => sandbox.projectName))).map((value) => ({
        value,
        label: value,
      })),
    [sandboxList],
  );

  const filtered = React.useMemo(
    () =>
      sandboxList.filter(
        (sandbox) =>
          (statusFilter === "all" || sandbox.status === statusFilter) &&
          (networkFilter === "all" || sandbox.networkPolicy === networkFilter) &&
          (baselineFilter === "all" || sandbox.complianceBaseline === baselineFilter) &&
          (!snapshotOnly || sandbox.snapshotEnabled),
      ),
    [sandboxList, statusFilter, networkFilter, baselineFilter, snapshotOnly],
  );

  const activeFilterCount =
    [statusFilter, networkFilter, baselineFilter].filter((value) => value !== "all").length +
    (snapshotOnly ? 1 : 0);

  const stats = React.useMemo(() => {
    const total = sandboxList.length;
    const ready = sandboxList.filter((sandbox) => sandbox.status === "ready").length;
    const scanning = sandboxList.filter((sandbox) => sandbox.status === "scanning").length;
    const vulnerable = sandboxList.filter((sandbox) => sandbox.status === "vulnerable").length;
    const critical = sandboxList.reduce((sum, sandbox) => sum + sandbox.vulnCritical, 0);
    const executions = sandboxList.reduce((sum, sandbox) => sum + sandbox.executions24h, 0);
    return { total, ready, scanning, vulnerable, critical, executions };
  }, [sandboxList]);

  const form = useForm<SandboxFormValues>({
    resolver: zodResolver(sandboxSchema),
    defaultValues: {
      name: "",
      projectName: "",
      image: "registry.internal/sandbox/",
      cpu: "4C",
      memory: "8Gi",
      disk: 50,
      gpu: "无",
      networkPolicy: "allowlist",
      snapshotEnabled: true,
    },
  });

  const onSubmit = (values: SandboxFormValues) => {
    const tenantName =
      sandboxList.find((sandbox) => sandbox.projectName === values.projectName)?.tenantName ?? "—";
    const newSandbox: Sandbox = {
      id: `sb-${String(sandboxList.length + 1).padStart(2, "0")}`,
      name: values.name,
      projectName: values.projectName,
      tenantName,
      image: values.image,
      imageVersion: "1.0.0",
      registry: "registry.internal",
      status: "building",
      cpu: values.cpu,
      memory: values.memory,
      disk: `${values.disk}Gi`,
      gpu: values.gpu,
      networkPolicy: values.networkPolicy,
      egressProxy: values.networkPolicy === "proxy-only" ? "http://egress-proxy.internal:3128" : "—",
      dnsControl: true,
      snapshotEnabled: values.snapshotEnabled,
      prewarmDeps: false,
      vulnCritical: 0,
      vulnHigh: 0,
      complianceBaseline: "internal",
      lastScanAt: new Date().toISOString(),
      executions24h: 0,
    };
    setSandboxList((list) => [newSandbox, ...list]);
    toast.success(`已创建沙箱「${values.name}」，正在构建镜像`);
    setCreateOpen(false);
    form.reset();
  };

  const scanSandbox = (sandbox: Sandbox) => {
    setSandboxList((list) =>
      list.map((item) => (item.id === sandbox.id ? { ...item, status: "scanning" } : item)),
    );
    toast.success(`已触发「${sandbox.name}」的漏洞扫描`);
  };

  const rebuildSandbox = (sandbox: Sandbox) => {
    setSandboxList((list) =>
      list.map((item) => (item.id === sandbox.id ? { ...item, status: "building" } : item)),
    );
    toast.success(`已开始重建「${sandbox.name}」镜像`);
  };

  const columns = React.useMemo<ColumnDef<Sandbox, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "沙箱",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">{row.original.projectName}</p>
          </div>
        ),
      },
      {
        id: "image",
        accessorKey: "image",
        header: "镜像",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-muted-foreground font-mono text-2xs" title={row.original.image}>
              {row.original.image}
            </p>
            <p className="text-muted-foreground font-mono text-2xs">v{row.original.imageVersion}</p>
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
        id: "networkPolicy",
        accessorKey: "networkPolicy",
        header: "网络策略",
        cell: ({ row }) => (
          <Badge variant="outline">{NETWORK_POLICY_LABEL[row.original.networkPolicy]}</Badge>
        ),
      },
      {
        id: "egressProxy",
        accessorKey: "egressProxy",
        header: "出网代理",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">
            {row.original.egressProxy}
          </span>
        ),
      },
      {
        id: "dnsControl",
        accessorKey: "dnsControl",
        header: "DNS 控制",
        cell: ({ row }) => (
          <StatusBadge status={row.original.dnsControl ? "enabled" : "disabled"} dot={false} />
        ),
      },
      {
        id: "snapshot",
        header: "快照 / 预热",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Badge variant={row.original.snapshotEnabled ? "success" : "neutral"}>快照</Badge>
            <Badge variant={row.original.prewarmDeps ? "success" : "neutral"}>预热</Badge>
          </div>
        ),
      },
      {
        id: "vulnCritical",
        accessorKey: "vulnCritical",
        header: "严重漏洞",
        cell: ({ row }) =>
          row.original.vulnCritical > 0 ? (
            <Badge variant="danger" className="num">
              {row.original.vulnCritical}
            </Badge>
          ) : (
            <span className="num text-2xs">0</span>
          ),
      },
      {
        id: "complianceBaseline",
        accessorKey: "complianceBaseline",
        header: "合规基线",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.complianceBaseline)}</Badge>,
      },
      {
        id: "lastScanAt",
        accessorKey: "lastScanAt",
        header: "最后扫描",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {formatRelativeTime(row.original.lastScanAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => {
          const sandbox = row.original;
          return (
            <RowActions
              onView={() => setDetailSandbox(sandbox)}
              extraItems={[
                { label: "触发漏洞扫描", onSelect: () => scanSandbox(sandbox) },
                { label: "重建镜像", onSelect: () => rebuildSandbox(sandbox) },
                {
                  label: "弃用沙箱",
                  destructive: true,
                  onSelect: () => setDeprecateTarget(sandbox),
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
        title="沙箱与镜像"
        description="管理沙箱镜像、网络与安全策略、漏洞扫描与合规基线，保障 Agent 运行环境可信。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已为 ${filtered.length} 个沙箱触发漏洞扫描`)}
            >
              <ScanLine />
              触发漏洞扫描
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已提交全部沙箱镜像的重建任务（演示）")}
            >
              <RotateCcw />
              重建镜像
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              新建沙箱
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="沙箱总数" value={stats.total} icon={Server} delta={1.8} />
        <StatCard label="可用" value={stats.ready} icon={ShieldCheck} tone="success" />
        <StatCard label="扫描中" value={stats.scanning} icon={ScanLine} tone="info" />
        <StatCard label="存在漏洞" value={stats.vulnerable} icon={Bug} tone="warning" />
        <StatCard label="高危漏洞总数" value={stats.critical} icon={ShieldAlert} tone="danger" />
        <StatCard
          label="24h 执行次数"
          value={stats.executions}
          icon={Activity}
          valueFormatter={(value) => formatCompact(value)}
          delta={7.3}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setStatusFilter("all");
          setNetworkFilter("all");
          setBaselineFilter("all");
          setSnapshotOnly(false);
        }}
      >
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="网络策略" value={networkFilter} onChange={setNetworkFilter} options={NETWORK_OPTIONS} />
        <FilterSelect label="合规基线" value={baselineFilter} onChange={setBaselineFilter} options={BASELINE_OPTIONS} />
        <FilterToggle
          label="仅启用快照"
          active={snapshotOnly}
          onClick={() => setSnapshotOnly((value) => !value)}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索沙箱名称、项目、镜像…"
        onRowClick={(row) => setDetailSandbox(row)}
        emptyTitle="没有符合条件的沙箱"
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            新建沙箱
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建沙箱</DialogTitle>
            <DialogDescription>
              新建沙箱会基于指定镜像构建环境，默认启用 DNS 控制与合规基线校验。
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
                      <FormLabel>沙箱名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：node20-standard" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>所属项目</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="请选择项目" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectOptions.map((option) => (
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
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>镜像地址</FormLabel>
                    <FormControl>
                      <Input placeholder="registry.internal/sandbox/…" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  name="networkPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>网络策略</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NETWORK_OPTIONS.map((option) => (
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
                  name="snapshotEnabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <Label htmlFor="sandbox-snapshot" className="text-xs font-normal">
                          快照开关
                        </Label>
                        <p className="text-muted-foreground text-2xs">会话结束后保留环境快照以便快速恢复。</p>
                      </div>
                      <Switch
                        id="sandbox-snapshot"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建沙箱
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailSandbox !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSandbox(null);
        }}
        title={detailSandbox?.name ?? "沙箱详情"}
        description={
          detailSandbox ? `${detailSandbox.projectName} · ${detailSandbox.registry}` : undefined
        }
        footer={
          detailSandbox ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-2xs">
                最后扫描 {formatRelativeTime(detailSandbox.lastScanAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => scanSandbox(detailSandbox)}>
                  <ScanLine />
                  扫描
                </Button>
                <Button size="sm" onClick={() => rebuildSandbox(detailSandbox)}>
                  <RotateCcw />
                  重建镜像
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailSandbox ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailSandbox.status} />
              <Badge variant="outline">{NETWORK_POLICY_LABEL[detailSandbox.networkPolicy]}</Badge>
              <Badge variant="secondary">{label(detailSandbox.complianceBaseline)}</Badge>
              {detailSandbox.snapshotEnabled ? <Badge variant="success">快照</Badge> : null}
            </div>

            <DetailSection title="镜像信息">
              <DetailGrid>
                <DetailRow label="沙箱 ID" mono>
                  {detailSandbox.id}
                </DetailRow>
                <DetailRow label="所属项目">{detailSandbox.projectName}</DetailRow>
                <DetailRow label="租户">{detailSandbox.tenantName}</DetailRow>
                <DetailRow label="镜像" mono>
                  {detailSandbox.image}
                </DetailRow>
                <DetailRow label="镜像版本" mono>
                  v{detailSandbox.imageVersion}
                </DetailRow>
                <DetailRow label="镜像仓库" mono>
                  {detailSandbox.registry}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="资源配置">
              <DetailGrid columns={3}>
                <DetailRow label="CPU">
                  <span className="num">{detailSandbox.cpu}</span>
                </DetailRow>
                <DetailRow label="内存">
                  <span className="num">{detailSandbox.memory}</span>
                </DetailRow>
                <DetailRow label="磁盘">
                  <span className="num">{detailSandbox.disk}</span>
                </DetailRow>
                <DetailRow label="GPU">
                  <span className="num">{detailSandbox.gpu}</span>
                </DetailRow>
                <DetailRow label="依赖预热">
                  {detailSandbox.prewarmDeps ? "已启用" : "未启用"}
                </DetailRow>
                <DetailRow label="24h 执行">
                  <span className="num">{formatCompact(detailSandbox.executions24h)}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="网络与安全">
              <DetailGrid>
                <DetailRow label="网络策略">
                  {NETWORK_POLICY_LABEL[detailSandbox.networkPolicy]}
                </DetailRow>
                <DetailRow label="出网代理" mono>
                  {detailSandbox.egressProxy}
                </DetailRow>
                <DetailRow label="DNS 控制">
                  <StatusBadge status={detailSandbox.dnsControl ? "enabled" : "disabled"} />
                </DetailRow>
                <DetailRow label="快照">
                  <StatusBadge status={detailSandbox.snapshotEnabled ? "enabled" : "disabled"} />
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="漏洞摘要">
              <Alert variant={detailSandbox.vulnCritical > 0 ? "destructive" : "success"}>
                <Bug />
                <AlertTitle>
                  {detailSandbox.vulnCritical > 0
                    ? `发现 ${detailSandbox.vulnCritical} 个严重漏洞`
                    : "未发现严重漏洞"}
                </AlertTitle>
                <AlertDescription>
                  严重漏洞 {detailSandbox.vulnCritical} 个 · 高危漏洞 {detailSandbox.vulnHigh} 个。
                  {detailSandbox.vulnCritical > 0
                    ? " 请尽快升级基础镜像或移除受影响依赖后再投入生产。"
                    : " 当前镜像满足上线安全要求。"}
                </AlertDescription>
              </Alert>
            </DetailSection>

            <DetailSection title="合规基线">
              <DetailGrid>
                <DetailRow label="基线标准">{label(detailSandbox.complianceBaseline)}</DetailRow>
                <DetailRow label="最近扫描">
                  <span className="num">{formatDate(detailSandbox.lastScanAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="执行量趋势" description="近 14 天沙箱执行次数">
              <ChartCard title="执行次数" contentClassName="pt-1">
                <SparkLine
                  data={buildTrend(hashOf(detailSandbox.id), detailSandbox.executions24h / 14)}
                  dataKey="executions"
                  height={64}
                  color="var(--chart-2)"
                />
              </ChartCard>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={deprecateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeprecateTarget(null);
        }}
        title={`弃用沙箱「${deprecateTarget?.name ?? ""}」？`}
        description="弃用后该镜像不再接收新的构建任务，已有实例仍可运行，建议同时通知使用方迁移。"
        confirmLabel="确认弃用"
        onConfirm={() => {
          if (!deprecateTarget) return;
          setSandboxList((list) =>
            list.map((item) =>
              item.id === deprecateTarget.id ? { ...item, status: "deprecated" } : item,
            ),
          );
          toast.success(`已弃用沙箱「${deprecateTarget.name}」`);
          setDeprecateTarget(null);
        }}
      />

      <div className="text-muted-foreground flex items-center gap-2 text-2xs">
        <Download className="size-3.5" />
        <span>沙箱与漏洞数据均为本地静态演示数据，扫描与重建仅更新页面状态。</span>
      </div>
    </PageContainer>
  );
}
