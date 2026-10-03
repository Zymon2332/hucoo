"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  ListChecks,
  Loader2,
  Play,
  RefreshCw,
  Timer,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  buildValidationChecks,
  customModels,
  modelValidationRuns,
} from "@/lib/mock-data/models";
import { formatDate, formatNumber, truncate } from "@/lib/utils";
import type { ModelValidationCheck, ModelValidationRun } from "@/types";

const VALIDATION_ITEMS: { key: ModelValidationCheck["key"]; label: string }[] = [
  { key: "connection", label: "连通性" },
  { key: "streaming", label: "流式输出" },
  { key: "timeout", label: "超时控制" },
  { key: "concurrency", label: "并发能力" },
  { key: "tool-calling", label: "工具调用" },
  { key: "json-mode", label: "JSON 模式" },
  { key: "token-usage", label: "Token 统计" },
  { key: "context-length", label: "上下文长度" },
  { key: "multimodal", label: "多模态" },
];

const VALIDATION_KEYS = [
  "connection",
  "streaming",
  "timeout",
  "concurrency",
  "tool-calling",
  "json-mode",
  "token-usage",
  "context-length",
  "multimodal",
] as const;

const RUN_STATUS_OPTIONS = [
  { value: "passed", label: "通过" },
  { value: "failed", label: "失败" },
  { value: "running", label: "运行中" },
  { value: "queued", label: "排队中" },
];

const ACCESS_TYPE_OPTIONS = [
  { value: "byok", label: "BYOK 自有密钥" },
  { value: "custom-endpoint", label: "自定义 Endpoint" },
  { value: "local", label: "本地部署" },
  { value: "gateway", label: "企业网关" },
];

const startSchema = z.object({
  customModelId: z.string().min(1, "请选择自定义模型"),
  checks: z.array(z.enum(VALIDATION_KEYS)).min(1, "至少选择一项验证项"),
  timeoutMs: z.coerce
    .number()
    .int("超时时间必须为整数")
    .min(1_000, "超时时间不得低于 1000 ms")
    .max(300_000, "超时时间不得高于 300000 ms"),
  concurrency: z.coerce.number().int("并发必须为整数").min(1, "并发至少为 1").max(128, "并发过高"),
});

type StartFormValues = z.infer<typeof startSchema>;

function CheckStatusIcon({ status }: { status: ModelValidationCheck["status"] }) {
  if (status === "passed") return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />;
  if (status === "failed") return <XCircle className="size-3.5 shrink-0 text-red-600" />;
  if (status === "running") return <Loader2 className="size-3.5 shrink-0 animate-spin text-violet-500" />;
  return <Clock className="text-muted-foreground size-3.5 shrink-0" />;
}

export default function ModelValidationPage() {
  const [runList, setRunList] = React.useState<ModelValidationRun[]>(modelValidationRuns);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [accessFilter, setAccessFilter] = React.useState("all");
  const [startOpen, setStartOpen] = React.useState(false);
  const [detailRun, setDetailRun] = React.useState<ModelValidationRun | null>(null);

  const accessTypeById = React.useMemo(() => {
    const map = new Map<string, string>();
    customModels.forEach((model) => map.set(model.id, model.accessType));
    return map;
  }, []);

  const tenantOptions = React.useMemo(
    () =>
      Array.from(new Set(runList.map((run) => run.tenantName))).map((value) => ({
        value,
        label: value,
      })),
    [runList],
  );

  const filtered = React.useMemo(
    () =>
      runList.filter(
        (run) =>
          (statusFilter === "all" || run.status === statusFilter) &&
          (tenantFilter === "all" || run.tenantName === tenantFilter) &&
          (accessFilter === "all" || accessTypeById.get(run.customModelId) === accessFilter),
      ),
    [runList, statusFilter, tenantFilter, accessFilter, accessTypeById],
  );

  const activeFilterCount = [statusFilter, tenantFilter, accessFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = runList.length;
    const passed = runList.filter((run) => run.status === "passed").length;
    const failed = runList.filter((run) => run.status === "failed").length;
    const running = runList.filter((run) => run.status === "running").length;
    const queued = runList.filter((run) => run.status === "queued").length;
    const averageDuration =
      total === 0 ? 0 : runList.reduce((sum, run) => sum + run.durationMs, 0) / total;
    return { total, passed, failed, running, queued, averageDuration };
  }, [runList]);

  const form = useForm<StartFormValues>({
    resolver: zodResolver(startSchema),
    defaultValues: {
      customModelId: customModels[0]?.id ?? "",
      checks: [...VALIDATION_KEYS],
      timeoutMs: 30_000,
      concurrency: 8,
    },
  });

  React.useEffect(() => {
    if (startOpen) {
      form.reset({
        customModelId: customModels[0]?.id ?? "",
        checks: [...VALIDATION_KEYS],
        timeoutMs: 30_000,
        concurrency: 8,
      });
    }
  }, [startOpen, form]);

  const onStartSubmit = (values: StartFormValues) => {
    const model = customModels.find((item) => item.id === values.customModelId);
    if (!model) {
      toast.error("未找到对应的自定义模型");
      return;
    }
    const checks = buildValidationChecks("queued", Date.now() % 90_000).filter((check) =>
      values.checks.includes(check.key),
    );
    const newRun: ModelValidationRun = {
      id: `mv-${String(runList.length + 1).padStart(2, "0")}`,
      customModelId: model.id,
      modelName: model.name,
      tenantName: model.tenantName,
      runner: "平台自动验证器",
      status: "queued",
      startedAt: new Date().toISOString(),
      durationMs: 0,
      failureReason: null,
      checks,
    };
    setRunList((list) => [newRun, ...list]);
    toast.success(
      `已发起「${model.name}」的验证任务，共 ${checks.length} 项（超时 ${values.timeoutMs} ms / 并发 ${values.concurrency}）`,
    );
    setStartOpen(false);
  };

  const rerunRun = (run: ModelValidationRun) => {
    setRunList((list) =>
      list.map((item) =>
        item.id === run.id
          ? {
              ...item,
              status: "running",
              startedAt: new Date().toISOString(),
              failureReason: null,
              checks: item.checks.map((check) =>
                check.status === "failed"
                  ? { ...check, status: "running", detail: "重新执行中…" }
                  : check,
              ),
            }
          : item,
      ),
    );
    toast.success(`已重新执行「${run.modelName}」的验证任务`);
  };

  const columns: ColumnDef<ModelValidationRun, unknown>[] = [
    {
      id: "modelName",
        accessorKey: "modelName",
        header: "模型",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{row.original.modelName}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.customModelId}</p>
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
        id: "runner",
        accessorKey: "runner",
        header: "执行人",
        cell: ({ row }) => <span className="text-2xs">{row.original.runner}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "startedAt",
        accessorKey: "startedAt",
        header: "开始时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.startedAt, "yyyy-MM-dd HH:mm")}</span>
        ),
      },
      {
        id: "durationMs",
        accessorKey: "durationMs",
        header: "耗时",
        cell: ({ row }) => (
          <span className="num text-xs">{formatNumber(row.original.durationMs)} ms</span>
        ),
      },
      {
        id: "failureReason",
        accessorKey: "failureReason",
        header: "失败原因",
        cell: ({ row }) =>
          row.original.failureReason ? (
            <span className="text-2xs text-red-600 dark:text-red-400" title={row.original.failureReason}>
              {truncate(row.original.failureReason, 32)}
            </span>
          ) : (
            <span className="text-muted-foreground text-2xs">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            viewLabel="查看结果"
            onView={() => setDetailRun(row.original)}
            extraItems={[{ label: "重跑验证", onSelect: () => rerunRun(row.original) }]}
          />
        ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="模型验证"
        description="对自定义模型执行连通性、流式、工具调用等 9 项验证，跟踪执行状态与失败原因并支持重跑。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条验证记录（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setStartOpen(true)}>
              <Play />
              发起验证
            </Button>
          </>
        }
        badges={<Badge variant="secondary">自动化验证</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="验证任务总数" value={stats.total} icon={ClipboardCheck} />
        <StatCard label="通过" value={stats.passed} icon={CheckCircle2} tone="success" />
        <StatCard label="失败" value={stats.failed} icon={XCircle} tone="danger" />
        <StatCard label="运行中" value={stats.running} icon={Loader2} tone="info" />
        <StatCard label="排队" value={stats.queued} icon={Clock} />
        <StatCard
          label="平均耗时"
          value={stats.averageDuration}
          valueFormatter={(value) => `${formatNumber(Math.round(value))} ms`}
          icon={Timer}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setStatusFilter("all");
          setTenantFilter("all");
          setAccessFilter("all");
        }}
      >
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={RUN_STATUS_OPTIONS}
        />
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
        <FilterSelect
          label="接入方式"
          value={accessFilter}
          onChange={setAccessFilter}
          options={ACCESS_TYPE_OPTIONS}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索模型名、租户、执行人、失败原因…"
        enableRowSelection
        onRowClick={(row) => setDetailRun(row)}
        bulkActions={(rows, clear) => (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              const ids = new Set(rows.map((row) => row.id));
              setRunList((list) =>
                list.map((run) =>
                  ids.has(run.id) ? { ...run, status: "running", failureReason: null } : run,
                ),
              );
              toast.success(`已批量重跑 ${rows.length} 个验证任务`);
              clear();
            }}
          >
            <RefreshCw />
            批量重跑
          </Button>
        )}
        emptyTitle="没有符合条件的验证任务"
        emptyDescription="调整状态、租户或接入方式筛选，或发起新的验证任务。"
        emptyAction={
          <Button size="sm" onClick={() => setStartOpen(true)}>
            <Play />
            发起验证
          </Button>
        }
      />

      <Dialog
        open={startOpen}
        onOpenChange={(open) => {
          if (!open) setStartOpen(false);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>发起验证</DialogTitle>
            <DialogDescription>选择自定义模型与验证项，配置超时与并发后进入验证队列。</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onStartSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customModelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>自定义模型</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name} · {model.tenantName}
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
                name="checks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>验证项</FormLabel>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {VALIDATION_ITEMS.map((item) => (
                        <label
                          key={item.key}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-2xs"
                        >
                          <Checkbox
                            checked={field.value.includes(item.key)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, item.key]
                                  : field.value.filter((value) => value !== item.key),
                              )
                            }
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                    <FormDescription>默认全选，可按需裁剪验证范围。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="timeoutMs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>单请求超时（ms）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1000} max={300000} step={1000} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="concurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>并发数</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={128} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setStartOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <Play />
                  发起验证
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailRun !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRun(null);
        }}
        title={detailRun ? `验证结果 · ${detailRun.modelName}` : "验证结果"}
        description={detailRun ? `${detailRun.tenantName} · ${detailRun.runner}` : undefined}
        footer={
          detailRun ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailRun.status} />
              <Button variant="outline" size="sm" onClick={() => rerunRun(detailRun)}>
                <RefreshCw />
                重跑全部
              </Button>
            </div>
          ) : null
        }
      >
        {detailRun ? (
          <>
            <Alert
              variant={
                detailRun.status === "failed"
                  ? "destructive"
                  : detailRun.status === "queued"
                    ? "warning"
                    : "success"
              }
            >
              {detailRun.status === "failed" ? (
                <XCircle />
              ) : detailRun.status === "queued" ? (
                <Clock />
              ) : (
                <CheckCircle2 />
              )}
              <AlertTitle>
                总体状态：
                {detailRun.status === "failed"
                  ? "验证失败"
                  : detailRun.status === "queued"
                    ? "排队中"
                    : detailRun.status === "running"
                      ? "执行中"
                      : "全部通过"}
              </AlertTitle>
              <AlertDescription>
                {detailRun.failureReason ??
                  `共执行 ${detailRun.checks.length} 项验证，总耗时 ${formatNumber(detailRun.durationMs)} ms。`}
              </AlertDescription>
            </Alert>

            <DetailSection title="任务信息">
              <DetailGrid>
                <DetailRow label="任务 ID" mono>
                  {detailRun.id}
                </DetailRow>
                <DetailRow label="租户">{detailRun.tenantName}</DetailRow>
                <DetailRow label="执行人">{detailRun.runner}</DetailRow>
                <DetailRow label="开始时间">
                  <span className="num">{formatDate(detailRun.startedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="耗时">
                  <span className="num">{formatNumber(detailRun.durationMs)} ms</span>
                </DetailRow>
                <DetailRow label="验证项">{detailRun.checks.length} 项</DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="验证项明细" description="失败项已高亮显示">
              <div className="overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>项目</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>详情</TableHead>
                      <TableHead className="text-right">耗时</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRun.checks.map((check) => (
                      <TableRow
                        key={check.key}
                        className={
                          check.status === "failed"
                            ? "bg-red-50/60 dark:bg-red-950/20"
                            : undefined
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CheckStatusIcon status={check.status} />
                            <span className="text-xs font-medium">{check.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={check.status} dot={false} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-2xs">{check.detail}</TableCell>
                        <TableCell className="num text-right text-2xs">{check.durationMs} ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DetailSection>

            {detailRun.checks.some((check) => check.status === "failed") ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(`已重新排队「${detailRun.modelName}」的失败项`)}
              >
                <ListChecks />
                重跑失败项
              </Button>
            ) : null}
          </>
        ) : null}
      </DetailSheet>
    </PageContainer>
  );
}
