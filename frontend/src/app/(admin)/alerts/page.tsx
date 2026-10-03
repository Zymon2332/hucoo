"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BellOff,
  BellRing,
  CheckCheck,
  CircleCheck,
  Plus,
  Send,
  ShieldAlert,
  Siren,
  TriangleAlert,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { RiskBadge, StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { alerts as alertSeed, alertRules as ruleSeed, notificationChannels as channelSeed } from "@/lib/mock-data/ops";
import { formatDate, formatRelativeTime, truncate } from "@/lib/utils";
import type { Alert as AlertRecord, AlertRule, AlertType, NotificationChannel } from "@/types";

const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  cost: "成本",
  error: "错误",
  "permission-change": "权限变更",
  "model-unavailable": "模型不可用",
  security: "安全",
  quota: "配额",
  latency: "延迟",
};

const ALERT_TYPE_OPTIONS = (Object.keys(ALERT_TYPE_LABEL) as AlertType[]).map((value) => ({
  value,
  label: ALERT_TYPE_LABEL[value],
}));

const SEVERITY_OPTIONS = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
  { value: "critical", label: "严重风险" },
];

const ALERT_STATUS_OPTIONS = [
  { value: "firing", label: "告警中" },
  { value: "acknowledged", label: "已确认" },
  { value: "resolved", label: "已恢复" },
  { value: "silenced", label: "已静默" },
];

const NOTIFY_CHANNELS = ["邮件", "飞书", "Slack", "Webhook", "短信"] as const;
const SUBSCRIBE_EVENTS = ["告警", "审批", "账单", "发布", "安全", "审计", "租户", "工单", "预算", "日报"] as const;

const CHANNEL_TYPE_OPTIONS = [
  { value: "email", label: "邮件" },
  { value: "slack", label: "Slack" },
  { value: "feishu", label: "飞书" },
  { value: "dingtalk", label: "钉钉" },
  { value: "webhook", label: "Webhook" },
  { value: "sms", label: "短信" },
];

const SILENCE_DURATIONS = [
  { value: "1h", label: "1 小时" },
  { value: "4h", label: "4 小时" },
  { value: "24h", label: "24 小时" },
  { value: "7d", label: "7 天" },
];

const ruleSchema = z.object({
  name: z.string().min(2, "规则名称至少 2 个字符").max(40, "规则名称过长"),
  type: z.enum(["cost", "error", "permission-change", "model-unavailable", "security", "quota", "latency"]),
  condition: z.string().min(2, "请填写触发条件表达式"),
  threshold: z.string().min(1, "请填写阈值"),
  window: z.string().min(1, "请填写检测窗口"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  channels: z.array(z.string()).min(1, "至少选择一个通知渠道"),
  owner: z.string().min(2, "请填写负责人"),
  enabled: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

const channelSchema = z.object({
  name: z.string().min(2, "渠道名称至少 2 个字符").max(30, "渠道名称过长"),
  type: z.enum(["email", "slack", "feishu", "dingtalk", "webhook", "sms"]),
  target: z.string().min(3, "请填写推送目标"),
  subscribedEvents: z.array(z.string()).min(1, "至少订阅一个事件"),
});

type ChannelFormValues = z.infer<typeof channelSchema>;

const deriveAlertTimeline = (record: AlertRecord) => {
  const nodes: { label: string; at: string; done: boolean }[] = [
    { label: "告警触发", at: record.triggeredAt, done: true },
  ];
  if (record.acknowledgedBy) {
    nodes.push({ label: `已确认 · ${record.acknowledgedBy}`, at: record.triggeredAt, done: true });
  }
  if (record.status === "silenced") {
    nodes.push({ label: "已静默通知", at: record.triggeredAt, done: true });
  }
  if (record.resolvedAt) {
    nodes.push({ label: "已恢复", at: record.resolvedAt, done: true });
  }
  return nodes;
};

export default function AlertsPage() {
  const [alertList, setAlertList] = React.useState<AlertRecord[]>(alertSeed);
  const [ruleList, setRuleList] = React.useState<AlertRule[]>(ruleSeed);
  const [channelList, setChannelList] = React.useState<NotificationChannel[]>(channelSeed);

  const [typeFilter, setTypeFilter] = React.useState("all");
  const [severityFilter, setSeverityFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");

  const [detailAlert, setDetailAlert] = React.useState<AlertRecord | null>(null);
  const [silenceTarget, setSilenceTarget] = React.useState<AlertRecord | null>(null);
  const [silenceDuration, setSilenceDuration] = React.useState("1h");

  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AlertRule | null>(null);
  const [ruleDeleteTarget, setRuleDeleteTarget] = React.useState<AlertRule | null>(null);
  const [channelDialogOpen, setChannelDialogOpen] = React.useState(false);

  const tenantOptions = React.useMemo(
    () => Array.from(new Set(alertList.map((record) => record.tenantName))).map((value) => ({ value, label: value })),
    [alertList],
  );
  const sourceOptions = React.useMemo(
    () => Array.from(new Set(alertList.map((record) => record.source))).map((value) => ({ value, label: value })),
    [alertList],
  );

  const filteredAlerts = React.useMemo(
    () =>
      alertList.filter(
        (record) =>
          (typeFilter === "all" || record.type === typeFilter) &&
          (severityFilter === "all" || record.severity === severityFilter) &&
          (statusFilter === "all" || record.status === statusFilter) &&
          (tenantFilter === "all" || record.tenantName === tenantFilter) &&
          (sourceFilter === "all" || record.source === sourceFilter),
      ),
    [alertList, typeFilter, severityFilter, statusFilter, tenantFilter, sourceFilter],
  );

  const stats = React.useMemo(() => {
    const firing = alertList.filter((record) => record.status === "firing").length;
    const acknowledged = alertList.filter((record) => record.status === "acknowledged").length;
    const resolved = alertList.filter((record) => record.status === "resolved").length;
    const silenced = alertList.filter((record) => record.status === "silenced").length;
    const critical = alertList.filter((record) => record.severity === "critical").length;
    const today = alertList.filter(
      (record) => Date.now() - new Date(record.triggeredAt).getTime() <= 86_400_000,
    ).length;
    return { firing, acknowledged, resolved, silenced, critical, today };
  }, [alertList]);

  const ruleForm = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      type: "cost",
      condition: "",
      threshold: "",
      window: "1h",
      severity: "medium",
      channels: ["邮件"],
      owner: "",
      enabled: true,
    },
  });

  const channelForm = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: "",
      type: "email",
      target: "",
      subscribedEvents: ["告警"],
    },
  });

  React.useEffect(() => {
    if (editingRule) {
      ruleForm.reset({
        name: editingRule.name,
        type: editingRule.type,
        condition: editingRule.condition,
        threshold: editingRule.threshold,
        window: editingRule.window,
        severity: editingRule.severity,
        channels: editingRule.channels,
        owner: editingRule.owner,
        enabled: editingRule.enabled,
      });
    } else {
      ruleForm.reset({
        name: "",
        type: "cost",
        condition: "",
        threshold: "",
        window: "1h",
        severity: "medium",
        channels: ["邮件"],
        owner: "",
        enabled: true,
      });
    }
  }, [editingRule, ruleForm]);

  const updateAlert = React.useCallback((id: string, patch: Partial<AlertRecord>) => {
    setAlertList((list) => list.map((record) => (record.id === id ? { ...record, ...patch } : record)));
  }, []);

  const acknowledge = React.useCallback(
    (record: AlertRecord) => {
      updateAlert(record.id, { status: "acknowledged", acknowledgedBy: "当前管理员" });
      toast.success(`已确认告警「${record.title}」`);
    },
    [updateAlert],
  );

  const resolve = React.useCallback(
    (record: AlertRecord) => {
      updateAlert(record.id, { status: "resolved", resolvedAt: new Date().toISOString() });
      toast.success(`已标记告警「${record.title}」为已恢复`);
    },
    [updateAlert],
  );

  const confirmSilence = () => {
    if (!silenceTarget) return;
    const duration = SILENCE_DURATIONS.find((item) => item.value === silenceDuration);
    updateAlert(silenceTarget.id, { status: "silenced" });
    toast.success(`已静默「${silenceTarget.title}」${duration?.label ?? ""}`);
    setSilenceTarget(null);
  };

  const toggleRule = React.useCallback((rule: AlertRule, enabled: boolean) => {
    setRuleList((list) => list.map((item) => (item.id === rule.id ? { ...item, enabled } : item)));
    toast.success(enabled ? `已启用规则「${rule.name}」` : `已停用规则「${rule.name}」`);
  }, []);

  const submitRule = (values: RuleFormValues) => {
    if (editingRule) {
      setRuleList((list) =>
        list.map((item) => (item.id === editingRule.id ? { ...item, ...values } : item)),
      );
      toast.success(`已更新规则「${values.name}」`);
      setEditingRule(null);
      return;
    }
    const newRule: AlertRule = {
      id: `ar-${String(ruleList.length + 1).padStart(2, "0")}`,
      ...values,
      lastTriggeredAt: null,
      description: `${values.name}：当 ${values.condition} 持续 ${values.window} 触发。`,
    };
    setRuleList((list) => [newRule, ...list]);
    toast.success(`已创建规则「${values.name}」`);
    setRuleDialogOpen(false);
    ruleForm.reset();
  };

  const submitChannel = (values: ChannelFormValues) => {
    const newChannel: NotificationChannel = {
      id: `nc-${String(channelList.length + 1).padStart(2, "0")}`,
      name: values.name,
      type: values.type,
      target: values.target,
      status: "pending",
      enabled: true,
      subscribedEvents: values.subscribedEvents,
      updatedAt: new Date().toISOString(),
    };
    setChannelList((list) => [newChannel, ...list]);
    toast.success(`已创建通知渠道「${values.name}」，请完成验证`);
    setChannelDialogOpen(false);
    channelForm.reset();
  };

  const alertColumns = React.useMemo<ColumnDef<AlertRecord, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "标题",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[20rem]">
            <p className="truncate text-xs font-medium" title={row.original.title}>
              {row.original.title}
            </p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{ALERT_TYPE_LABEL[row.original.type]}</Badge>,
      },
      {
        id: "severity",
        accessorKey: "severity",
        header: "严重度",
        cell: ({ row }) => <RiskBadge risk={row.original.severity} />,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "source",
        accessorKey: "source",
        header: "来源",
        cell: ({ row }) => <span className="text-2xs">{row.original.source}</span>,
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs">{row.original.tenantName}</span>,
      },
      {
        id: "value",
        header: "当前值 / 阈值",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="num text-xs">
            {row.original.value}
            <span className="text-muted-foreground"> / {row.original.threshold}</span>
          </span>
        ),
      },
      {
        id: "triggeredAt",
        accessorKey: "triggeredAt",
        header: "触发时间",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">{formatRelativeTime(row.original.triggeredAt)}</span>
        ),
      },
      {
        id: "acknowledgedBy",
        accessorKey: "acknowledgedBy",
        header: "确认人",
        cell: ({ row }) => <span className="text-2xs">{row.original.acknowledgedBy ?? "—"}</span>,
      },
      {
        id: "channels",
        header: "通知渠道",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.channels.map((channel) => (
              <Badge key={channel} variant="outline">
                {channel}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailAlert(row.original)}
            extraItems={[
              { label: "确认告警", onSelect: () => acknowledge(row.original) },
              { label: "静默通知", onSelect: () => setSilenceTarget(row.original) },
              { label: "标记已解决", onSelect: () => resolve(row.original) },
            ]}
          />
        ),
      },
    ],
    [acknowledge, resolve],
  );

  const ruleColumns = React.useMemo<ColumnDef<AlertRule, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "规则名称",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.id}</p>
          </div>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{ALERT_TYPE_LABEL[row.original.type]}</Badge>,
      },
      {
        id: "condition",
        accessorKey: "condition",
        header: "条件",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{row.original.condition}</span>
        ),
      },
      {
        id: "threshold",
        accessorKey: "threshold",
        header: "阈值",
        cell: ({ row }) => <span className="num text-xs">{row.original.threshold}</span>,
      },
      {
        id: "window",
        accessorKey: "window",
        header: "窗口",
        cell: ({ row }) => <span className="num text-2xs">{row.original.window}</span>,
      },
      {
        id: "severity",
        accessorKey: "severity",
        header: "严重度",
        cell: ({ row }) => <RiskBadge risk={row.original.severity} />,
      },
      {
        id: "channels",
        header: "渠道",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.channels.map((channel) => (
              <Badge key={channel} variant="outline">
                {channel}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "enabled",
        accessorKey: "enabled",
        header: "状态",
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={(value) => toggleRule(row.original, value)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`切换规则 ${row.original.name}`}
          />
        ),
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "负责人",
        cell: ({ row }) => <span className="text-2xs">{row.original.owner}</span>,
      },
      {
        id: "lastTriggeredAt",
        accessorKey: "lastTriggeredAt",
        header: "最后触发",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {row.original.lastTriggeredAt ? formatRelativeTime(row.original.lastTriggeredAt) : "从未"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onEdit={() => setEditingRule(row.original)}
            onToggleStatus={() => toggleRule(row.original, !row.original.enabled)}
            statusActive={row.original.enabled}
            onDelete={() => setRuleDeleteTarget(row.original)}
          />
        ),
      },
    ],
    [toggleRule],
  );

  const channelColumns = React.useMemo<ColumnDef<NotificationChannel, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "名称",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{CHANNEL_TYPE_OPTIONS.find((item) => item.value === row.original.type)?.label ?? row.original.type}</Badge>,
      },
      {
        id: "target",
        accessorKey: "target",
        header: "目标",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs" title={row.original.target}>
            {truncate(row.original.target, 36)}
          </span>
        ),
      },
      {
        id: "subscribedEvents",
        header: "订阅事件",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.subscribedEvents.map((event) => (
              <Badge key={event} variant="outline">
                {event}
              </Badge>
            ))}
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
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.updatedAt, "yyyy-MM-dd HH:mm")}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            extraItems={[
              {
                label: "发送测试消息",
                onSelect: () => toast.success(`已向「${row.original.name}」发送测试消息`),
              },
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
        title="告警管理"
        description="统一管理告警事件、告警规则与通知渠道，支持确认、静默、解决与批量处置。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("已刷新告警状态（演示）")}
            >
              <BellRing />
              刷新
            </Button>
            <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
              <Plus />
              新建规则
            </Button>
          </>
        }
        badges={<Badge variant="danger">值班中</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="告警中" value={stats.firing} icon={Siren} tone="danger" hint="需要立即处置" />
        <StatCard label="已确认" value={stats.acknowledged} icon={CheckCheck} tone="info" />
        <StatCard label="已恢复" value={stats.resolved} icon={CircleCheck} tone="success" />
        <StatCard label="已静默" value={stats.silenced} icon={BellOff} tone="warning" />
        <StatCard label="严重告警" value={stats.critical} icon={TriangleAlert} tone="danger" />
        <StatCard label="今日新增" value={stats.today} icon={ShieldAlert} delta={12.4} invertDelta />
      </StatCardGrid>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">
            <Siren />
            告警列表
          </TabsTrigger>
          <TabsTrigger value="rules">
            <ShieldAlert />
            告警规则
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Send />
            通知渠道
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <FilterBar
            activeCount={
              [typeFilter, severityFilter, statusFilter, tenantFilter, sourceFilter].filter(
                (value) => value !== "all",
              ).length
            }
            onReset={() => {
              setTypeFilter("all");
              setSeverityFilter("all");
              setStatusFilter("all");
              setTenantFilter("all");
              setSourceFilter("all");
            }}
          >
            <FilterSelect label="类型" value={typeFilter} onChange={setTypeFilter} options={ALERT_TYPE_OPTIONS} />
            <FilterSelect
              label="严重度"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={SEVERITY_OPTIONS}
            />
            <FilterSelect
              label="状态"
              value={statusFilter}
              onChange={setStatusFilter}
              options={ALERT_STATUS_OPTIONS}
            />
            <FilterSelect
              label="租户"
              value={tenantFilter}
              onChange={setTenantFilter}
              options={tenantOptions}
            />
            <FilterSelect
              label="来源"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={sourceOptions}
            />
          </FilterBar>

          <DataTable
            columns={alertColumns}
            data={filteredAlerts}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索告警标题、来源、租户…"
            enableRowSelection
            onRowClick={(row) => setDetailAlert(row)}
            bulkActions={(rows, clear) => (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setAlertList((list) =>
                    list.map((record) =>
                      rows.some((row) => row.id === record.id)
                        ? { ...record, status: "acknowledged", acknowledgedBy: "当前管理员" }
                        : record,
                    ),
                  );
                  toast.success(`已批量确认 ${rows.length} 条告警`);
                  clear();
                }}
              >
                <CheckCheck />
                批量确认
              </Button>
            )}
            emptyTitle="没有符合条件的告警"
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-3">
          <DataTable
            columns={ruleColumns}
            data={ruleList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索规则名称、条件、负责人…"
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setRuleDialogOpen(true)}>
                <Plus />
                新建规则
              </Button>
            }
            emptyTitle="还没有告警规则"
          />
        </TabsContent>

        <TabsContent value="channels" className="space-y-3">
          <DataTable
            columns={channelColumns}
            data={channelList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索渠道名称、目标…"
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setChannelDialogOpen(true)}>
                <Plus />
                新建渠道
              </Button>
            }
            emptyTitle="还没有通知渠道"
          />
        </TabsContent>
      </Tabs>

      <DetailSheet
        open={detailAlert !== null}
        onOpenChange={(open) => {
          if (!open) setDetailAlert(null);
        }}
        title={detailAlert?.title ?? "告警详情"}
        description={detailAlert ? `${ALERT_TYPE_LABEL[detailAlert.type]} · ${detailAlert.source}` : undefined}
        footer={
          detailAlert ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setSilenceTarget(detailAlert)}>
                <BellOff />
                静默
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => acknowledge(detailAlert)}>
                  确认告警
                </Button>
                <Button size="sm" onClick={() => resolve(detailAlert)}>
                  标记已解决
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailAlert ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge risk={detailAlert.severity} />
              <StatusBadge status={detailAlert.status} />
              <Badge variant="secondary">{ALERT_TYPE_LABEL[detailAlert.type]}</Badge>
              <Badge variant="outline">{detailAlert.tenantName}</Badge>
            </div>

            <DetailSection title="告警描述">
              <p className="rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                {detailAlert.description}
              </p>
            </DetailSection>

            <DetailSection title="阈值与取值">
              <DetailGrid>
                <DetailRow label="当前值">
                  <span className="num">{detailAlert.value}</span>
                </DetailRow>
                <DetailRow label="阈值">
                  <span className="num">{detailAlert.threshold}</span>
                </DetailRow>
                <DetailRow label="Runbook 编号" mono>
                  {detailAlert.runbook}
                </DetailRow>
                <DetailRow label="触发时间">
                  <span className="num">{formatDate(detailAlert.triggeredAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="确认人">{detailAlert.acknowledgedBy ?? "—"}</DetailRow>
                <DetailRow label="恢复时间">
                  {detailAlert.resolvedAt ? formatDate(detailAlert.resolvedAt, "yyyy-MM-dd HH:mm") : "—"}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="处置时间线">
              <div className="space-y-2">
                {deriveAlertTimeline(detailAlert).map((node, index) => (
                  <div key={`${node.label}-${index}`} className="flex items-center gap-2">
                    <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                    <span className="flex-1 text-xs">{node.label}</span>
                    <span className="num text-muted-foreground text-2xs">
                      {formatDate(node.at, "MM-dd HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </DetailSection>

            <DetailSection title="通知渠道">
              <div className="flex flex-wrap gap-1">
                {detailAlert.channels.map((channel) => (
                  <Badge key={channel} variant="outline">
                    {channel}
                  </Badge>
                ))}
              </div>
            </DetailSection>

            <Alert variant={detailAlert.severity === "critical" ? "destructive" : "warning"}>
              <TriangleAlert />
              <AlertTitle>处置建议</AlertTitle>
              <AlertDescription>
                参照 Runbook {detailAlert.runbook} 执行处置；若 30 分钟内未恢复，请升级至 SRE 值班主管并同步租户。
              </AlertDescription>
            </Alert>
          </>
        ) : null}
      </DetailSheet>

      <Dialog open={ruleDialogOpen || editingRule !== null} onOpenChange={(open) => {
        if (!open) {
          setRuleDialogOpen(false);
          setEditingRule(null);
        }
      }}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? `编辑规则 · ${editingRule.name}` : "新建告警规则"}</DialogTitle>
            <DialogDescription>规则仅在本地生效，用于演示配置与通知渠道的组合方式。</DialogDescription>
          </DialogHeader>
          <Form {...ruleForm}>
            <form onSubmit={ruleForm.handleSubmit(submitRule)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={ruleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>规则名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：单日成本超预算" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>告警类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ALERT_TYPE_OPTIONS.map((option) => (
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
                  control={ruleForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>触发条件</FormLabel>
                      <FormControl>
                        <Input placeholder="daily_cost > budget" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription>支持指标表达式，例如 p95_latency &gt; 1500ms。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>阈值</FormLabel>
                      <FormControl>
                        <Input placeholder="100% 预算" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="window"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>检测窗口</FormLabel>
                      <FormControl>
                        <Input placeholder="5m / 1h / 1d" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
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
                <FormField
                  control={ruleForm.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>负责人</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：孙晓" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ruleForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>启用状态</FormLabel>
                      <div className="flex h-9 items-center justify-between rounded-md border border-border px-3">
                        <span className="text-2xs text-muted-foreground">
                          {field.value ? "已启用" : "已停用"}
                        </span>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={ruleForm.control}
                name="channels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>通知渠道</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {NOTIFY_CHANNELS.map((channel) => {
                        const checked = field.value.includes(channel);
                        return (
                          <label
                            key={channel}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-2xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                field.onChange(
                                  value === true
                                    ? [...field.value, channel]
                                    : field.value.filter((item) => item !== channel),
                                )
                              }
                            />
                            {channel}
                          </label>
                        );
                      })}
                    </div>
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
                    setRuleDialogOpen(false);
                    setEditingRule(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingRule ? "保存修改" : "创建规则"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建通知渠道</DialogTitle>
            <DialogDescription>渠道创建后需发送测试消息完成验证，验证通过前不会参与告警分发。</DialogDescription>
          </DialogHeader>
          <Form {...channelForm}>
            <form onSubmit={channelForm.handleSubmit(submitChannel)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={channelForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>渠道名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：SRE 值班群" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={channelForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>渠道类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHANNEL_TYPE_OPTIONS.map((option) => (
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
                control={channelForm.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>推送目标</FormLabel>
                    <FormControl>
                      <Input placeholder="邮箱、Webhook URL 或群机器人地址" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={channelForm.control}
                name="subscribedEvents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>订阅事件</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {SUBSCRIBE_EVENTS.map((event) => {
                        const checked = field.value.includes(event);
                        return (
                          <label
                            key={event}
                            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-2xs"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                field.onChange(
                                  value === true
                                    ? [...field.value, event]
                                    : field.value.filter((item) => item !== event),
                                )
                              }
                            />
                            {event}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setChannelDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建渠道
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={silenceTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSilenceTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>静默告警</DialogTitle>
            <DialogDescription>
              在选定时间内停止「{silenceTarget?.title ?? ""}」的通知，指标仍会持续采集。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">静默时长</label>
            <Select value={silenceDuration} onValueChange={setSilenceDuration}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SILENCE_DURATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSilenceTarget(null)}>
              取消
            </Button>
            <Button size="sm" onClick={confirmSilence}>
              确认静默
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={ruleDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRuleDeleteTarget(null);
        }}
        title={`删除告警规则「${ruleDeleteTarget?.name ?? ""}」？`}
        description="删除后基于该规则的告警将不再触发，历史告警记录仍然保留。"
        confirmLabel="确认删除"
        onConfirm={() => {
          if (!ruleDeleteTarget) return;
          setRuleList((list) => list.filter((item) => item.id !== ruleDeleteTarget.id));
          toast.success(`已删除规则「${ruleDeleteTarget.name}」`);
          setRuleDeleteTarget(null);
        }}
      />
    </PageContainer>
  );
}
