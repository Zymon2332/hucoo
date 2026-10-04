"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Check,
  Download,
  FileCheck,
  History,
  ShieldAlert,
  ShieldCheck,
  Upload,
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
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { complianceItems } from "@/lib/mock-data/security";
import { cn, formatDate, formatPercent, truncate } from "@/lib/utils";
import { label } from "@/lib/labels";
import type { ComplianceItem } from "@/types";

const REFERENCE_NOW = Date.parse("2026-09-17T09:30:00+08:00");
const DUE_WARNING_WINDOW = 30 * 86_400_000;

const FRAMEWORK_OPTIONS = [
  { value: "SOC2", label: "SOC 2" },
  { value: "GDPR", label: "GDPR" },
  { value: "ISO27001", label: "ISO 27001" },
  { value: "等保2.0", label: "等保 2.0" },
  { value: "PCI-DSS", label: "PCI DSS" },
];

const STATUS_OPTIONS = [
  { value: "compliant", label: "合规" },
  { value: "partial", label: "部分合规" },
  { value: "non-compliant", label: "不合规" },
  { value: "not-applicable", label: "不适用" },
];

const RANGE_OPTIONS = [
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "180d", label: "近 180 天" },
  { value: "all", label: "全部时间" },
];

const FRAMEWORK_VARIANT: Record<ComplianceItem["framework"], "info" | "warning" | "success" | "neutral"> = {
  SOC2: "info",
  GDPR: "warning",
  ISO27001: "success",
  "等保2.0": "info",
  "PCI-DSS": "neutral",
};

const evidenceSchema = z.object({
  evidenceUrl: z.string().url("请输入合法的证据链接"),
  note: z.string().min(10, "请填写至少 10 个字的说明").max(300, "说明过长"),
});

type EvidenceFormValues = z.infer<typeof evidenceSchema>;

const exportSchema = z.object({
  frameworks: z.array(z.string()).min(1, "至少选择一个合规框架"),
  range: z.enum(["30d", "90d", "180d", "all"], { message: "请选择时间范围" }),
});

type ExportFormValues = z.infer<typeof exportSchema>;

export default function CompliancePage() {
  const [itemList, setItemList] = React.useState<ComplianceItem[]>(complianceItems);
  const [frameworkFilter, setFrameworkFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [detailItem, setDetailItem] = React.useState<ComplianceItem | null>(null);
  const [evidenceItem, setEvidenceItem] = React.useState<ComplianceItem | null>(null);
  const [statusItem, setStatusItem] = React.useState<ComplianceItem | null>(null);
  const [nextStatus, setNextStatus] = React.useState<ComplianceItem["status"]>("compliant");
  const [exportOpen, setExportOpen] = React.useState(false);

  const stats = React.useMemo(() => {
    const total = itemList.length;
    const compliant = itemList.filter((item) => item.status === "compliant").length;
    const partial = itemList.filter((item) => item.status === "partial").length;
    const nonCompliant = itemList.filter((item) => item.status === "non-compliant").length;
    const notApplicable = itemList.filter((item) => item.status === "not-applicable").length;
    const applicable = total - notApplicable;
    const score = applicable > 0 ? Math.round((compliant / applicable) * 100) : 0;
    return { total, compliant, partial, nonCompliant, notApplicable, score };
  }, [itemList]);

  const ownerOptions = React.useMemo(
    () => Array.from(new Set(itemList.map((item) => item.owner))).map((value) => ({ value, label: value })),
    [itemList],
  );

  const filteredItems = React.useMemo(
    () =>
      itemList.filter(
        (item) =>
          (frameworkFilter === "all" || item.framework === frameworkFilter) &&
          (statusFilter === "all" || item.status === statusFilter) &&
          (ownerFilter === "all" || item.owner === ownerFilter),
      ),
    [itemList, frameworkFilter, statusFilter, ownerFilter],
  );

  const activeFilterCount = [frameworkFilter, statusFilter, ownerFilter].filter(
    (value) => value !== "all",
  ).length;

  const evidenceForm = useForm<EvidenceFormValues>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: { evidenceUrl: "", note: "" },
  });

  React.useEffect(() => {
    if (evidenceItem) {
      evidenceForm.reset({ evidenceUrl: "", note: "" });
    }
  }, [evidenceItem, evidenceForm]);

  const exportForm = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: { frameworks: ["SOC2"], range: "90d" },
  });

  const onSubmitEvidence = (values: EvidenceFormValues) => {
    if (!evidenceItem) return;
    setItemList((list) =>
      list.map((item) =>
        item.id === evidenceItem.id
          ? {
              ...item,
              evidence: `${values.evidenceUrl} · ${values.note}`,
              lastCheckedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    toast.success(`已提交「${evidenceItem.control}」的证据`);
    setEvidenceItem(null);
  };

  const onExport = (values: ExportFormValues) => {
    const frameworks = values.frameworks.map((code) => label(code)).join("、");
    toast.success(`已生成证据包（${frameworks}，${values.range === "all" ? "全部时间" : values.range}）`);
    setExportOpen(false);
    exportForm.reset();
  };

  const onSaveStatus = () => {
    if (!statusItem) return;
    const statusLabel = STATUS_OPTIONS.find((option) => option.value === nextStatus)?.label ?? nextStatus;
    setItemList((list) =>
      list.map((item) =>
        item.id === statusItem.id
          ? { ...item, status: nextStatus, lastCheckedAt: new Date().toISOString() }
          : item,
      ),
    );
    toast.success(`已将「${statusItem.control}」更新为${statusLabel}`);
    setStatusItem(null);
  };

  const columns = React.useMemo<ColumnDef<ComplianceItem, unknown>[]>(
    () => [
      {
        id: "framework",
        accessorKey: "framework",
        header: "框架",
        cell: ({ row }) => (
          <Badge variant={FRAMEWORK_VARIANT[row.original.framework]}>{label(row.original.framework)}</Badge>
        ),
      },
      {
        id: "control",
        accessorKey: "control",
        header: "控制项",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.control}</span>,
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
        cell: ({ row }) => <span className="text-xs">{row.original.owner}</span>,
      },
      {
        id: "evidence",
        accessorKey: "evidence",
        header: "证据说明",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">{truncate(row.original.evidence, 36)}</span>
        ),
      },
      {
        id: "dueAt",
        accessorKey: "dueAt",
        header: "截止时间",
        cell: ({ row }) => {
          const remaining = Date.parse(row.original.dueAt) - REFERENCE_NOW;
          const urgent = remaining <= DUE_WARNING_WINDOW && row.original.status !== "not-applicable";
          return (
            <span className={cn("num text-2xs", urgent && "text-red-600 dark:text-red-400 font-medium")}>
              {formatDate(row.original.dueAt)}
              {urgent ? " ⚠" : ""}
            </span>
          );
        },
      },
      {
        id: "lastCheckedAt",
        accessorKey: "lastCheckedAt",
        header: "最后检查",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.lastCheckedAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            viewLabel="查看控制项"
            onView={() => setDetailItem(row.original)}
            extraItems={[
              { label: "更新状态", onSelect: () => { setStatusItem(row.original); setNextStatus(row.original.status); } },
              { label: "提交证据", onSelect: () => setEvidenceItem(row.original) },
            ]}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="合规中心"
        description="跟踪 SOC 2、GDPR、ISO 27001、等保 2.0 与 PCI DSS 的控制项状态与证据，支持导出证据包。数据为本地演示数据。"
        badges={<Badge variant="success">得分 {stats.score}</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filteredItems.length} 条控制项清单（演示）`)}
            >
              <Download />
              导出清单
            </Button>
            <Button size="sm" onClick={() => setExportOpen(true)}>
              <FileCheck />
              导出证据包
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="控制项总数" value={stats.total} icon={FileCheck} />
        <StatCard label="合规" value={stats.compliant} icon={ShieldCheck} tone="success" />
        <StatCard label="部分合规" value={stats.partial} icon={ShieldAlert} tone="warning" />
        <StatCard label="不合规" value={stats.nonCompliant} tone="danger" />
        <StatCard label="不适用" value={stats.notApplicable} />
        <StatCard
          label="合规得分"
          value={stats.score}
          unit="分"
          icon={Check}
          tone="success"
          hint="不含不适用控制项"
        />
      </StatCardGrid>

      <Alert variant="info">
        <Download />
        <AlertTitle>证据包导出为本地演示</AlertTitle>
        <AlertDescription>
          当前为本地演示环境，导出操作仅进行状态提示，不会真正生成压缩包或访问外部对象存储。
        </AlertDescription>
      </Alert>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setFrameworkFilter("all");
          setStatusFilter("all");
          setOwnerFilter("all");
        }}
      >
        <FilterSelect
          label="框架"
          value={frameworkFilter}
          onChange={setFrameworkFilter}
          options={FRAMEWORK_OPTIONS}
        />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="负责人" value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredItems}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索控制项、证据说明…"
        onRowClick={(row) => setDetailItem(row)}
        emptyTitle="没有符合条件的控制项"
      />

      <Dialog
        open={evidenceItem !== null}
        onOpenChange={(open) => {
          if (!open) setEvidenceItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>提交合规证据</DialogTitle>
            <DialogDescription>
              {evidenceItem ? `${label(evidenceItem.framework)} · ${evidenceItem.control}` : ""}
            </DialogDescription>
          </DialogHeader>
          {evidenceItem ? (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-muted-foreground text-2xs">控制项</p>
                <p className="mt-0.5 text-xs font-medium">{evidenceItem.control}</p>
                <p className="text-muted-foreground mt-2 text-2xs">当前证据</p>
                <p className="mt-0.5 text-2xs">{evidenceItem.evidence}</p>
              </div>
              <Form {...evidenceForm}>
                <form onSubmit={evidenceForm.handleSubmit(onSubmitEvidence)} className="space-y-4">
                  <FormField
                    control={evidenceForm.control}
                    name="evidenceUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>证据链接</FormLabel>
                        <FormControl>
                          <Input placeholder="https://docs.example.com/evidence/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={evidenceForm.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>证据说明</FormLabel>
                        <FormControl>
                          <Textarea placeholder="描述证据内容、覆盖范围与复核结论…" rows={4} {...field} />
                        </FormControl>
                        <FormDescription>提交后证据链接与说明将记录到该控制项的检查时间。</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEvidenceItem(null)}>
                      取消
                    </Button>
                    <Button type="submit" size="sm">
                      <Upload />
                      提交证据
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusItem !== null}
        onOpenChange={(open) => {
          if (!open) setStatusItem(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>更新控制项状态</DialogTitle>
            <DialogDescription>{statusItem ? statusItem.control : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">状态</p>
              <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as ComplianceItem["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setStatusItem(null)}>
                取消
              </Button>
              <Button type="button" size="sm" onClick={onSaveStatus}>
                保存状态
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={exportOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExportOpen(false);
            exportForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>导出合规证据包</DialogTitle>
            <DialogDescription>选择合规框架与时间范围，导出控制项状态与证据索引。</DialogDescription>
          </DialogHeader>
          <Form {...exportForm}>
            <form onSubmit={exportForm.handleSubmit(onExport)} className="space-y-4">
              <FormField
                control={exportForm.control}
                name="frameworks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>合规框架</FormLabel>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FRAMEWORK_OPTIONS.map((option) => {
                        const checked = field.value.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                field.onChange(
                                  value === true
                                    ? [...field.value, option.value]
                                    : field.value.filter((item) => item !== option.value),
                                )
                              }
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exportForm.control}
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
              <Alert variant="info">
                <Download />
                <AlertTitle>本地演示导出</AlertTitle>
                <AlertDescription>
                  导出服务为占位实现，仅返回成功提示；生产环境会生成带签名的加密证据包。
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setExportOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <FileCheck />
                  导出证据包
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailItem !== null}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        title={detailItem?.control ?? "控制项详情"}
        description={detailItem ? label(detailItem.framework) : undefined}
        footer={
          detailItem ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailItem.status} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusItem(detailItem);
                    setNextStatus(detailItem.status);
                  }}
                >
                  更新状态
                </Button>
                <Button size="sm" onClick={() => setEvidenceItem(detailItem)}>
                  提交证据
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailItem ? (
          <>
            <DetailSection title="控制项说明">
              <DetailGrid>
                <DetailRow label="框架">
                  <Badge variant={FRAMEWORK_VARIANT[detailItem.framework]}>
                    {label(detailItem.framework)}
                  </Badge>
                </DetailRow>
                <DetailRow label="状态">
                  <StatusBadge status={detailItem.status} />
                </DetailRow>
                <DetailRow label="负责人">{detailItem.owner}</DetailRow>
                <DetailRow label="得分贡献">
                  {detailItem.status === "compliant"
                    ? formatPercent(100, 0)
                    : detailItem.status === "partial"
                      ? formatPercent(50, 0)
                      : formatPercent(0, 0)}
                </DetailRow>
                <DetailRow label="截止时间">
                  <span className="num">{formatDate(detailItem.dueAt)}</span>
                </DetailRow>
                <DetailRow label="最后检查">
                  <span className="num">{formatDate(detailItem.lastCheckedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="证据">
              <p className="text-xs leading-relaxed">{detailItem.evidence}</p>
            </DetailSection>

            <DetailSection title="状态变更历史" description="由本地数据派生的演示记录">
              <div className="space-y-2">
                {[
                  {
                    at: detailItem.lastCheckedAt,
                    title: "完成季度复核",
                    by: detailItem.owner,
                  },
                  {
                    at: new Date(Date.parse(detailItem.lastCheckedAt) - 30 * 86_400_000).toISOString(),
                    title: "提交证据附件",
                    by: detailItem.owner,
                  },
                  {
                    at: new Date(Date.parse(detailItem.lastCheckedAt) - 60 * 86_400_000).toISOString(),
                    title: `状态更新为${label(detailItem.status)}`,
                    by: "合规平台",
                  },
                ].map((entry) => (
                  <div key={entry.title} className="flex items-start gap-2 rounded-md border border-border p-2.5">
                    <History className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{entry.title}</p>
                      <p className="text-muted-foreground text-2xs">
                        {entry.by} · {formatDate(entry.at, "yyyy-MM-dd HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <div className="text-muted-foreground flex items-center gap-1.5 text-2xs">
        <ShieldCheck className="size-3.5" />
        <span>合规控制项与证据均为本地演示数据，用于展示工作流，不构成合规结论。</span>
      </div>
    </PageContainer>
  );
}
