"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Ban,
  Database,
  Download,
  Fingerprint,
  Globe,
  KeyRound,
  Lock,
  Network,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge, RiskBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import {
  contentFilterRules,
  dataRetentionPolicies,
  dlpRules,
  ipAllowlistEntries,
  kmsKeys,
  securityPosture,
  watermarkPolicy,
} from "@/lib/mock-data/security";
import { formatDate, formatNumber, truncate } from "@/lib/utils";
import { label } from "@/lib/labels";
import type { ContentFilterRule, DataRetentionPolicy, DlpRule, IpAllowlistEntry, KmsKey } from "@/types";

const REFERENCE_NOW = Date.parse("2026-09-17T09:30:00+08:00");
const EXPIRING_WINDOW = 30 * 86_400_000;

const DLP_ACTION_OPTIONS = [
  { value: "block", label: "阻断" },
  { value: "mask", label: "脱敏" },
  { value: "warn", label: "警告" },
  { value: "log", label: "仅记录" },
];

const STAGE_OPTIONS = [
  { value: "input", label: "输入阶段" },
  { value: "output", label: "输出阶段" },
  { value: "both", label: "输入 + 输出" },
];

const STAGE_LABEL: Record<ContentFilterRule["stage"], string> = {
  input: "输入",
  output: "输出",
  both: "输入+输出",
};

const FILTER_ACTION_OPTIONS = [
  { value: "block", label: "阻断" },
  { value: "mask", label: "脱敏" },
  { value: "flag", label: "标记" },
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "critical", label: "严重" },
];

const PROVIDER_LABEL: Record<KmsKey["provider"], string> = {
  kms: "云 KMS",
  vault: "HashiCorp Vault",
  "local-hsm": "本地 HSM",
};

const EFFECT_OPTIONS = [
  { value: "allow", label: "允许" },
  { value: "deny", label: "禁止" },
];

const SCOPE_OPTIONS = [
  { value: "全局", label: "全局" },
  { value: "控制台", label: "控制台" },
  { value: "生产环境", label: "生产环境" },
  { value: "API", label: "API" },
  { value: "全部租户", label: "全部租户" },
];

const DELETION_MODE_OPTIONS = [
  { value: "auto-delete", label: "自动删除" },
  { value: "anonymize", label: "匿名化" },
  { value: "archive", label: "归档" },
  { value: "manual", label: "人工审批" },
];

const dlpSchema = z.object({
  name: z.string().min(2, "规则名称至少 2 个字符").max(40, "规则名称过长"),
  pattern: z
    .string()
    .min(1, "请输入匹配正则")
    .refine((value) => {
      try {
        new RegExp(value);
        return true;
      } catch {
        return false;
      }
    }, "正则表达式不合法"),
  category: z.enum(["pii", "credential", "financial", "source-code", "custom"]),
  action: z.enum(["block", "mask", "warn", "log"]),
  scope: z.string().min(1, "请选择生效范围"),
  enabled: z.boolean(),
});

type DlpFormValues = z.infer<typeof dlpSchema>;

const filterSchema = z.object({
  name: z.string().min(2, "规则名称至少 2 个字符").max(40, "规则名称过长"),
  stage: z.enum(["input", "output", "both"]),
  action: z.enum(["block", "mask", "flag"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  enabled: z.boolean(),
});

type FilterFormValues = z.infer<typeof filterSchema>;

const ipSchema = z.object({
  cidr: z
    .string()
    .min(1, "请输入 CIDR")
    .regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, "请输入合法的 IPv4 CIDR，例如 203.0.113.0/24"),
  label: z.string().min(2, "请填写标签").max(30, "标签过长"),
  scope: z.string().min(1, "请选择作用范围"),
  effect: z.enum(["allow", "deny"]),
  expireDays: z.coerce.number().int().min(0, "有效期不能为负").max(365, "有效期最长 365 天"),
});

type IpFormValues = z.infer<typeof ipSchema>;

const retentionSchema = z.object({
  retentionDays: z.coerce.number().int().min(1, "至少保留 1 天").max(3650, "保留天数过长"),
  deletionMode: z.enum(["auto-delete", "anonymize", "archive", "manual"]),
  exportEnabled: z.boolean(),
});

type RetentionFormValues = z.infer<typeof retentionSchema>;

export default function SecurityPage() {
  const [dlpList, setDlpList] = React.useState<DlpRule[]>(dlpRules);
  const [filterList, setFilterList] = React.useState<ContentFilterRule[]>(contentFilterRules);
  const [keyList, setKeyList] = React.useState<KmsKey[]>(kmsKeys);
  const [ipList, setIpList] = React.useState<IpAllowlistEntry[]>(ipAllowlistEntries);
  const [retentionList, setRetentionList] = React.useState<DataRetentionPolicy[]>(dataRetentionPolicies);
  const [watermarkEnabled, setWatermarkEnabled] = React.useState(watermarkPolicy.enabled);
  const [traceable, setTraceable] = React.useState(watermarkPolicy.traceable);

  const [dlpCategory, setDlpCategory] = React.useState("all");
  const [dlpAction, setDlpAction] = React.useState("all");
  const [dlpEnabled, setDlpEnabled] = React.useState("all");

  const [dlpDialogOpen, setDlpDialogOpen] = React.useState(false);
  const [editingDlp, setEditingDlp] = React.useState<DlpRule | null>(null);
  const [editingFilter, setEditingFilter] = React.useState<ContentFilterRule | null>(null);
  const [detailKey, setDetailKey] = React.useState<KmsKey | null>(null);
  const [rotateTarget, setRotateTarget] = React.useState<KmsKey | null>(null);
  const [ipDialogOpen, setIpDialogOpen] = React.useState(false);
  const [deleteIpTarget, setDeleteIpTarget] = React.useState<IpAllowlistEntry | null>(null);
  const [editingRetention, setEditingRetention] = React.useState<DataRetentionPolicy | null>(null);
  const [pending, setPending] = React.useState(false);

  const dlpCategoryOptions = React.useMemo(
    () => Array.from(new Set(dlpList.map((rule) => rule.category))).map((value) => ({ value, label: label(value) })),
    [dlpList],
  );

  const filteredDlp = React.useMemo(
    () =>
      dlpList.filter(
        (rule) =>
          (dlpCategory === "all" || rule.category === dlpCategory) &&
          (dlpAction === "all" || rule.action === dlpAction) &&
          (dlpEnabled === "all" ||
            (dlpEnabled === "enabled" ? rule.enabled : !rule.enabled)),
      ),
    [dlpList, dlpCategory, dlpAction, dlpEnabled],
  );

  const dlpActiveFilterCount = [dlpCategory, dlpAction, dlpEnabled].filter((value) => value !== "all").length;

  const dlpForm = useForm<DlpFormValues>({
    resolver: zodResolver(dlpSchema),
    defaultValues: {
      name: "",
      pattern: "",
      category: "pii",
      action: "mask",
      scope: "全局",
      enabled: true,
    },
  });

  React.useEffect(() => {
    if (editingDlp) {
      dlpForm.reset({
        name: editingDlp.name,
        pattern: editingDlp.pattern,
        category: editingDlp.category,
        action: editingDlp.action,
        scope: editingDlp.scope,
        enabled: editingDlp.enabled,
      });
    } else {
      dlpForm.reset({
        name: "",
        pattern: "",
        category: "pii",
        action: "mask",
        scope: "全局",
        enabled: true,
      });
    }
  }, [editingDlp, dlpForm]);

  const filterForm = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: { name: "", stage: "both", action: "block", severity: "high", enabled: true },
  });

  React.useEffect(() => {
    if (editingFilter) {
      filterForm.reset({
        name: editingFilter.name,
        stage: editingFilter.stage,
        action: editingFilter.action,
        severity: editingFilter.severity,
        enabled: editingFilter.enabled,
      });
    }
  }, [editingFilter, filterForm]);

  const ipForm = useForm<IpFormValues>({
    resolver: zodResolver(ipSchema),
    defaultValues: { cidr: "", label: "", scope: "全局", effect: "allow", expireDays: 0 },
  });

  const retentionForm = useForm<RetentionFormValues>({
    resolver: zodResolver(retentionSchema),
    defaultValues: { retentionDays: 90, deletionMode: "archive", exportEnabled: true },
  });

  React.useEffect(() => {
    if (editingRetention) {
      retentionForm.reset({
        retentionDays: editingRetention.retentionDays,
        deletionMode: editingRetention.deletionMode,
        exportEnabled: editingRetention.exportEnabled,
      });
    }
  }, [editingRetention, retentionForm]);

  const onSubmitDlp = (values: DlpFormValues) => {
    if (editingDlp) {
      setDlpList((list) =>
        list.map((rule) =>
          rule.id === editingDlp.id ? { ...rule, ...values, updatedAt: new Date().toISOString() } : rule,
        ),
      );
      toast.success(`已更新 DLP 规则「${values.name}」`);
    } else {
      setDlpList((list) => [
        {
          id: `dlp-${String(list.length + 1).padStart(2, "0")}`,
          ...values,
          hitCount: 0,
          updatedAt: new Date().toISOString(),
        },
        ...list,
      ]);
      toast.success(`已创建 DLP 规则「${values.name}」`);
    }
    setDlpDialogOpen(false);
    setEditingDlp(null);
    dlpForm.reset();
  };

  const onSubmitFilter = (values: FilterFormValues) => {
    if (!editingFilter) return;
    setFilterList((list) =>
      list.map((rule) =>
        rule.id === editingFilter.id ? { ...rule, ...values, updatedAt: new Date().toISOString() } : rule,
      ),
    );
    toast.success(`已更新内容审核规则「${values.name}」`);
    setEditingFilter(null);
  };

  const onSubmitIp = (values: IpFormValues) => {
    const expiresAt =
      values.expireDays > 0
        ? new Date(REFERENCE_NOW + values.expireDays * 86_400_000).toISOString()
        : null;
    setIpList((list) => [
      {
        id: `ip-${String(list.length + 1).padStart(2, "0")}`,
        cidr: values.cidr,
        label: values.label,
        scope: values.scope,
        effect: values.effect,
        expiresAt,
        addedBy: "当前管理员",
        createdAt: new Date().toISOString(),
      },
      ...list,
    ]);
    toast.success(`已添加 IP 规则「${values.label}」`);
    setIpDialogOpen(false);
    ipForm.reset();
  };

  const onSubmitRetention = (values: RetentionFormValues) => {
    if (!editingRetention) return;
    setRetentionList((list) =>
      list.map((policy) =>
        policy.id === editingRetention.id ? { ...policy, ...values, updatedAt: new Date().toISOString() } : policy,
      ),
    );
    toast.success(`已更新「${editingRetention.dataType}」保留策略`);
    setEditingRetention(null);
  };

  const confirmRotate = () => {
    if (!rotateTarget) return;
    setPending(true);
    window.setTimeout(() => {
      setKeyList((list) =>
        list.map((key) =>
          key.id === rotateTarget.id
            ? { ...key, status: "rotating", lastRotatedAt: new Date().toISOString() }
            : key,
        ),
      );
      toast.success(`已提交「${rotateTarget.name}」的密钥轮换任务`);
      setPending(false);
      setRotateTarget(null);
    }, 500);
  };

  const confirmDeleteIp = () => {
    if (!deleteIpTarget) return;
    setPending(true);
    window.setTimeout(() => {
      setIpList((list) => list.filter((entry) => entry.id !== deleteIpTarget.id));
      toast.success(`已删除 IP 规则「${deleteIpTarget.label}」`);
      setPending(false);
      setDeleteIpTarget(null);
    }, 500);
  };

  const dlpColumns = React.useMemo<ColumnDef<DlpRule, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "规则名称",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "category",
        accessorKey: "category",
        header: "分类",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.category)}</Badge>,
      },
      {
        id: "pattern",
        accessorKey: "pattern",
        header: "匹配正则",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{truncate(row.original.pattern, 28)}</span>
        ),
      },
      {
        id: "action",
        accessorKey: "action",
        header: "动作",
        cell: ({ row }) => <StatusBadge status={row.original.action} />,
      },
      {
        id: "scope",
        accessorKey: "scope",
        header: "范围",
        cell: ({ row }) => <span className="text-2xs">{row.original.scope}</span>,
      },
      {
        id: "hitCount",
        accessorKey: "hitCount",
        header: "命中数",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.hitCount)}</span>,
      },
      {
        id: "enabled",
        accessorKey: "enabled",
        header: "状态",
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={row.original.enabled}
              aria-label="启用规则"
              onCheckedChange={() => {
                setDlpList((list) =>
                  list.map((rule) =>
                    rule.id === row.original.id ? { ...rule, enabled: !rule.enabled } : rule,
                  ),
                );
                toast.success(`已${row.original.enabled ? "停用" : "启用"}「${row.original.name}」`);
              }}
            />
          </div>
        ),
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
            viewLabel="查看规则"
            onView={() => setEditingDlp(row.original)}
            onEdit={() => setEditingDlp(row.original)}
          />
        ),
      },
    ],
    [],
  );

  const filterColumns = React.useMemo<ColumnDef<ContentFilterRule, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "规则名称",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "stage",
        accessorKey: "stage",
        header: "阶段",
        cell: ({ row }) => <Badge variant="outline">{STAGE_LABEL[row.original.stage]}</Badge>,
      },
      {
        id: "category",
        accessorKey: "category",
        header: "分类",
        cell: ({ row }) => <span className="text-xs">{label(row.original.category)}</span>,
      },
      {
        id: "action",
        accessorKey: "action",
        header: "动作",
        cell: ({ row }) => <StatusBadge status={row.original.action} />,
      },
      {
        id: "severity",
        accessorKey: "severity",
        header: "严重度",
        cell: ({ row }) => <RiskBadge risk={row.original.severity} />,
      },
      {
        id: "hitCount",
        accessorKey: "hitCount",
        header: "命中数",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.hitCount)}</span>,
      },
      {
        id: "enabled",
        accessorKey: "enabled",
        header: "状态",
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={row.original.enabled}
              aria-label="启用规则"
              onCheckedChange={() => {
                setFilterList((list) =>
                  list.map((rule) =>
                    rule.id === row.original.id ? { ...rule, enabled: !rule.enabled } : rule,
                  ),
                );
                toast.success(`已${row.original.enabled ? "停用" : "启用"}「${row.original.name}」`);
              }}
            />
          </div>
        ),
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
        cell: ({ row }) => <RowActions onEdit={() => setEditingFilter(row.original)} />,
      },
    ],
    [],
  );

  const keyColumns = React.useMemo<ColumnDef<KmsKey, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "密钥名称",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => <span className="text-2xs">{PROVIDER_LABEL[row.original.provider]}</span>,
      },
      {
        id: "algorithm",
        accessorKey: "algorithm",
        header: "算法",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.algorithm}</span>,
      },
      {
        id: "rotationDays",
        accessorKey: "rotationDays",
        header: "轮换周期",
        cell: ({ row }) => <span className="num text-xs">{row.original.rotationDays} 天</span>,
      },
      {
        id: "lastRotatedAt",
        accessorKey: "lastRotatedAt",
        header: "上次轮换",
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.lastRotatedAt)}</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "custodian",
        accessorKey: "custodian",
        header: "托管人",
        cell: ({ row }) => <span className="text-xs">{row.original.custodian}</span>,
      },
      {
        id: "usageCount",
        accessorKey: "usageCount",
        header: "使用次数",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.usageCount)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            viewLabel="密钥详情"
            onView={() => setDetailKey(row.original)}
            extraItems={[
              {
                label: "立即轮换",
                onSelect: () => setRotateTarget(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const ipColumns = React.useMemo<ColumnDef<IpAllowlistEntry, unknown>[]>(
    () => [
      {
        id: "cidr",
        accessorKey: "cidr",
        header: "CIDR",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.cidr}</span>,
      },
      {
        id: "label",
        accessorKey: "label",
        header: "标签",
        cell: ({ row }) => <span className="text-xs">{row.original.label}</span>,
      },
      {
        id: "scope",
        accessorKey: "scope",
        header: "范围",
        cell: ({ row }) => <Badge variant="outline">{row.original.scope}</Badge>,
      },
      {
        id: "effect",
        accessorKey: "effect",
        header: "效果",
        cell: ({ row }) => <StatusBadge status={row.original.effect} />,
      },
      {
        id: "expiresAt",
        accessorKey: "expiresAt",
        header: "过期时间",
        cell: ({ row }) => {
          const expiresAt = row.original.expiresAt;
          if (!expiresAt) return <span className="text-muted-foreground text-2xs">永久</span>;
          const remaining = Date.parse(expiresAt) - REFERENCE_NOW;
          if (remaining <= EXPIRING_WINDOW) {
            return (
              <div className="space-y-1">
                <StatusBadge status="expiring" />
                <p className="num text-muted-foreground text-2xs">{formatDate(expiresAt)}</p>
              </div>
            );
          }
          return <span className="num text-2xs">{formatDate(expiresAt)}</span>;
        },
      },
      {
        id: "addedBy",
        accessorKey: "addedBy",
        header: "添加人",
        cell: ({ row }) => <span className="text-xs">{row.original.addedBy}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions onDelete={() => setDeleteIpTarget(row.original)} viewLabel="查看规则" />
        ),
      },
    ],
    [],
  );

  const retentionColumns = React.useMemo<ColumnDef<DataRetentionPolicy, unknown>[]>(
    () => [
      {
        id: "dataType",
        accessorKey: "dataType",
        header: "数据类型",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.dataType}</span>,
      },
      {
        id: "retentionDays",
        accessorKey: "retentionDays",
        header: "保留天数",
        cell: ({ row }) => <span className="num text-xs">{row.original.retentionDays} 天</span>,
      },
      {
        id: "deletionMode",
        accessorKey: "deletionMode",
        header: "删除方式",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.deletionMode)}</Badge>,
      },
      {
        id: "exportEnabled",
        accessorKey: "exportEnabled",
        header: "允许导出",
        cell: ({ row }) => <StatusBadge status={row.original.exportEnabled ? "enabled" : "disabled"} />,
      },
      {
        id: "jurisdiction",
        accessorKey: "jurisdiction",
        header: "管辖范围",
        cell: ({ row }) => <span className="text-2xs">{row.original.jurisdiction}</span>,
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
        cell: ({ row }) => <RowActions onEdit={() => setEditingRetention(row.original)} />,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="安全策略"
        description="统一管理 DLP、内容审核、密钥、IP 白名单、数据保留与水印追溯策略。数据为本地演示数据。"
        badges={<Badge variant="success">防护生效中</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("已导出安全策略与命中报告（演示）")}
          >
            <Download />
            导出策略报告
          </Button>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="DLP 命中"
          value={securityPosture.dlpHitsToday}
          unit="次"
          icon={ScanLine}
          tone="warning"
          valueFormatter={formatNumber}
        />
        <StatCard
          label="阻断注入"
          value={securityPosture.injectionsBlocked}
          unit="次"
          icon={ShieldAlert}
          tone="danger"
        />
        <StatCard
          label="待轮换密钥"
          value={securityPosture.keysDueRotation}
          unit="个"
          icon={KeyRound}
          tone="info"
        />
        <StatCard label="封禁 IP" value={securityPosture.ipDeniedToday} unit="次" icon={Ban} tone="danger" />
        <StatCard
          label="合规得分"
          value={securityPosture.complianceScore}
          unit="分"
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard label="活跃会话" value={securityPosture.sessionsActive} unit="个" icon={Globe} />
      </StatCardGrid>

      <Tabs defaultValue="dlp">
        <TabsList>
          <TabsTrigger value="dlp">DLP</TabsTrigger>
          <TabsTrigger value="content">内容审核</TabsTrigger>
          <TabsTrigger value="kms">密钥管理</TabsTrigger>
          <TabsTrigger value="ip">IP 白名单</TabsTrigger>
          <TabsTrigger value="retention">数据保留</TabsTrigger>
          <TabsTrigger value="watermark">水印追溯</TabsTrigger>
        </TabsList>

        <TabsContent value="dlp" className="space-y-3">
          <FilterBar
            activeCount={dlpActiveFilterCount}
            onReset={() => {
              setDlpCategory("all");
              setDlpAction("all");
              setDlpEnabled("all");
            }}
          >
            <FilterSelect
              label="分类"
              value={dlpCategory}
              onChange={setDlpCategory}
              options={dlpCategoryOptions}
            />
            <FilterSelect label="动作" value={dlpAction} onChange={setDlpAction} options={DLP_ACTION_OPTIONS} />
            <FilterSelect
              label="状态"
              value={dlpEnabled}
              onChange={setDlpEnabled}
              options={[
                { value: "enabled", label: "已启用" },
                { value: "disabled", label: "已停用" },
              ]}
            />
          </FilterBar>
          <DataTable
            columns={dlpColumns}
            data={filteredDlp}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索规则名称、正则…"
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingDlp(null);
                  setDlpDialogOpen(true);
                }}
              >
                <Plus />
                新建规则
              </Button>
            }
            onRowClick={(row) => setEditingDlp(row)}
            emptyTitle="没有符合条件的 DLP 规则"
          />
        </TabsContent>

        <TabsContent value="content">
          <DataTable
            columns={filterColumns}
            data={filterList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索规则名称、分类…"
            onRowClick={(row) => setEditingFilter(row)}
            emptyTitle="暂无内容审核规则"
          />
        </TabsContent>

        <TabsContent value="kms">
          <DataTable
            columns={keyColumns}
            data={keyList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索密钥名称、托管人…"
            onRowClick={(row) => setDetailKey(row)}
            emptyTitle="暂无密钥"
          />
        </TabsContent>

        <TabsContent value="ip">
          <DataTable
            columns={ipColumns}
            data={ipList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索 CIDR、标签、添加人…"
            toolbar={
              <Button size="sm" onClick={() => setIpDialogOpen(true)}>
                <Plus />
                新增 IP
              </Button>
            }
            emptyTitle="暂无 IP 白名单规则"
          />
        </TabsContent>

        <TabsContent value="retention">
          <DataTable
            columns={retentionColumns}
            data={retentionList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索数据类型、管辖范围…"
            onRowClick={(row) => setEditingRetention(row)}
            emptyTitle="暂无数据保留策略"
          />
        </TabsContent>

        <TabsContent value="watermark" className="space-y-3">
          <Card className="gap-0 py-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>水印与追溯策略</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="watermark-enabled" className="text-2xs font-normal">
                    {watermarkEnabled ? "已启用" : "已停用"}
                  </Label>
                  <Switch
                    id="watermark-enabled"
                    checked={watermarkEnabled}
                    onCheckedChange={(checked) => {
                      setWatermarkEnabled(checked);
                      toast.success(`已${checked ? "启用" : "停用"}水印策略`);
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailGrid>
                <DetailRow label="水印模式">{watermarkPolicy.mode}</DetailRow>
                <DetailRow label="可追溯">
                  <StatusBadge status={traceable ? "enabled" : "disabled"} />
                </DetailRow>
              </DetailGrid>

              <div className="space-y-2">
                <p className="text-xs font-medium">可追溯字段</p>
                <div className="flex flex-wrap gap-1.5">
                  {watermarkPolicy.fields.map((field) => (
                    <Badge key={field} variant="outline">
                      <Fingerprint />
                      {field}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground text-2xs">
                  水印会在模型输出与导出文件中植入不可见标识，命中泄露样本时可反查来源。
                </p>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium">泄露溯源</p>
                  <p className="text-muted-foreground text-2xs">
                    开启后自动关联字段，支持按样本反查租户、用户与会话。
                  </p>
                </div>
                <Switch
                  checked={traceable}
                  aria-label="开启泄露溯源"
                  onCheckedChange={(checked) => {
                    setTraceable(checked);
                    toast.success(`已${checked ? "开启" : "关闭"}泄露溯源`);
                  }}
                />
              </div>

              <Alert variant={watermarkEnabled ? "success" : "warning"}>
                {watermarkEnabled ? <ShieldCheck /> : <ShieldAlert />}
                <AlertTitle>{watermarkEnabled ? "水印策略运行中" : "水印策略已停用"}</AlertTitle>
                <AlertDescription>
                  {watermarkEnabled
                    ? "所有对外输出与导出文件均会植入水印，可在安全事件中用于溯源。"
                    : "停用后将无法对泄露样本进行来源追溯，建议尽快恢复。"}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={dlpDialogOpen || editingDlp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDlpDialogOpen(false);
            setEditingDlp(null);
            dlpForm.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDlp ? `编辑 DLP 规则 · ${editingDlp.name}` : "新建 DLP 规则"}</DialogTitle>
            <DialogDescription>规则命中后按选定动作处理，正则表达式需为合法且有界的模式。</DialogDescription>
          </DialogHeader>
          <Form {...dlpForm}>
            <form onSubmit={dlpForm.handleSubmit(onSubmitDlp)} className="space-y-4">
              <FormField
                control={dlpForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>规则名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：员工工号识别" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dlpForm.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>匹配正则</FormLabel>
                    <FormControl>
                      <Input placeholder="\\bEMP-\\d{6}\\b" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>使用 JavaScript 正则语法，建议避免贪婪匹配。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={dlpForm.control}
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
                          <SelectItem value="pii">个人隐私</SelectItem>
                          <SelectItem value="credential">凭据泄露</SelectItem>
                          <SelectItem value="financial">金融数据</SelectItem>
                          <SelectItem value="source-code">源码外泄</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={dlpForm.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>命中动作</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DLP_ACTION_OPTIONS.map((option) => (
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
                control={dlpForm.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>生效范围</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from(new Set([...SCOPE_OPTIONS.map((option) => option.value), ...dlpList.map((r) => r.scope)])).map(
                          (scope) => (
                            <SelectItem key={scope} value={scope}>
                              {scope}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dlpForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-xs font-normal">创建后立即启用</span>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </label>
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
                    setDlpDialogOpen(false);
                    setEditingDlp(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingDlp ? "保存规则" : "创建规则"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingFilter !== null}
        onOpenChange={(open) => {
          if (!open) setEditingFilter(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑内容审核规则</DialogTitle>
            <DialogDescription>
              {editingFilter ? `${editingFilter.name} · ${label(editingFilter.category)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...filterForm}>
            <form onSubmit={filterForm.handleSubmit(onSubmitFilter)} className="space-y-4">
              <FormField
                control={filterForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>规则名称</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  control={filterForm.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>检测阶段</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STAGE_OPTIONS.map((option) => (
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
                  control={filterForm.control}
                  name="action"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>动作</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FILTER_ACTION_OPTIONS.map((option) => (
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
                  control={filterForm.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>严重度</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEVERITY_OPTIONS.map((option) => (
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
                control={filterForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-xs font-normal">启用规则</span>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingFilter(null)}>
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

      <Dialog
        open={ipDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIpDialogOpen(false);
            ipForm.reset();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增 IP 规则</DialogTitle>
            <DialogDescription>支持允许或拒绝指定 CIDR，可设置临时有效期用于外包与跳板机。</DialogDescription>
          </DialogHeader>
          <Form {...ipForm}>
            <form onSubmit={ipForm.handleSubmit(onSubmitIp)} className="space-y-4">
              <FormField
                control={ipForm.control}
                name="cidr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CIDR</FormLabel>
                    <FormControl>
                      <Input placeholder="203.0.113.0/24" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ipForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标签</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：深圳办公出口" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField
                  control={ipForm.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>作用范围</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SCOPE_OPTIONS.map((option) => (
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
                  control={ipForm.control}
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
                  control={ipForm.control}
                  name="expireDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>有效期（天）</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={365} {...field} />
                      </FormControl>
                      <FormDescription>0 表示永久生效。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setIpDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <Network />
                  添加规则
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingRetention !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRetention(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑数据保留策略</DialogTitle>
            <DialogDescription>{editingRetention ? editingRetention.dataType : ""}</DialogDescription>
          </DialogHeader>
          <Form {...retentionForm}>
            <form onSubmit={retentionForm.handleSubmit(onSubmitRetention)} className="space-y-4">
              <FormField
                control={retentionForm.control}
                name="retentionDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>保留天数</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={3650} {...field} />
                    </FormControl>
                    <FormDescription>缩短保留期将在次日清理任务中生效。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={retentionForm.control}
                name="deletionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>过期处理方式</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DELETION_MODE_OPTIONS.map((option) => (
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
                control={retentionForm.control}
                name="exportEnabled"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-xs font-normal">允许导出该类型数据</span>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRetention(null)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  保存策略
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailKey !== null}
        onOpenChange={(open) => {
          if (!open) setDetailKey(null);
        }}
        title={detailKey?.name ?? "密钥详情"}
        description={detailKey ? PROVIDER_LABEL[detailKey.provider] : undefined}
        footer={
          detailKey ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailKey.status} />
              <Button variant="outline" size="sm" onClick={() => setRotateTarget(detailKey)}>
                <RefreshCw />
                立即轮换
              </Button>
            </div>
          ) : null
        }
      >
        {detailKey ? (
          <>
            <Alert variant="info">
              <Lock />
              <AlertTitle>密钥材料不落地展示</AlertTitle>
              <AlertDescription>
                平台仅保存密钥引用与审计记录，页面不展示任何密钥明文或密文内容。
              </AlertDescription>
            </Alert>

            <DetailSection title="密钥信息">
              <DetailGrid>
                <DetailRow label="名称">{detailKey.name}</DetailRow>
                <DetailRow label="Provider">{PROVIDER_LABEL[detailKey.provider]}</DetailRow>
                <DetailRow label="算法" mono>
                  {detailKey.algorithm}
                </DetailRow>
                <DetailRow label="托管人">{detailKey.custodian}</DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="轮换与使用">
              <DetailGrid>
                <DetailRow label="轮换周期">
                  <span className="num">{detailKey.rotationDays} 天</span>
                </DetailRow>
                <DetailRow label="上次轮换">
                  <span className="num">{formatDate(detailKey.lastRotatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="使用次数">
                  <span className="num">{formatNumber(detailKey.usageCount)}</span>
                </DetailRow>
                <DetailRow label="密钥 ID" mono>
                  {detailKey.id}
                </DetailRow>
              </DetailGrid>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={rotateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRotateTarget(null);
        }}
        title={`立即轮换「${rotateTarget?.name ?? ""}」？`}
        description="轮换期间新旧密钥将短暂并行，直至在途请求消化完毕；该操作会记录审计日志。"
        confirmLabel="确认轮换"
        variant="default"
        loading={pending}
        onConfirm={confirmRotate}
      />

      <ConfirmDialog
        open={deleteIpTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIpTarget(null);
        }}
        title={`删除 IP 规则「${deleteIpTarget?.label ?? ""}」？`}
        description="删除后该 CIDR 将立即从白名单/黑名单中移除，可能影响正在使用的连接。"
        confirmLabel="确认删除"
        loading={pending}
        onConfirm={confirmDeleteIp}
      />

      <div className="text-muted-foreground flex items-center gap-1.5 text-2xs">
        <Database className="size-3.5" />
        <span>安全策略与命中数据均为本地演示数据，不连接真实防护引擎。</span>
      </div>
    </PageContainer>
  );
}
