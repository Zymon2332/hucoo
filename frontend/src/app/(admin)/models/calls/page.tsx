"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Activity,
  Archive,
  Ban,
  Clock,
  Coins,
  Copy,
  Download,
  Gauge,
  Layers,
  Link2,
  Radio,
  ShieldAlert,
  TriangleAlert,
  Wrench,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DetailGrid,
  DetailRow,
  DetailSection,
  DetailSheet,
} from "@/components/common/detail-sheet";
import { ChartCard } from "@/components/common/chart-card";
import { AreaTrendChart, BarDistributionChart, DonutChart, SparkLine } from "@/components/charts";
import { createLiveModelCall, modelCallRecords } from "@/lib/mock-data/model-calls";
import { getStatusMeta } from "@/lib/status";
import { label } from "@/lib/labels";
import {
  clamp,
  cn,
  formatCompact,
  formatCompactCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  sum,
} from "@/lib/utils";
import type { ModelCallRecord, ModelCallSource, ModelCallStatus, ModelProvider } from "@/types";

const SOURCE_LABEL: Record<ModelCallSource, string> = {
  agent: "Agent 调用",
  playground: "调试台",
  api: "OpenAPI",
  workflow: "工作流",
  batch: "批量任务",
};

const SOURCE_OPTIONS = (Object.keys(SOURCE_LABEL) as ModelCallSource[]).map((value) => ({
  value,
  label: SOURCE_LABEL[value],
}));

const STATUS_OPTIONS: { value: ModelCallStatus; label: string }[] = [
  { value: "success", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "timeout", label: "超时" },
  { value: "rate-limited", label: "已限流" },
  { value: "blocked", label: "已阻断" },
];

const PROVIDER_TYPE_LABEL: Record<ModelProvider["type"], string> = {
  platform: "平台直连",
  "open-source": "开源模型池",
  local: "私有集群",
  gateway: "企业网关",
};

const FEEDBACK_LABEL: Record<string, string> = {
  up: "有帮助",
  down: "待改进",
};

const RANGE_OPTIONS = [
  { value: "1", label: "近 24 小时" },
  { value: "7", label: "近 7 天" },
  { value: "30", label: "近 30 天" },
];

const RANGE_MS: Record<string, number> = {
  "1": 86_400_000,
  "7": 7 * 86_400_000,
  "30": 30 * 86_400_000,
};

const exportSchema = z.object({
  range: z.enum(["1", "7", "30"], { message: "请选择导出范围" }),
  format: z.enum(["csv", "jsonl", "parquet"], { message: "请选择导出格式" }),
  onlyFailures: z.boolean(),
  includeContent: z.boolean(),
});

type ExportFormValues = z.infer<typeof exportSchema>;

interface CallSummary {
  calls: number;
  success: number;
  failure: number;
  successRate: number;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
  cost: number;
  avgLatencyMs: number;
}

function summarize(records: ModelCallRecord[]): CallSummary {
  const calls = records.length;
  const success = records.filter((record) => record.status === "success").length;
  const inputTokens = sum(records.map((record) => record.inputTokens));
  const outputTokens = sum(records.map((record) => record.outputTokens));
  const cost = sum(records.map((record) => record.cost));
  const latency = sum(records.map((record) => record.latencyMs));
  return {
    calls,
    success,
    failure: calls - success,
    successRate: calls > 0 ? (success / calls) * 100 : 0,
    inputTokens,
    outputTokens,
    tokens: inputTokens + outputTokens,
    cost: Number(cost.toFixed(4)),
    avgLatencyMs: calls > 0 ? Math.round(latency / calls) : 0,
  };
}

function growth(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function successRateTone(rate: number) {
  if (rate >= 99) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 95) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

interface UserCallRow {
  id: string;
  userName: string;
  userEmail: string;
  tenantName: string;
  orgName: string;
  calls: number;
  failureCalls: number;
  successRate: number;
  tokens: number;
  cost: number;
  avgLatencyMs: number;
  topModel: string;
  topModels: { name: string; calls: number }[];
  lastCalledAt: string;
  trend: { date: string; calls: number }[];
}

interface ModelCallRow {
  id: string;
  modelName: string;
  modelDisplayName: string;
  providerName: string;
  providerType: ModelProvider["type"];
  calls: number;
  failureCalls: number;
  successRate: number;
  avgLatencyMs: number;
  tokens: number;
  cost: number;
  fallbackCalls: number;
  share: number;
}

interface ErrorCallRow {
  code: string;
  message: string;
  count: number;
  share: number;
  userCount: number;
  lastAt: string;
}

export default function ModelCallsPage() {
  const [recordList, setRecordList] = React.useState<ModelCallRecord[]>(modelCallRecords);
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [userFilter, setUserFilter] = React.useState("all");
  const [modelFilter, setModelFilter] = React.useState("all");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [rangeFilter, setRangeFilter] = React.useState("7");
  const [live, setLive] = React.useState(false);
  const [detailRecord, setDetailRecord] = React.useState<ModelCallRecord | null>(null);
  const [detailUser, setDetailUser] = React.useState<UserCallRow | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [archivePending, setArchivePending] = React.useState(false);
  const liveSeed = React.useRef(0);

  React.useEffect(() => {
    if (!live) return;
    toast.success("已开启实时订阅：每 6 秒追加一条最新调用（演示）");
    const timer = window.setInterval(() => {
      liveSeed.current += 1;
      setRecordList((list) => [createLiveModelCall(liveSeed.current), ...list].slice(0, 400));
    }, 6_000);
    return () => window.clearInterval(timer);
  }, [live]);

  const latestAt = React.useMemo(() => {
    let max = "";
    let maxTime = Number.NEGATIVE_INFINITY;
    recordList.forEach((record) => {
      const time = Date.parse(record.at);
      if (time > maxTime) {
        maxTime = time;
        max = record.at;
      }
    });
    return max;
  }, [recordList]);

  const rangeMs = RANGE_MS[rangeFilter] ?? RANGE_MS["7"] ?? 604_800_000;

  const baseFiltered = React.useMemo(
    () =>
      recordList.filter(
        (record) =>
          (tenantFilter === "all" || record.tenantName === tenantFilter) &&
          (userFilter === "all" || record.userName === userFilter) &&
          (modelFilter === "all" || record.modelName === modelFilter) &&
          (providerFilter === "all" || record.providerName === providerFilter) &&
          (statusFilter === "all" || record.status === statusFilter) &&
          (sourceFilter === "all" || record.source === sourceFilter),
      ),
    [recordList, tenantFilter, userFilter, modelFilter, providerFilter, statusFilter, sourceFilter],
  );

  const filteredRecords = React.useMemo(() => {
    const latest = latestAt ? Date.parse(latestAt) : 0;
    return baseFiltered.filter((record) => latest - Date.parse(record.at) <= rangeMs);
  }, [baseFiltered, latestAt, rangeMs]);

  const previousRecords = React.useMemo(() => {
    const latest = latestAt ? Date.parse(latestAt) : 0;
    return baseFiltered.filter((record) => {
      const diff = latest - Date.parse(record.at);
      return diff > rangeMs && diff <= rangeMs * 2;
    });
  }, [baseFiltered, latestAt, rangeMs]);

  const stats = React.useMemo(() => summarize(filteredRecords), [filteredRecords]);
  const previousStats = React.useMemo(() => summarize(previousRecords), [previousRecords]);

  const tenantOptions = React.useMemo(
    () =>
      Array.from(new Set(recordList.map((record) => record.tenantName))).map((value) => ({
        value,
        label: value,
      })),
    [recordList],
  );
  const userOptions = React.useMemo(
    () =>
      Array.from(new Set(recordList.map((record) => record.userName))).map((value) => ({
        value,
        label: value,
      })),
    [recordList],
  );
  const modelOptions = React.useMemo(
    () =>
      Array.from(new Set(recordList.map((record) => record.modelName))).map((value) => ({
        value,
        label: value,
      })),
    [recordList],
  );
  const providerOptions = React.useMemo(
    () =>
      Array.from(new Set(recordList.map((record) => record.providerName))).map((value) => ({
        value,
        label: value,
      })),
    [recordList],
  );

  const activeFilterCount = [
    tenantFilter,
    userFilter,
    modelFilter,
    providerFilter,
    statusFilter,
    sourceFilter,
    rangeFilter,
  ].filter((value, index) => (index === 6 ? value !== "7" : value !== "all")).length;

  const trendSeries = React.useMemo(() => {
    const latest = latestAt ? Date.parse(latestAt) : Date.now();
    const hourly = rangeMs <= 86_400_000;
    const bucketSize = hourly ? 3_600_000 : 86_400_000;
    const bucketCount = hourly ? 24 : Math.round(rangeMs / bucketSize);
    const points = Array.from({ length: bucketCount }, (_, index) => {
      const bucketTime = latest - (bucketCount - 1 - index) * bucketSize;
      return {
        label: hourly
          ? `${String(new Date(bucketTime).getHours()).padStart(2, "0")}:00`
          : formatDate(new Date(bucketTime), "MM-dd"),
        calls: 0,
        success: 0,
        failed: 0,
        cost: 0,
      };
    });
    filteredRecords.forEach((record) => {
      const diff = latest - Date.parse(record.at);
      const index = clamp(bucketCount - 1 - Math.floor(diff / bucketSize), 0, bucketCount - 1);
      const point = points[index];
      if (!point) return;
      point.calls += 1;
      if (record.status === "success") point.success += 1;
      else point.failed += 1;
      point.cost = Number((point.cost + record.cost).toFixed(4));
    });
    return points;
  }, [filteredRecords, latestAt, rangeMs]);

  const userRows = React.useMemo<UserCallRow[]>(() => {
    const latest = latestAt ? Date.parse(latestAt) : 0;
    const bucketSize = Math.max(1, rangeMs / 12);
    const grouped = new Map<
      string,
      {
        row: Omit<UserCallRow, "trend" | "topModels" | "topModel" | "successRate" | "avgLatencyMs">;
        models: Map<string, number>;
        trend: { date: string; calls: number }[];
        latencySum: number;
      }
    >();

    filteredRecords.forEach((record) => {
      const entry = grouped.get(record.userId) ?? {
        row: {
          id: record.userId,
          userName: record.userName,
          userEmail: record.userEmail,
          tenantName: record.tenantName,
          orgName: record.orgName,
          calls: 0,
          failureCalls: 0,
          tokens: 0,
          cost: 0,
          lastCalledAt: record.at,
        },
        models: new Map<string, number>(),
        trend: Array.from({ length: 12 }, (_, index) => ({ date: `${index + 1}`, calls: 0 })),
        latencySum: 0,
      };

      entry.row.calls += 1;
      if (record.status !== "success") entry.row.failureCalls += 1;
      entry.row.tokens += record.inputTokens + record.outputTokens;
      entry.row.cost += record.cost;
      entry.latencySum += record.latencyMs;
      if (Date.parse(record.at) > Date.parse(entry.row.lastCalledAt))
        entry.row.lastCalledAt = record.at;
      entry.models.set(record.modelName, (entry.models.get(record.modelName) ?? 0) + 1);

      const diff = latest - Date.parse(record.at);
      const bucket = entry.trend[clamp(11 - Math.floor(diff / bucketSize), 0, 11)];
      if (bucket) bucket.calls += 1;

      grouped.set(record.userId, entry);
    });

    return Array.from(grouped.values())
      .map(({ row, models, trend, latencySum }) => {
        const topModels = Array.from(models.entries())
          .map(([name, calls]) => ({ name, calls }))
          .sort((a, b) => b.calls - a.calls)
          .slice(0, 4);
        return {
          ...row,
          successRate: row.calls > 0 ? ((row.calls - row.failureCalls) / row.calls) * 100 : 0,
          avgLatencyMs: row.calls > 0 ? Math.round(latencySum / row.calls) : 0,
          cost: Number(row.cost.toFixed(4)),
          topModel: topModels[0]?.name ?? "—",
          topModels,
          trend,
        } satisfies UserCallRow;
      })
      .sort((a, b) => b.calls - a.calls);
  }, [filteredRecords, latestAt, rangeMs]);

  const modelRows = React.useMemo<ModelCallRow[]>(() => {
    const grouped = new Map<
      string,
      {
        row: Omit<ModelCallRow, "successRate" | "avgLatencyMs" | "share">;
        latencySum: number;
      }
    >();

    filteredRecords.forEach((record) => {
      const entry = grouped.get(record.modelName) ?? {
        row: {
          id: record.modelName,
          modelName: record.modelName,
          modelDisplayName: record.modelDisplayName,
          providerName: record.providerName,
          providerType: record.providerType,
          calls: 0,
          failureCalls: 0,
          tokens: 0,
          cost: 0,
          fallbackCalls: 0,
        },
        latencySum: 0,
      };

      entry.row.calls += 1;
      if (record.status !== "success") entry.row.failureCalls += 1;
      entry.row.tokens += record.inputTokens + record.outputTokens;
      entry.row.cost += record.cost;
      if (record.fallbackUsed) entry.row.fallbackCalls += 1;
      entry.latencySum += record.latencyMs;
      grouped.set(record.modelName, entry);
    });

    const totalCalls = filteredRecords.length;
    return Array.from(grouped.values())
      .map(({ row, latencySum }) => ({
        ...row,
        cost: Number(row.cost.toFixed(4)),
        successRate: row.calls > 0 ? ((row.calls - row.failureCalls) / row.calls) * 100 : 0,
        avgLatencyMs: row.calls > 0 ? Math.round(latencySum / row.calls) : 0,
        share: totalCalls > 0 ? (row.calls / totalCalls) * 100 : 0,
      }))
      .sort((a, b) => b.calls - a.calls);
  }, [filteredRecords]);

  const statusAggregation = React.useMemo(() => {
    const map = new Map<ModelCallStatus, number>();
    filteredRecords.forEach((record) => map.set(record.status, (map.get(record.status) ?? 0) + 1));
    return Array.from(map.entries()).map(([status, value]) => ({
      name: getStatusMeta(status).label,
      value,
    }));
  }, [filteredRecords]);

  const errorRows = React.useMemo<ErrorCallRow[]>(() => {
    const map = new Map<
      string,
      { code: string; message: string; count: number; users: Set<string>; lastAt: string }
    >();
    filteredRecords.forEach((record) => {
      if (!record.errorCode) return;
      const entry = map.get(record.errorCode) ?? {
        code: record.errorCode,
        message: record.errorMessage ?? "—",
        count: 0,
        users: new Set<string>(),
        lastAt: record.at,
      };
      entry.count += 1;
      entry.users.add(record.userName);
      if (Date.parse(record.at) > Date.parse(entry.lastAt)) entry.lastAt = record.at;
      map.set(record.errorCode, entry);
    });
    const total = filteredRecords.length;
    return Array.from(map.values())
      .map((entry) => ({
        code: entry.code,
        message: entry.message,
        count: entry.count,
        share: total > 0 ? (entry.count / total) * 100 : 0,
        userCount: entry.users.size,
        lastAt: entry.lastAt,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const failureUserOptions = React.useMemo(
    () =>
      userRows
        .filter((row) => row.failureCalls > 0)
        .slice(0, 8)
        .map((row) => ({
          name: row.userName,
          tenantName: row.tenantName,
          failureCalls: row.failureCalls,
          failureRate: 100 - row.successRate,
          lastCalledAt: row.lastCalledAt,
        })),
    [userRows],
  );

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues: { range: "7", format: "csv", onlyFailures: false, includeContent: false },
  });

  const copyText = React.useCallback(async (value: string, text: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`已复制${text}`);
    } catch {
      toast.error("当前环境不支持剪贴板，请手动复制");
    }
  }, []);

  const onExport = (values: ExportFormValues) => {
    const scoped = values.onlyFailures
      ? filteredRecords.filter((record) => record.status !== "success")
      : filteredRecords;
    toast.success(
      `已导出 ${scoped.length} 条调用记录（${values.format.toUpperCase()}${
        values.includeContent ? " · 含请求响应摘要" : " · 已脱敏"
      }）`,
    );
    setExportOpen(false);
    form.reset();
  };

  const confirmArchive = () => {
    const latest = latestAt ? Date.parse(latestAt) : Date.now();
    setArchivePending(true);
    window.setTimeout(() => {
      const keep = recordList.filter((record) => latest - Date.parse(record.at) <= 30 * 86_400_000);
      setRecordList(keep);
      toast.success(`已归档 ${recordList.length - keep.length} 条 30 天前的调用记录（演示）`);
      setArchivePending(false);
      setArchiveOpen(false);
    }, 500);
  };

  const recordColumns = React.useMemo<ColumnDef<ModelCallRecord, unknown>[]>(
    () => [
      {
        id: "at",
        accessorKey: "at",
        header: "时间",
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>{formatRelativeTime(row.original.at)}</p>
            <p className="text-muted-foreground">{formatDate(row.original.at, "MM-dd HH:mm:ss")}</p>
          </div>
        ),
      },
      {
        id: "userName",
        accessorKey: "userName",
        header: "用户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.userName}</p>
            <p className="text-muted-foreground text-2xs truncate">{row.original.userEmail}</p>
          </div>
        ),
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.tenantName}</p>
            <p className="text-muted-foreground text-2xs truncate">{row.original.orgName}</p>
          </div>
        ),
      },
      {
        id: "source",
        accessorKey: "source",
        header: "入口",
        cell: ({ row }) => <Badge variant="outline">{SOURCE_LABEL[row.original.source]}</Badge>,
      },
      {
        id: "modelName",
        accessorKey: "modelName",
        header: "模型",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-2xs font-mono">{row.original.modelName}</p>
            <p className="text-muted-foreground text-2xs truncate">{row.original.providerName}</p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <StatusBadge status={row.original.status} />
            <p className="num text-muted-foreground text-2xs">HTTP {row.original.httpStatus}</p>
          </div>
        ),
      },
      {
        id: "latencyMs",
        accessorKey: "latencyMs",
        header: "延迟",
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>{formatNumber(row.original.latencyMs)} ms</p>
            <p className="text-muted-foreground">
              {row.original.firstTokenMs > 0
                ? `首字 ${formatNumber(row.original.firstTokenMs)} ms`
                : "非流式"}
            </p>
          </div>
        ),
      },
      {
        id: "tokens",
        header: "Token（入/出）",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="num text-2xs">
            {formatCompact(row.original.inputTokens)} / {formatCompact(row.original.outputTokens)}
          </span>
        ),
      },
      {
        id: "toolCalls",
        accessorKey: "toolCalls",
        header: "工具调用",
        cell: ({ row }) => <span className="num text-2xs">{row.original.toolCalls}</span>,
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: "成本",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatCompactCurrency(row.original.cost)}</span>
        ),
      },
      {
        id: "actions",
        header: "操作",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <RowActions
            viewLabel="查看调用详情"
            onView={() => setDetailRecord(row.original)}
            extraItems={[
              {
                label: "复制 Request ID",
                onSelect: () => void copyText(row.original.requestId, "Request ID"),
              },
              {
                label: "查看调用链",
                onSelect: () => toast.info(`调用链 ${row.original.traceId}（演示）`),
              },
            ]}
          />
        ),
      },
    ],
    [copyText],
  );

  const userColumns = React.useMemo<ColumnDef<UserCallRow, unknown>[]>(
    () => [
      {
        id: "userName",
        accessorKey: "userName",
        header: "用户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.userName}</p>
            <p className="text-muted-foreground text-2xs truncate">{row.original.userEmail}</p>
          </div>
        ),
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户 / 组织",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.tenantName}</p>
            <p className="text-muted-foreground text-2xs truncate">{row.original.orgName}</p>
          </div>
        ),
      },
      {
        id: "calls",
        accessorKey: "calls",
        header: "调用量",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.calls)}</span>,
      },
      {
        id: "successRate",
        accessorKey: "successRate",
        header: "成功率",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <span
              className={cn("num text-xs font-medium", successRateTone(row.original.successRate))}
            >
              {row.original.successRate.toFixed(1)}%
            </span>
            {row.original.failureCalls > 0 ? (
              <p className="num text-muted-foreground text-2xs">
                失败 {row.original.failureCalls} 次
              </p>
            ) : (
              <p className="text-muted-foreground text-2xs">全部成功</p>
            )}
          </div>
        ),
      },
      {
        id: "tokens",
        accessorKey: "tokens",
        header: "Token",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompact(row.original.tokens)}</span>
        ),
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: "成本",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.cost)}</span>
        ),
      },
      {
        id: "avgLatencyMs",
        accessorKey: "avgLatencyMs",
        header: "平均延迟",
        cell: ({ row }) => (
          <span className="num text-xs">{formatNumber(row.original.avgLatencyMs)} ms</span>
        ),
      },
      {
        id: "topModel",
        accessorKey: "topModel",
        header: "常用模型",
        cell: ({ row }) => <span className="text-2xs font-mono">{row.original.topModel}</span>,
      },
      {
        id: "trend",
        header: "调用趋势",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="w-24">
            <SparkLine data={row.original.trend} dataKey="calls" height={28} />
          </div>
        ),
      },
      {
        id: "lastCalledAt",
        accessorKey: "lastCalledAt",
        header: "最近调用",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatRelativeTime(row.original.lastCalledAt)}</span>
        ),
      },
    ],
    [],
  );

  const modelColumns = React.useMemo<ColumnDef<ModelCallRow, unknown>[]>(
    () => [
      {
        id: "modelName",
        accessorKey: "modelName",
        header: "模型",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-2xs font-mono">{row.original.modelName}</p>
            <p className="text-muted-foreground text-2xs truncate">
              {row.original.modelDisplayName}
            </p>
          </div>
        ),
      },
      {
        id: "providerName",
        accessorKey: "providerName",
        header: "供应商",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="text-xs">{row.original.providerName}</p>
            <Badge variant="secondary">{PROVIDER_TYPE_LABEL[row.original.providerType]}</Badge>
          </div>
        ),
      },
      {
        id: "calls",
        accessorKey: "calls",
        header: "调用量",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.calls)}</span>,
      },
      {
        id: "share",
        accessorKey: "share",
        header: "占比",
        cell: ({ row }) => <span className="num text-xs">{row.original.share.toFixed(1)}%</span>,
      },
      {
        id: "successRate",
        accessorKey: "successRate",
        header: "成功率",
        cell: ({ row }) => (
          <span
            className={cn("num text-xs font-medium", successRateTone(row.original.successRate))}
          >
            {row.original.successRate.toFixed(1)}%
          </span>
        ),
      },
      {
        id: "avgLatencyMs",
        accessorKey: "avgLatencyMs",
        header: "平均延迟",
        cell: ({ row }) => (
          <span className="num text-xs">{formatNumber(row.original.avgLatencyMs)} ms</span>
        ),
      },
      {
        id: "tokens",
        accessorKey: "tokens",
        header: "Token",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompact(row.original.tokens)}</span>
        ),
      },
      {
        id: "cost",
        accessorKey: "cost",
        header: "成本",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.cost)}</span>
        ),
      },
      {
        id: "fallbackCalls",
        accessorKey: "fallbackCalls",
        header: "降级调用",
        cell: ({ row }) => (
          <span
            className={cn(
              "num text-xs",
              row.original.fallbackCalls > 0 && "text-amber-600 dark:text-amber-400",
            )}
          >
            {row.original.fallbackCalls}
          </span>
        ),
      },
    ],
    [],
  );

  const errorColumns = React.useMemo<ColumnDef<ErrorCallRow, unknown>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: "错误码",
        cell: ({ row }) => <span className="text-2xs font-mono">{row.original.code}</span>,
      },
      {
        id: "message",
        accessorKey: "message",
        header: "说明",
        cell: ({ row }) => <span className="text-xs">{row.original.message}</span>,
      },
      {
        id: "count",
        accessorKey: "count",
        header: "次数",
        cell: ({ row }) => <span className="num text-xs">{row.original.count}</span>,
      },
      {
        id: "share",
        accessorKey: "share",
        header: "占调用比例",
        cell: ({ row }) => <span className="num text-xs">{row.original.share.toFixed(2)}%</span>,
      },
      {
        id: "userCount",
        accessorKey: "userCount",
        header: "受影响用户",
        cell: ({ row }) => <span className="num text-xs">{row.original.userCount}</span>,
      },
      {
        id: "lastAt",
        accessorKey: "lastAt",
        header: "最近发生",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatRelativeTime(row.original.lastAt)}</span>
        ),
      },
    ],
    [],
  );

  const modelChartData = React.useMemo(
    () =>
      modelRows.slice(0, 10).map((row) => ({
        name: row.modelName,
        calls: row.calls,
        tokens: row.tokens,
      })),
    [modelRows],
  );

  const userChartData = React.useMemo(
    () =>
      userRows.slice(0, 10).map((row) => ({
        name: row.userName,
        calls: row.calls,
        failure: row.failureCalls,
      })),
    [userRows],
  );

  return (
    <PageContainer>
      <PageHeader
        title="模型调用记录"
        description="按用户、租户与模型追溯每一次平台模型调用：入参规模、Token、延迟、路由降级、失败原因与成本。数据为本地演示数据。"
        badges={
          <>
            <Badge variant="info">明细保留 30 天</Badge>
            {live ? <Badge variant="success">实时订阅中</Badge> : null}
          </>
        }
        actions={
          <>
            <div className="border-border bg-card flex items-center gap-2 rounded-md border px-2.5 py-1.5">
              <Radio
                className={cn(
                  "size-3.5",
                  live ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                )}
              />
              <span className="text-2xs font-medium">实时订阅</span>
              <Switch checked={live} onCheckedChange={setLive} aria-label="实时订阅调用记录" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
              <Archive />
              归档过期记录
            </Button>
            <Button size="sm" onClick={() => setExportOpen(true)}>
              <Download />
              导出记录
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="调用总量"
          value={stats.calls}
          icon={Activity}
          delta={growth(stats.calls, previousStats.calls)}
          valueFormatter={formatCompact}
          hint="当前筛选范围内"
        />
        <StatCard
          label="调用成功率"
          value={stats.successRate}
          icon={ShieldAlert}
          tone={
            stats.successRate >= 99 ? "success" : stats.successRate >= 95 ? "warning" : "danger"
          }
          delta={Number((stats.successRate - previousStats.successRate).toFixed(1))}
          valueFormatter={(value) => `${value.toFixed(2)}%`}
          hint={`成功 ${formatNumber(stats.success)} / 共 ${formatNumber(stats.calls)}`}
        />
        <StatCard
          label="平均延迟"
          value={stats.avgLatencyMs}
          unit="ms"
          icon={Gauge}
          tone="info"
          delta={growth(stats.avgLatencyMs, previousStats.avgLatencyMs)}
          invertDelta
          valueFormatter={(value) => formatNumber(Math.round(value))}
        />
        <StatCard
          label="失败与阻断"
          value={stats.failure}
          unit="次"
          icon={TriangleAlert}
          tone={stats.failure > 0 ? "danger" : "success"}
          delta={growth(stats.failure, previousStats.failure)}
          invertDelta
          hint="含超时、限流与安全阻断"
        />
        <StatCard
          label="Token 消耗"
          value={stats.tokens}
          icon={Layers}
          delta={growth(stats.tokens, previousStats.tokens)}
          valueFormatter={formatCompact}
          hint={`入 ${formatCompact(stats.inputTokens)} / 出 ${formatCompact(stats.outputTokens)}`}
        />
        <StatCard
          label="调用成本"
          value={stats.cost}
          icon={Coins}
          tone="warning"
          delta={growth(stats.cost, previousStats.cost)}
          invertDelta
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setTenantFilter("all");
          setUserFilter("all");
          setModelFilter("all");
          setProviderFilter("all");
          setStatusFilter("all");
          setSourceFilter("all");
          setRangeFilter("7");
        }}
      >
        <FilterSelect
          label="租户"
          value={tenantFilter}
          onChange={setTenantFilter}
          options={tenantOptions}
        />
        <FilterSelect
          label="用户"
          value={userFilter}
          onChange={setUserFilter}
          options={userOptions}
        />
        <FilterSelect
          label="模型"
          value={modelFilter}
          onChange={setModelFilter}
          options={modelOptions}
        />
        <FilterSelect
          label="供应商"
          value={providerFilter}
          onChange={setProviderFilter}
          options={providerOptions}
        />
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="调用入口"
          value={sourceFilter}
          onChange={setSourceFilter}
          options={SOURCE_OPTIONS}
        />
        <FilterSelect
          label="时间范围"
          value={rangeFilter}
          onChange={setRangeFilter}
          options={RANGE_OPTIONS}
          allLabel="近 7 天"
        />
      </FilterBar>

      <Tabs defaultValue="calls">
        <TabsList>
          <TabsTrigger value="calls">调用明细</TabsTrigger>
          <TabsTrigger value="users">按用户</TabsTrigger>
          <TabsTrigger value="models">按模型</TabsTrigger>
          <TabsTrigger value="failures">失败与限流</TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-3">
          <ChartCard
            title="调用量趋势"
            description={`按${rangeMs <= 86_400_000 ? "小时" : "天"}聚合当前筛选的 ${formatNumber(filteredRecords.length)} 条调用，成功与失败分开呈现`}
          >
            <AreaTrendChart
              data={trendSeries}
              xKey="label"
              height={220}
              series={[
                { key: "success", name: "成功", color: "var(--chart-1)" },
                { key: "failed", name: "失败 / 阻断", color: "var(--chart-4)" },
              ]}
            />
          </ChartCard>

          <DataTable
            columns={recordColumns}
            data={filteredRecords}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索用户、模型、Request ID、项目…"
            pageSize={12}
            enableRowSelection
            rowClassName={(row) =>
              row.status === "failed" || row.status === "blocked"
                ? "bg-red-50/50 dark:bg-red-500/5"
                : undefined
            }
            onRowClick={(row) => setDetailRecord(row)}
            bulkActions={(rows, clear) => (
              <>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    toast.success(`已导出 ${rows.length} 条调用记录（演示）`);
                    clear();
                  }}
                >
                  <Download />
                  批量导出
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    toast.success(`已将 ${rows.length} 条调用加入排查清单（演示）`);
                    clear();
                  }}
                >
                  <Link2 />
                  加入排查清单
                </Button>
              </>
            )}
            emptyTitle="没有符合条件的调用记录"
            emptyDescription="试试放宽时间范围，或清空租户 / 用户 / 模型筛选条件。"
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-3">
          <ChartCard
            title="用户调用量 TOP 10"
            description="按调用次数排序，同时标出其中的失败调用，便于定位受影响的用户"
          >
            <BarDistributionChart
              data={userChartData}
              xKey="name"
              layout="vertical"
              height={Math.max(260, userChartData.length * 34)}
              series={[
                { key: "calls", name: "调用量", color: "var(--chart-1)" },
                { key: "failure", name: "失败", color: "var(--chart-4)" },
              ]}
              stacked
            />
          </ChartCard>

          <DataTable
            columns={userColumns}
            data={userRows}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索用户、租户、组织…"
            pageSize={10}
            onRowClick={(row) => setDetailUser(row)}
            emptyTitle="当前范围内没有用户调用记录"
          />
        </TabsContent>

        <TabsContent value="models" className="space-y-3">
          <ChartCard
            title="模型调用与 Token 分布"
            description="基于当前筛选明细聚合，按调用量降序取前 10 个模型"
          >
            <BarDistributionChart
              data={modelChartData}
              xKey="name"
              layout="vertical"
              height={Math.max(260, modelChartData.length * 34)}
              series={[
                { key: "calls", name: "调用量", color: "var(--chart-1)" },
                { key: "tokens", name: "Token", color: "var(--chart-2)" },
              ]}
              valueFormatter={(value) => formatCompact(value)}
            />
          </ChartCard>

          <DataTable
            columns={modelColumns}
            data={modelRows}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索模型、供应商…"
            pageSize={10}
            emptyTitle="当前范围内没有模型调用记录"
          />
        </TabsContent>

        <TabsContent value="failures" className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="调用状态分布"
              description={`共 ${formatNumber(filteredRecords.length)} 条调用，成功 ${formatNumber(stats.success)} 条`}
            >
              <DonutChart
                data={statusAggregation}
                height={300}
                valueFormatter={(value) => formatNumber(value)}
              />
            </ChartCard>
            <ChartCard title="错误码分布" description="仅统计非成功调用，点击明细可下钻到具体用户">
              <BarDistributionChart
                data={errorRows.map((row) => ({ name: row.code, count: row.count }))}
                xKey="name"
                layout="vertical"
                height={Math.max(240, errorRows.length * 40)}
                series={[{ key: "count", name: "次数", color: "var(--chart-4)" }]}
                valueFormatter={(value) => formatNumber(value)}
              />
            </ChartCard>
          </div>

          <section className="space-y-3">
            <SectionHeader
              title="错误码明细"
              description="按发生次数排序，包含影响面与最近发生时间，可据此配置告警规则"
            />
            <DataTable
              columns={errorColumns}
              data={errorRows}
              getRowId={(row) => row.code}
              searchPlaceholder="搜索错误码…"
              pageSize={8}
              emptyTitle="当前范围内没有失败调用"
              emptyDescription="所选时间范围内所有调用都成功了。"
            />
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="受影响用户"
              description="失败调用次数最多的用户，用于定向通知与配额调整"
            />
            {failureUserOptions.length > 0 ? (
              <div className="border-border bg-card overflow-hidden rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">用户</th>
                      <th className="px-3 py-2 text-left font-medium">租户</th>
                      <th className="px-3 py-2 text-right font-medium">失败次数</th>
                      <th className="px-3 py-2 text-right font-medium">失败率</th>
                      <th className="px-3 py-2 text-right font-medium">最近调用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failureUserOptions.map((row) => (
                      <tr key={`${row.tenantName}-${row.name}`} className="border-border border-t">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="text-muted-foreground px-3 py-2">{row.tenantName}</td>
                        <td className="num px-3 py-2 text-right">
                          {formatNumber(row.failureCalls)}
                        </td>
                        <td className="num px-3 py-2 text-right">{row.failureRate.toFixed(1)}%</td>
                        <td className="num text-muted-foreground px-3 py-2 text-right">
                          {formatRelativeTime(row.lastCalledAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground border-border bg-card rounded-xl border border-dashed px-4 py-6 text-center text-xs">
                当前筛选范围内没有失败调用
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

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
            <DialogTitle>导出调用记录</DialogTitle>
            <DialogDescription>
              按当前筛选条件导出明细，默认脱敏请求与响应内容，仅保留计费与排障字段。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onExport)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="range"
                  render={({ field }) => (
                    <FormItem className="grid content-start">
                      <FormLabel>导出范围</FormLabel>
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
                    <FormItem className="grid content-start">
                      <FormLabel>文件格式</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="csv">CSV（表格分析）</SelectItem>
                          <SelectItem value="jsonl">JSONL（逐条排障）</SelectItem>
                          <SelectItem value="parquet">Parquet（离线数仓）</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="onlyFailures"
                render={({ field }) => (
                  <FormItem className="grid content-start">
                    <div className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="space-y-0.5">
                        <FormLabel>仅导出失败与限流调用</FormLabel>
                        <FormDescription>适合直接交给值班同学定位问题。</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeContent"
                render={({ field }) => (
                  <FormItem className="grid content-start">
                    <div className="border-border flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="space-y-0.5">
                        <FormLabel>包含请求与响应摘要</FormLabel>
                        <FormDescription>含敏感内容，导出行为会写入审计日志。</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExportOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <Download />
                  导出 {formatNumber(filteredRecords.length)} 条
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailRecord !== null}
        onOpenChange={(open) => {
          if (!open) setDetailRecord(null);
        }}
        title={detailRecord ? `${detailRecord.modelName} 调用详情` : "调用详情"}
        description={
          detailRecord
            ? `${formatDate(detailRecord.at, "yyyy-MM-dd HH:mm:ss")} · ${detailRecord.userName} · ${detailRecord.requestId}`
            : undefined
        }
        footer={
          detailRecord ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyText(detailRecord.requestId, "Request ID")}
              >
                <Copy />
                复制 Request ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info(`调用链 ${detailRecord.traceId}（演示）`)}
              >
                <Link2 />
                查看调用链
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  toast.success(`已将 ${detailRecord.id} 加入排查清单（演示）`);
                  setDetailRecord(null);
                }}
              >
                <Wrench />
                加入排查清单
              </Button>
            </div>
          ) : null
        }
      >
        {detailRecord ? (
          <>
            <DetailSection title="调用结果" description="状态、HTTP 返回与错误信息">
              <DetailGrid>
                <DetailRow label="状态">
                  <StatusBadge status={detailRecord.status} />
                </DetailRow>
                <DetailRow label="HTTP 状态码">
                  <span className="num">{detailRecord.httpStatus}</span>
                </DetailRow>
                <DetailRow label="错误码" mono>
                  {detailRecord.errorCode ?? "—"}
                </DetailRow>
                <DetailRow label="用户反馈">
                  {detailRecord.feedback ? FEEDBACK_LABEL[detailRecord.feedback] : "未评价"}
                </DetailRow>
              </DetailGrid>
              {detailRecord.errorMessage ? (
                <p className="text-muted-foreground bg-muted/50 text-2xs mt-2 rounded-md px-3 py-2 leading-relaxed">
                  {detailRecord.errorMessage}
                </p>
              ) : null}
            </DetailSection>

            <DetailSection title="调用归属" description="发起调用的用户、租户与业务上下文">
              <DetailGrid>
                <DetailRow label="用户">
                  <div className="space-y-0.5">
                    <p>{detailRecord.userName}</p>
                    <p className="text-muted-foreground text-2xs">{detailRecord.userEmail}</p>
                  </div>
                </DetailRow>
                <DetailRow label="租户">{detailRecord.tenantName}</DetailRow>
                <DetailRow label="组织">{detailRecord.orgName}</DetailRow>
                <DetailRow label="项目">{detailRecord.projectName}</DetailRow>
                <DetailRow label="Agent">{detailRecord.agentName}</DetailRow>
                <DetailRow label="调用入口">{SOURCE_LABEL[detailRecord.source]}</DetailRow>
                <DetailRow label="调用凭据" mono>
                  {detailRecord.credentialName}
                </DetailRow>
                <DetailRow label="客户端 IP" mono>
                  {detailRecord.clientIp}
                </DetailRow>
                <DetailRow label="User-Agent" mono className="sm:col-span-2">
                  {detailRecord.userAgent}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="模型与路由" description="实际命中的模型、供应商与降级情况">
              <DetailGrid>
                <DetailRow label="实际模型" mono>
                  {detailRecord.modelName}
                </DetailRow>
                <DetailRow label="模型标识" mono>
                  {detailRecord.modelDisplayName}
                </DetailRow>
                <DetailRow label="供应商">{detailRecord.providerName}</DetailRow>
                <DetailRow label="供应商类型">
                  {PROVIDER_TYPE_LABEL[detailRecord.providerType]}
                </DetailRow>
                <DetailRow label="推理区域">{detailRecord.region}</DetailRow>
                <DetailRow label="路由策略">
                  {detailRecord.routeStrategy === "direct"
                    ? "直连（未命中路由）"
                    : label(detailRecord.routeStrategy)}
                </DetailRow>
                <DetailRow label="是否降级">
                  {detailRecord.fallbackUsed ? (
                    <Badge variant="warning">已降级至 {detailRecord.modelName}</Badge>
                  ) : (
                    "否"
                  )}
                </DetailRow>
                <DetailRow label="原始请求模型" mono>
                  {detailRecord.requestedModel}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="性能与用量" description="延迟、流式与 Token 统计">
              <DetailGrid>
                <DetailRow label="总延迟">
                  <span className="num">{formatNumber(detailRecord.latencyMs)} ms</span>
                </DetailRow>
                <DetailRow label="首字延迟">
                  <span className="num">
                    {detailRecord.firstTokenMs > 0
                      ? `${formatNumber(detailRecord.firstTokenMs)} ms`
                      : "非流式"}
                  </span>
                </DetailRow>
                <DetailRow label="输入 Token">
                  <span className="num">{formatNumber(detailRecord.inputTokens)}</span>
                </DetailRow>
                <DetailRow label="输出 Token">
                  <span className="num">{formatNumber(detailRecord.outputTokens)}</span>
                </DetailRow>
                <DetailRow label="缓存命中 Token">
                  <span className="num">{formatNumber(detailRecord.cachedTokens)}</span>
                </DetailRow>
                <DetailRow label="工具调用次数">
                  <span className="num">{detailRecord.toolCalls}</span>
                </DetailRow>
                <DetailRow label="流式输出">{detailRecord.streaming ? "是" : "否"}</DetailRow>
                <DetailRow label="重试次数">
                  <span className="num">{detailRecord.retryCount}</span>
                </DetailRow>
                <DetailRow label="本次成本">
                  <span className="num">{formatCompactCurrency(detailRecord.cost)}</span>
                </DetailRow>
                <DetailRow label="币种">{detailRecord.currency}</DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="安全与合规" description="内容安全策略与调用链标识">
              <DetailGrid>
                <DetailRow label="命中安全策略">
                  {detailRecord.safetyFlags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {detailRecord.safetyFlags.map((flag) => (
                        <Badge key={flag} variant="warning">
                          {label(flag)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "未命中"
                  )}
                </DetailRow>
                <DetailRow label="记录 ID" mono>
                  {detailRecord.id}
                </DetailRow>
                <DetailRow label="Request ID" mono className="sm:col-span-2">
                  {detailRecord.requestId}
                </DetailRow>
                <DetailRow label="Trace ID" mono className="sm:col-span-2">
                  {detailRecord.traceId}
                </DetailRow>
              </DetailGrid>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <DetailSheet
        open={detailUser !== null}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null);
        }}
        title={detailUser ? `${detailUser.userName} 的模型使用记录` : "用户模型使用记录"}
        description={detailUser ? `${detailUser.tenantName} · ${detailUser.orgName}` : undefined}
      >
        {detailUser ? (
          <>
            <DetailSection title="使用概览" description="当前筛选范围内该用户的模型调用情况">
              <DetailGrid>
                <DetailRow label="调用总量">
                  <span className="num">{formatNumber(detailUser.calls)}</span>
                </DetailRow>
                <DetailRow label="成功率">
                  <span className={cn("num", successRateTone(detailUser.successRate))}>
                    {detailUser.successRate.toFixed(1)}%
                  </span>
                </DetailRow>
                <DetailRow label="失败调用">
                  <span className="num">{formatNumber(detailUser.failureCalls)}</span>
                </DetailRow>
                <DetailRow label="平均延迟">
                  <span className="num">{formatNumber(detailUser.avgLatencyMs)} ms</span>
                </DetailRow>
                <DetailRow label="Token 合计">
                  <span className="num">{formatCompact(detailUser.tokens)}</span>
                </DetailRow>
                <DetailRow label="费用合计">
                  <span className="num">{formatCompactCurrency(detailUser.cost)}</span>
                </DetailRow>
                <DetailRow label="最近调用">
                  <span className="num">
                    {formatDate(detailUser.lastCalledAt, "yyyy-MM-dd HH:mm")}
                  </span>
                </DetailRow>
                <DetailRow label="账号">{detailUser.userEmail}</DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="常用模型" description="按该用户的调用次数排序">
              <div className="space-y-2">
                {detailUser.topModels.map((model) => {
                  const percent = detailUser.calls > 0 ? (model.calls / detailUser.calls) * 100 : 0;
                  return (
                    <div key={model.name} className="space-y-1">
                      <div className="text-2xs flex items-center justify-between gap-2">
                        <span className="font-mono">{model.name}</span>
                        <span className="num text-muted-foreground">
                          {formatNumber(model.calls)} 次 · {percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {detailUser.topModels.length === 0 ? (
                  <p className="text-muted-foreground text-2xs">当前范围内没有调用</p>
                ) : null}
              </div>
            </DetailSection>

            <DetailSection
              title="最近调用明细"
              description="取最新 8 条记录，可在明细标签页继续下钻"
            >
              <div className="space-y-1.5">
                {filteredRecords
                  .filter((record) => record.userId === detailUser.id)
                  .slice(0, 8)
                  .map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setDetailUser(null);
                        setDetailRecord(record);
                      }}
                      className="hover:border-primary/40 hover:bg-muted/60 border-border flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-left transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-2xs truncate font-mono">{record.modelName}</p>
                        <p className="num text-muted-foreground text-2xs">
                          {formatDate(record.at, "MM-dd HH:mm:ss")} · {SOURCE_LABEL[record.source]}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="num text-2xs">{formatNumber(record.latencyMs)} ms</span>
                        <StatusBadge status={record.status} dot={false} />
                      </div>
                    </button>
                  ))}
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="归档 30 天前的调用记录？"
        description="归档后明细只保留聚合统计，记录会转入冷存储；演示环境仅从列表移除。"
        confirmLabel="确认归档"
        loading={archivePending}
        onConfirm={confirmArchive}
      />

      <div className="text-muted-foreground text-2xs flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5">
          <Wrench className="size-3.5" />
          <span>调用明细保留 30 天，超期自动归档；计费数据以账单为准。</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="size-3.5" />
          <span>延迟为端到端耗时，包含网关排队与供应商推理时间。</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Ban className="size-3.5" />
          <span>被安全策略阻断的请求不计费，但会记录安全事件。</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>当前数据截至 {latestAt ? formatDate(latestAt, "yyyy-MM-dd HH:mm") : "—"}。</span>
        </span>
      </div>
    </PageContainer>
  );
}
