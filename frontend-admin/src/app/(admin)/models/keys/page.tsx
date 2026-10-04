"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  Clock,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { customModels, modelKeys } from "@/lib/mock-data/models";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { ModelKey } from "@/types";

const OWNER_TYPE_LABEL: Record<ModelKey["ownerType"], string> = {
  user: "个人",
  "service-account": "服务账号",
  tenant: "租户",
};

const OWNER_TYPE_OPTIONS = [
  { value: "user", label: "个人" },
  { value: "service-account", label: "服务账号" },
  { value: "tenant", label: "租户" },
];

const KEY_STATUS_OPTIONS = [
  { value: "active", label: "生效中" },
  { value: "rotating", label: "轮换中" },
  { value: "expiring", label: "即将过期" },
  { value: "revoked", label: "已撤销" },
  { value: "leaked", label: "疑似泄露" },
];

const ROTATE_WINDOWS = ["立即执行", "低峰期（次日 02:00）", "下次维护窗口"];

const rotateSchema = z.object({
  confirmed: z.boolean().refine((value) => value, "请确认已完成新密钥准备"),
  window: z.enum(["立即执行", "低峰期（次日 02:00）", "下次维护窗口"]),
});

type RotateFormValues = z.infer<typeof rotateSchema>;

const LEAK_STEPS = [
  "立即撤销疑似泄露的密钥，阻断后续调用。",
  "冻结关联服务账号并轮换全部同源密钥。",
  "拉取近 7 天访问日志，定位异常调用来源。",
  "通知租户负责人并提交安全事件报告。",
];

export default function ModelKeysPage() {
  const [keyList, setKeyList] = React.useState<ModelKey[]>(modelKeys);
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [detailKey, setDetailKey] = React.useState<ModelKey | null>(null);
  const [rotateTarget, setRotateTarget] = React.useState<ModelKey | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<ModelKey | null>(null);
  const [revokeText, setRevokeText] = React.useState("");
  const [revokePending, setRevokePending] = React.useState(false);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  const [offboardPerson, setOffboardPerson] = React.useState("");

  const providerOptions = React.useMemo(
    () =>
      Array.from(new Set(keyList.map((key) => key.provider))).map((value) => ({
        value,
        label: value,
      })),
    [keyList],
  );

  const tenantOptions = React.useMemo(
    () =>
      Array.from(new Set(keyList.map((key) => key.tenantName))).map((value) => ({
        value,
        label: value,
      })),
    [keyList],
  );

  const ownerOptions = React.useMemo(
    () =>
      Array.from(new Set(keyList.map((key) => key.owner))).map((value) => ({
        value,
        label: value,
      })),
    [keyList],
  );

  const filtered = React.useMemo(
    () =>
      keyList.filter(
        (key) =>
          (providerFilter === "all" || key.provider === providerFilter) &&
          (ownerTypeFilter === "all" || key.ownerType === ownerTypeFilter) &&
          (statusFilter === "all" || key.status === statusFilter) &&
          (tenantFilter === "all" || key.tenantName === tenantFilter),
      ),
    [keyList, providerFilter, ownerTypeFilter, statusFilter, tenantFilter],
  );

  const activeFilterCount = [providerFilter, ownerTypeFilter, statusFilter, tenantFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = keyList.length;
    const active = keyList.filter((key) => key.status === "active").length;
    const rotating = keyList.filter((key) => key.status === "rotating").length;
    const expiring = keyList.filter((key) => key.status === "expiring").length;
    const revoked = keyList.filter((key) => key.status === "revoked").length;
    const leaked = keyList.filter((key) => key.status === "leaked").length;
    return { total, active, rotating, expiring, revoked, leaked };
  }, [keyList]);

  const offboardKeys = React.useMemo(
    () => (offboardPerson ? keyList.filter((key) => key.owner === offboardPerson) : []),
    [keyList, offboardPerson],
  );

  const form = useForm<RotateFormValues>({
    resolver: zodResolver(rotateSchema),
    defaultValues: {
      confirmed: false,
      window: "立即执行",
    },
  });

  React.useEffect(() => {
    if (rotateTarget) {
      form.reset({ confirmed: false, window: "立即执行" });
    }
  }, [rotateTarget, form]);

  const onRotateSubmit = (values: RotateFormValues) => {
    if (!rotateTarget) return;
    setKeyList((list) =>
      list.map((key) =>
        key.id === rotateTarget.id
          ? { ...key, status: "rotating", rotatedAt: new Date().toISOString() }
          : key,
      ),
    );
    toast.success(`已提交「${rotateTarget.name}」的轮换任务（${values.window}）`);
    setRotateTarget(null);
  };

  const openRevoke = (key: ModelKey) => {
    setRevokeText("");
    setRevokeTarget(key);
  };

  const confirmRevoke = () => {
    if (!revokeTarget) return;
    if (revokeText.trim() !== revokeTarget.name) {
      toast.error("输入的密钥名称不匹配，请重新确认");
      return;
    }
    setRevokePending(true);
    window.setTimeout(() => {
      setKeyList((list) =>
        list.map((key) => (key.id === revokeTarget.id ? { ...key, status: "revoked" } : key)),
      );
      toast.success(`已撤销密钥「${revokeTarget.name}」`);
      setRevokePending(false);
      setRevokeTarget(null);
      setRevokeText("");
    }, 500);
  };

  const confirmOffboard = () => {
    if (offboardKeys.length === 0) {
      toast.error("请先选择离职人员");
      return;
    }
    const ids = new Set(offboardKeys.map((key) => key.id));
    setKeyList((list) =>
      list.map((key) => (ids.has(key.id) ? { ...key, status: "revoked" } : key)),
    );
    toast.success(`已回收 ${offboardPerson} 名下的 ${offboardKeys.length} 个密钥`);
    setOffboardOpen(false);
    setOffboardPerson("");
  };

  const columns: ColumnDef<ModelKey, unknown>[] = [
    {
      id: "name",
        accessorKey: "name",
        header: "名称",
        cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.name}</span>,
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: "供应商",
        cell: ({ row }) => <span className="text-2xs">{row.original.provider}</span>,
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: "归属",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.owner}</p>
            <p className="text-muted-foreground text-2xs">
              {OWNER_TYPE_LABEL[row.original.ownerType]}
            </p>
          </div>
        ),
      },
      {
        id: "fingerprint",
        accessorKey: "fingerprint",
        header: "指纹",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{row.original.fingerprint}</span>
        ),
      },
      {
        id: "algorithm",
        accessorKey: "algorithm",
        header: "算法",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{row.original.algorithm}</span>
        ),
      },
      {
        id: "custodian",
        accessorKey: "custodian",
        header: "托管人",
        cell: ({ row }) => <span className="text-2xs">{row.original.custodian}</span>,
      },
      {
        id: "kmsRef",
        accessorKey: "kmsRef",
        header: "KMS 引用",
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-2xs">{row.original.kmsRef}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "lifecycle",
        header: "创建 / 轮换 / 过期",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>{formatDate(row.original.createdAt)}</p>
            <p className="text-muted-foreground">
              {formatDate(row.original.rotatedAt)} → {formatDate(row.original.expiresAt)}
            </p>
          </div>
        ),
      },
      {
        id: "lastUsedAt",
        accessorKey: "lastUsedAt",
        header: "最后使用",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-2xs">
            {formatRelativeTime(row.original.lastUsedAt)}
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
            viewLabel="密钥详情"
            onView={() => setDetailKey(row.original)}
            extraItems={[
              { label: "轮换密钥", onSelect: () => setRotateTarget(row.original) },
              {
                label: "撤销密钥",
                destructive: true,
                onSelect: () => openRevoke(row.original),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="BYOK 密钥保险箱"
        description="集中托管租户与服务的 BYOK 密钥，管理轮换、过期与撤销，并支持泄露应急与离职回收。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条密钥台账（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setOffboardOpen(true)}>
              <UserMinus />
              离职回收
            </Button>
          </>
        }
        badges={<Badge variant="info">密文托管</Badge>}
      />

      <Alert variant="info">
        <Lock />
        <AlertTitle>平台仅存储密文与指纹，任何页面都不展示明文</AlertTitle>
        <AlertDescription>
          密钥以 AES-256-GCM 加密后写入 KMS，页面仅展示不可逆指纹用于核对与审计；平台运维人员无法读取明文。
        </AlertDescription>
      </Alert>

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="密钥总数" value={stats.total} icon={KeyRound} />
        <StatCard label="生效中" value={stats.active} icon={ShieldCheck} tone="success" />
        <StatCard label="轮换中" value={stats.rotating} icon={RefreshCw} tone="info" />
        <StatCard label="即将过期" value={stats.expiring} icon={Clock} tone="warning" />
        <StatCard label="已撤销" value={stats.revoked} icon={Ban} />
        <StatCard label="疑似泄露" value={stats.leaked} icon={ShieldAlert} tone="danger" />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setProviderFilter("all");
          setOwnerTypeFilter("all");
          setStatusFilter("all");
          setTenantFilter("all");
        }}
      >
        <FilterSelect
          label="供应商"
          value={providerFilter}
          onChange={setProviderFilter}
          options={providerOptions}
        />
        <FilterSelect
          label="归属类型"
          value={ownerTypeFilter}
          onChange={setOwnerTypeFilter}
          options={OWNER_TYPE_OPTIONS}
        />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={KEY_STATUS_OPTIONS} />
        <FilterSelect label="租户" value={tenantFilter} onChange={setTenantFilter} options={tenantOptions} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索密钥名称、托管人、KMS 引用…"
        onRowClick={(row) => setDetailKey(row)}
        emptyTitle="没有符合条件的密钥"
        emptyDescription="调整供应商、归属或状态筛选后重试。"
      />

      <section className="space-y-3">
        <SectionHeader
          title="泄露应急"
          description="密钥疑似泄露时的标准处置流程，建议在 15 分钟内完成前两步"
        />
        <Card className="gap-0 py-4">
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {LEAK_STEPS.map((step, index) => (
                <div key={step} className="rounded-md border border-border p-3">
                  <span className="num bg-destructive/10 text-destructive flex size-5 items-center justify-center rounded-full text-2xs font-semibold">
                    {index + 1}
                  </span>
                  <p className="mt-2 text-2xs leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => toast.success("已启动泄露应急流程并通知安全值班人员")}
            >
              <ShieldAlert />
              启动应急流程
            </Button>
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={rotateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRotateTarget(null);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>轮换密钥</DialogTitle>
            <DialogDescription>
              {rotateTarget ? `${rotateTarget.name} · ${rotateTarget.provider}` : ""}
            </DialogDescription>
          </DialogHeader>
          {rotateTarget ? (
            <div className="space-y-4">
              <Alert variant="info">
                <RefreshCw />
                <AlertTitle>新密钥来源</AlertTitle>
                <AlertDescription>
                  请在供应商侧生成新密钥后，通过「密钥保险箱 → 导入新密钥」上传；平台将自动完成灰度切换并保留旧密钥 30
                  分钟以消化在途请求。
                </AlertDescription>
              </Alert>
              <DetailGrid>
                <DetailRow label="当前指纹" mono>
                  {rotateTarget.fingerprint}
                </DetailRow>
                <DetailRow label="最近轮换">
                  <span className="num">{formatDate(rotateTarget.rotatedAt)}</span>
                </DetailRow>
                <DetailRow label="到期时间">
                  <span className="num">{formatDate(rotateTarget.expiresAt)}</span>
                </DetailRow>
                <DetailRow label="托管人">{rotateTarget.custodian}</DetailRow>
              </DetailGrid>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onRotateSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="window"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>轮换窗口</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROTATE_WINDOWS.map((option) => (
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
                    name="confirmed"
                    render={({ field }) => (
                      <FormItem>
                        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-2xs leading-relaxed">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                            className="mt-0.5"
                          />
                          <span>我已确认新密钥已在供应商侧生成并完成权限校验，同意开始轮换。</span>
                        </label>
                        <FormDescription>轮换期间新旧密钥将短暂并行。</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" size="sm" onClick={() => setRotateTarget(null)}>
                      取消
                    </Button>
                    <Button type="submit" size="sm">
                      <RefreshCw />
                      开始轮换
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            setRevokeText("");
          }
        }}
        title={`撤销密钥「${revokeTarget?.name ?? ""}」？`}
        confirmLabel="确认撤销"
        loading={revokePending}
        description={
          <div className="space-y-3">
            <p>
              撤销后密钥立即失效，使用它的调用会中断并回退到兜底模型，操作不可逆。
            </p>
            <Alert variant="destructive">
              <ShieldAlert />
              <AlertTitle>泄露应急提示</AlertTitle>
              <AlertDescription>
                若因泄露撤销，请同步冻结关联服务账号、拉取访问日志并通知租户负责人。
              </AlertDescription>
            </Alert>
            <div className="space-y-1.5">
              <p className="text-2xs font-medium">
                输入密钥名称 <span className="font-mono">{revokeTarget?.name}</span> 以确认
              </p>
              <Input
                value={revokeText}
                onChange={(event) => setRevokeText(event.target.value)}
                placeholder={revokeTarget?.name}
                autoComplete="off"
              />
            </div>
          </div>
        }
        onConfirm={confirmRevoke}
      />

      <Dialog
        open={offboardOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOffboardOpen(false);
            setOffboardPerson("");
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>离职人员密钥回收</DialogTitle>
            <DialogDescription>
              选择离职人员后，将列出其名下全部密钥并批量撤销，避免残留凭据继续调用。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium">离职人员</p>
              <Select value={offboardPerson} onValueChange={setOffboardPerson}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择离职人员" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {offboardPerson ? (
              offboardKeys.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-2xs">
                    共 {offboardKeys.length} 个密钥将被撤销
                  </p>
                  {offboardKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs">{key.name}</p>
                        <p className="text-muted-foreground text-2xs">
                          {key.provider} · {key.tenantName}
                        </p>
                      </div>
                      <StatusBadge status={key.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="success">
                  <ShieldCheck />
                  <AlertTitle>该人员名下没有密钥</AlertTitle>
                  <AlertDescription>无需回收，可直接关闭。</AlertDescription>
                </Alert>
              )
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOffboardOpen(false);
                  setOffboardPerson("");
                }}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={offboardKeys.length === 0}
                onClick={confirmOffboard}
              >
                <Ban />
                批量撤销
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailKey !== null}
        onOpenChange={(open) => {
          if (!open) setDetailKey(null);
        }}
        title={detailKey?.name ?? "密钥详情"}
        description={detailKey ? `${detailKey.provider} · ${detailKey.tenantName}` : undefined}
        footer={
          detailKey ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailKey.status} />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setRotateTarget(detailKey)}>
                  轮换
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openRevoke(detailKey)}>
                  撤销
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailKey ? (
          <>
            <Alert variant="info">
              <Lock />
              <AlertTitle>仅展示指纹，不展示明文</AlertTitle>
              <AlertDescription>
                指纹由密钥明文经 HMAC-SHA256 派生，可用于核对密钥是否一致，但无法反推明文。
              </AlertDescription>
            </Alert>

            <DetailSection title="密钥信息">
              <DetailGrid>
                <DetailRow label="名称" mono>
                  {detailKey.name}
                </DetailRow>
                <DetailRow label="供应商">{detailKey.provider}</DetailRow>
                <DetailRow label="归属">
                  {detailKey.owner}（{OWNER_TYPE_LABEL[detailKey.ownerType]}）
                </DetailRow>
                <DetailRow label="租户">{detailKey.tenantName}</DetailRow>
                <DetailRow label="指纹" mono>
                  {detailKey.fingerprint}
                </DetailRow>
                <DetailRow label="算法" mono>
                  {detailKey.algorithm}
                </DetailRow>
                <DetailRow label="托管人">{detailKey.custodian}</DetailRow>
                <DetailRow label="KMS 引用" mono>
                  {detailKey.kmsRef}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="生命周期">
              <DetailGrid>
                <DetailRow label="创建时间">
                  <span className="num">{formatDate(detailKey.createdAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="最近轮换">
                  <span className="num">{formatDate(detailKey.rotatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="到期时间">
                  <span className="num">{formatDate(detailKey.expiresAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="最后使用">
                  {formatRelativeTime(detailKey.lastUsedAt)}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="关联自定义模型">
              {customModels.filter((model) => model.keyFingerprint === detailKey.fingerprint).length ===
              0 ? (
                <p className="text-muted-foreground text-2xs">暂无自定义模型使用该指纹。</p>
              ) : (
                <div className="space-y-1.5">
                  {customModels
                    .filter((model) => model.keyFingerprint === detailKey.fingerprint)
                    .map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{model.name}</p>
                          <p className="text-muted-foreground text-2xs">{model.tenantName}</p>
                        </div>
                        <StatusBadge status={model.status} />
                      </div>
                    ))}
                </div>
              )}
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>
    </PageContainer>
  );
}
