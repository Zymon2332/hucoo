"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Activity,
  Ban,
  Download,
  FileText,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge, RiskBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { auditActionOptions, auditLogs } from "@/lib/mock-data/audit";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

const RESULT_OPTIONS = [
  { value: "success", label: "成功" },
  { value: "failure", label: "失败" },
  { value: "denied", label: "已拒绝" },
];

const RISK_OPTIONS = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
  { value: "critical", label: "严重风险" },
];

const ACTOR_TYPE_OPTIONS = [
  { value: "user", label: "用户" },
  { value: "service-account", label: "服务账号" },
  { value: "system", label: "系统" },
  { value: "api-key", label: "API Key" },
];

const RANGE_OPTIONS = [
  { value: "1d", label: "近 24 小时" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
];

const ACTOR_TYPE_LABEL: Record<AuditLog["actorType"], string> = {
  user: "用户",
  "service-account": "服务账号",
  system: "系统",
  "api-key": "API Key",
};

const exportSchema = z.object({
  range: z.enum(["1d", "7d", "30d", "90d"], { message: "请选择时间范围" }),
  format: z.enum(["csv", "jsonl"], { message: "请选择导出格式" }),
  includeSensitive: z.boolean(),
});

type ExportFormValues = z.infer<typeof exportSchema>;

export default function AuditPage() {
  const [actionFilter, setActionFilter] = React.useState("all");
  const [resultFilter, setResultFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [actorTypeFilter, setActorTypeFilter] = React.useState("all");
  const [rangeFilter, setRangeFilter] = React.useState("30d");
  const [logList, setLogList] = React.useState<AuditLog[]>(auditLogs);
  const [detailLog, setDetailLog] = React.useState<AuditLog | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [clearOpen, setClearOpen] = React.useState(false);
  const [clearPending, setClearPending] = React.useState(false);

  const latestAt = React.useMemo(
    () => logList.reduce((max, log) => (log.at > max ? log.at : max), ""),
    [logList],
  );

  const stats = React.useMemo(() => {
    const latest = latestAt ? Date.parse(latestAt) : 0;
    const today = logList.filter((log) => latest - Date.parse(log.at) <= 86_400_000).length;
    const failure = logList.filter((log) => log.result === "failure").length;
    const denied = logList.filter((log) => log.result === "denied").length;
    const highRisk = logList.filter((log) => log.riskLevel === "high" || log.riskLevel === "critical").length;
    const actors = new Set(logList.map((log) => log.actorName)).size;
    return { total: logList.length, today, failure, denied, highRisk, actors };
  }, [logList, latestAt]);

  const tenantOptions = React.useMemo(
    () => Array.from(new Set(logList.map((log) => log.tenantName))).map((value) => ({ value, label: value })),
    [logList],
  );

  const filteredLogs = React.useMemo(() => {
    const latest = latestAt ? Date.parse(latestAt) : 0;
    const rangeMs =
      rangeFilter === "1d"
        ? 86_400_000
        : rangeFilter === "7d"
          ? 7 * 86_400_000
          : rangeFilter === "90d"
            ? 90 * 86_400_000
            : 30 * 86_400_000;
    return logList.filter(
      (log) =>
        (actionFilter === "all" || log.action === actionFilter) &&
        (resultFilter === "all" || log.result === resultFilter) &&
        (riskFilter === "all" || log.riskLevel === riskFilter) &&
        (tenantFilter === "all" || log.tenantName === tenantFilter) &&
        (actorTypeFilter === "all" || log.actorType === actorTypeFilter) &&
        latest - Date.parse(log.at) <= rangeMs,
    );
  }, [logList, actionFilter, resultFilter, riskFilter, tenantFilter, actorTypeFilter, rangeFilter, latestAt]);

  const activeFilterCount = [actionFilter, resultFilter, riskFilter, tenantFilter, actorTypeFilter, rangeFilter].filter(
    (value, index) => (index === 5 ? value !== "30d" : value !== "all"),
  ).length;

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: { range: "30d", format: "csv", includeSensitive: false },
  });

  const onExport = (values: ExportFormValues) => {
    toast.success(
      `已导出 ${filteredLogs.length} 条日志（${values.format === "csv" ? "CSV" : "JSONL"}${
        values.includeSensitive ? " · 含敏感字段" : " · 已脱敏"
      }）`,
    );
    setExportOpen(false);
    form.reset();
  };

  const confirmClear = () => {
    const latest = latestAt ? Date.parse(latestAt) : Date.now();
    setClearPending(true);
    window.setTimeout(() => {
      setLogList((list) => list.filter((log) => latest - Date.parse(log.at) <= 90 * 86_400_000));
      toast.success("已归档并清理 90 天前的审计日志（演示）");
      setClearPending(false);
      setClearOpen(false);
    }, 500);
  };

  const columns = React.useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        id: "at",
        accessorKey: "at",
        header: "时间",
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>{formatRelativeTime(row.original.at)}</p>
            <p className="text-muted-foreground">{formatDate(row.original.at, "MM-dd HH:mm")}</p>
          </div>
        ),
      },
      {
        id: "actorName",
        accessorKey: "actorName",
        header: "操作人",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.actorName}</p>
            <p className="text-muted-foreground truncate text-2xs">{row.original.actorEmail}</p>
          </div>
        ),
      },
      {
        id: "actorType",
        accessorKey: "actorType",
        header: "类型",
        cell: ({ row }) => <Badge variant="outline">{ACTOR_TYPE_LABEL[row.original.actorType]}</Badge>,
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs">{row.original.tenantName}</span>,
      },
      {
        id: "actionLabel",
        accessorKey: "actionLabel",
        header: "操作",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.actionLabel}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.action}</p>
          </div>
        ),
      },
      {
        id: "resource",
        header: "资源",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-2xs">{row.original.resourceType}</p>
            <p className="text-muted-foreground truncate font-mono text-2xs">{row.original.resourceName}</p>
          </div>
        ),
      },
      {
        id: "result",
        accessorKey: "result",
        header: "结果",
        cell: ({ row }) => <StatusBadge status={row.original.result} />,
      },
      {
        id: "ip",
        accessorKey: "ip",
        header: "来源",
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>{row.original.ip}</p>
            <p className="text-muted-foreground">{row.original.location}</p>
          </div>
        ),
      },
      {
        id: "riskLevel",
        accessorKey: "riskLevel",
        header: "风险",
        cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => <RowActions viewLabel="查看详情" onView={() => setDetailLog(row.original)} />,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="审计日志"
        description="记录平台与租户的关键操作，支持按操作人、风险与时间检索，并导出用于合规检查。数据为本地演示数据。"
        badges={<Badge variant="info">留存 180 天</Badge>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
              <Trash2 />
              归档并清理
            </Button>
            <Button size="sm" onClick={() => setExportOpen(true)}>
              <Download />
              导出日志
            </Button>
          </>
        }
      />

      <Alert variant="warning">
        <ShieldAlert />
        <AlertTitle>审计日志长期留存与签名校验</AlertTitle>
        <AlertDescription>
          企业版租户审计日志默认留存 180 天，并以 Ed25519 签名防篡改；导出敏感字段需经过审批并记录审计。
        </AlertDescription>
      </Alert>

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="日志总数" value={stats.total} icon={FileText} />
        <StatCard label="今日新增" value={stats.today} icon={Activity} tone="info" />
        <StatCard label="失败操作" value={stats.failure} icon={TriangleAlert} tone="warning" />
        <StatCard label="被拒绝访问" value={stats.denied} icon={Ban} tone="danger" />
        <StatCard label="高风险操作" value={stats.highRisk} icon={ShieldAlert} tone="danger" />
        <StatCard label="活跃操作人" value={stats.actors} icon={Users} tone="success" />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setActionFilter("all");
          setResultFilter("all");
          setRiskFilter("all");
          setTenantFilter("all");
          setActorTypeFilter("all");
          setRangeFilter("30d");
        }}
      >
        <FilterSelect label="操作类型" value={actionFilter} onChange={setActionFilter} options={auditActionOptions} />
        <FilterSelect label="结果" value={resultFilter} onChange={setResultFilter} options={RESULT_OPTIONS} />
        <FilterSelect label="风险等级" value={riskFilter} onChange={setRiskFilter} options={RISK_OPTIONS} />
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
        <FilterSelect
          label="操作人类型"
          value={actorTypeFilter}
          onChange={setActorTypeFilter}
          options={ACTOR_TYPE_OPTIONS}
        />
        <FilterSelect label="时间范围" value={rangeFilter} onChange={setRangeFilter} options={RANGE_OPTIONS} allLabel="近 30 天" />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredLogs}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索操作人、操作、资源、IP…"
        pageSize={12}
        enableRowSelection
        onRowClick={(row) => setDetailLog(row)}
        bulkActions={(rows, clear) => (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              toast.success(`已导出 ${rows.length} 条审计日志（演示）`);
              clear();
            }}
          >
            <Download />
            批量导出
          </Button>
        )}
        emptyTitle="没有符合条件的审计日志"
      />

      <Dialog
        open={exportOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExportOpen(false);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出审计日志</DialogTitle>
            <DialogDescription>选择时间范围与格式导出日志，敏感字段可选择性包含。</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onExport)} className="space-y-4">
              <FormField
                control={form.control}
                name="range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>时间范围</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RANGE_OPTIONS.map((option) => (
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
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>导出格式</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="jsonl">JSONL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="includeSensitive"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-2xs leading-relaxed">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
                      />
                      <span>包含 IP、User-Agent 等敏感字段（将记录一次导出审计）。</span>
                    </label>
                    <FormDescription>默认导出会脱敏处理来源 IP 与邮箱。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setExportOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <Download />
                  确认导出
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailLog !== null}
        onOpenChange={(open) => {
          if (!open) setDetailLog(null);
        }}
        title={detailLog?.actionLabel ?? "审计详情"}
        description={detailLog ? `${detailLog.actorName} · ${formatDate(detailLog.at, "yyyy-MM-dd HH:mm:ss")}` : undefined}
        footer={detailLog ? <RiskBadge risk={detailLog.riskLevel} /> : null}
      >
        {detailLog ? (
          <>
            <Alert
              variant={
                detailLog.riskLevel === "critical" || detailLog.riskLevel === "high" ? "destructive" : "info"
              }
            >
              <ShieldAlert />
              <AlertTitle>{detailLog.riskLevel === "low" ? "常规操作" : "需要关注的操作"}</AlertTitle>
              <AlertDescription>{detailLog.detail}</AlertDescription>
            </Alert>

            <DetailSection title="操作信息">
              <DetailGrid>
                <DetailRow label="操作" mono>
                  {detailLog.action}
                </DetailRow>
                <DetailRow label="操作名称">{detailLog.actionLabel}</DetailRow>
                <DetailRow label="资源类型">{detailLog.resourceType}</DetailRow>
                <DetailRow label="资源名称" mono>
                  {detailLog.resourceName}
                </DetailRow>
                <DetailRow label="结果">
                  <StatusBadge status={detailLog.result} />
                </DetailRow>
                <DetailRow label="风险">
                  <RiskBadge risk={detailLog.riskLevel} />
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="主体与来源">
              <DetailGrid>
                <DetailRow label="操作人">{detailLog.actorName}</DetailRow>
                <DetailRow label="邮箱">{detailLog.actorEmail}</DetailRow>
                <DetailRow label="主体类型">{ACTOR_TYPE_LABEL[detailLog.actorType]}</DetailRow>
                <DetailRow label="租户">{detailLog.tenantName}</DetailRow>
                <DetailRow label="IP">
                  <span className="num">{detailLog.ip}</span>
                </DetailRow>
                <DetailRow label="地点">{detailLog.location}</DetailRow>
                <DetailRow label="User-Agent">{detailLog.userAgent}</DetailRow>
                <DetailRow label="时间">
                  <span className="num">{formatDate(detailLog.at, "yyyy-MM-dd HH:mm:ss")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="操作详情">
              <p className="text-xs leading-relaxed">{detailLog.detail}</p>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="归档并清理 90 天前的审计日志？"
        description="清理前系统会自动归档到对象存储；归档数据可在合规取证时按需恢复，清理操作本身也会被记录。"
        confirmLabel="确认清理"
        loading={clearPending}
        onConfirm={confirmClear}
      />

      <div className="text-muted-foreground flex items-center gap-1.5 text-2xs">
        <FileText className="size-3.5" />
        <span>导出为演示行为，不会真正生成文件，也不会产生数据外发。</span>
      </div>
    </PageContainer>
  );
}
