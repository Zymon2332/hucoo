"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Download,
  Filter,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { Label } from "@/components/ui/label";
import { tenants as tenantSeed } from "@/lib/mock-data/tenants";
import { LABELS, label } from "@/lib/labels";
import type { Tenant, TenantStatus } from "@/types";
import { formatCompact, formatCompactCurrency, formatDate, formatNumber } from "@/lib/utils";

const tenantFormSchema = z.object({
  name: z.string().min(2, "租户名称至少 2 个字符").max(40, "租户名称过长"),
  slug: z
    .string()
    .min(2, "标识至少 2 个字符")
    .regex(/^[a-z0-9-]+$/, "标识只能包含小写字母、数字与连字符"),
  plan: z.enum(["free", "team", "business", "enterprise"]),
  status: z.enum(["active", "trial", "suspended", "expired", "provisioning"]),
  region: z.string().min(1, "请选择区域"),
  ownerName: z.string().min(2, "请填写负责人"),
  ownerEmail: z.string().email("请输入合法邮箱"),
  seats: z.coerce.number().int().min(1, "至少 1 个席位").max(5000, "席位过多"),
  allowCustomModels: z.boolean(),
  allowByok: z.boolean(),
  allowLocalModels: z.boolean(),
  allowSharedModels: z.boolean(),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

const PLAN_OPTIONS = Object.entries(LABELS)
  .filter(([key]) => ["free", "team", "business", "enterprise"].includes(key))
  .map(([value, labelText]) => ({ value, label: labelText }));

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "trial", label: "试用中" },
  { value: "suspended", label: "已暂停" },
  { value: "expired", label: "已过期" },
  { value: "provisioning", label: "开通中" },
];

const REGION_OPTIONS = [
  { value: "华东-上海", label: "华东-上海" },
  { value: "华北-北京", label: "华北-北京" },
  { value: "华南-深圳", label: "华南-深圳" },
  { value: "华东-杭州", label: "华东-杭州" },
  { value: "华中-武汉", label: "华中-武汉" },
];

export default function TenantsPage() {
  const [tenantList, setTenantList] = React.useState<Tenant[]>(tenantSeed);
  const [planFilter, setPlanFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [regionFilter, setRegionFilter] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailTenant, setDetailTenant] = React.useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = React.useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Tenant | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const filtered = React.useMemo(
    () =>
      tenantList.filter(
        (tenant) =>
          (planFilter === "all" || tenant.plan === planFilter) &&
          (statusFilter === "all" || tenant.status === statusFilter) &&
          (regionFilter === "all" || tenant.region === regionFilter),
      ),
    [tenantList, planFilter, statusFilter, regionFilter],
  );

  const activeFilterCount = [planFilter, statusFilter, regionFilter].filter(
    (value) => value !== "all",
  ).length;

  const stats = React.useMemo(() => {
    const total = tenantList.length;
    const active = tenantList.filter((tenant) => tenant.status === "active").length;
    const trial = tenantList.filter((tenant) => tenant.status === "trial").length;
    const risk = tenantList.filter(
      (tenant) => tenant.status === "suspended" || tenant.status === "expired",
    ).length;
    const users = tenantList.reduce((totalUsers, tenant) => totalUsers + tenant.userCount, 0);
    const cost = tenantList.reduce((totalCost, tenant) => totalCost + tenant.monthlyCost, 0);
    return { total, active, trial, risk, users, cost };
  }, [tenantList]);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      plan: "team",
      status: "trial",
      region: "华东-上海",
      ownerName: "",
      ownerEmail: "",
      seats: 20,
      allowCustomModels: false,
      allowByok: true,
      allowLocalModels: false,
      allowSharedModels: false,
    },
  });

  React.useEffect(() => {
    if (editingTenant) {
      form.reset({
        name: editingTenant.name,
        slug: editingTenant.slug,
        plan: editingTenant.plan,
        status: editingTenant.status,
        region: editingTenant.region,
        ownerName: editingTenant.ownerName,
        ownerEmail: editingTenant.ownerEmail,
        seats: editingTenant.seats,
        allowCustomModels: editingTenant.allowCustomModels,
        allowByok: editingTenant.allowByok,
        allowLocalModels: editingTenant.allowLocalModels,
        allowSharedModels: editingTenant.allowSharedModels,
      });
    } else {
      form.reset();
    }
  }, [editingTenant, form]);

  const onSubmit = (values: TenantFormValues) => {
    if (editingTenant) {
      setTenantList((list) =>
        list.map((tenant) => (tenant.id === editingTenant.id ? { ...tenant, ...values } : tenant)),
      );
      toast.success(`已更新租户「${values.name}」`);
      setEditingTenant(null);
      return;
    }

    const newTenant: Tenant = {
      id: `tn-${String(tenantList.length + 1).padStart(2, "0")}`,
      name: values.name,
      slug: values.slug,
      plan: values.plan,
      status: values.status,
      region: values.region,
      ownerName: values.ownerName,
      ownerEmail: values.ownerEmail,
      seats: values.seats,
      userCount: 1,
      projectCount: 0,
      agentCount: 0,
      monthlyCalls: 0,
      monthlyTokens: 0,
      monthlyCost: 0,
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
      ssoEnabled: false,
      allowCustomModels: values.allowCustomModels,
      allowByok: values.allowByok,
      allowLocalModels: values.allowLocalModels,
      allowSharedModels: values.allowSharedModels,
      tags: ["新建"],
      quota: {
        tokens: { used: 0, limit: 20_000_000, unit: "tokens" },
        calls: { used: 0, limit: 200_000, unit: "次" },
        storage: { used: 0, limit: 200, unit: "GB" },
        concurrency: { used: 0, limit: 20, unit: "并发" },
        cost: { used: 0, limit: 20_000, unit: "CNY" },
      },
    };

    setTenantList((list) => [newTenant, ...list]);
    toast.success(`已创建租户「${values.name}」并发送开通通知`);
    setCreateOpen(false);
    form.reset();
  };

  const toggleStatus = (tenant: Tenant) => {
    const next: TenantStatus = tenant.status === "suspended" ? "active" : "suspended";
    setTenantList((list) =>
      list.map((item) => (item.id === tenant.id ? { ...item, status: next } : item)),
    );
    toast.success(next === "suspended" ? `已暂停「${tenant.name}」` : `已恢复「${tenant.name}」`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    window.setTimeout(() => {
      setTenantList((list) => list.filter((tenant) => tenant.id !== deleteTarget.id));
      toast.success(`已删除租户「${deleteTarget.name}」`);
      setDeletePending(false);
      setDeleteTarget(null);
    }, 500);
  };

  const columns = React.useMemo<ColumnDef<Tenant, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "租户",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/tenants/${row.original.id}`}
              className="hover:text-primary text-xs font-medium transition-colors"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.name}
            </Link>
            <p className="text-muted-foreground font-mono text-2xs">{row.original.slug}</p>
          </div>
        ),
      },
      {
        id: "plan",
        accessorKey: "plan",
        header: "套餐",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.plan)}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "region",
        accessorKey: "region",
        header: "区域",
        cell: ({ row }) => <span className="text-2xs">{row.original.region}</span>,
      },
      {
        id: "ownerName",
        accessorKey: "ownerName",
        header: "负责人",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs">{row.original.ownerName}</p>
            <p className="text-muted-foreground truncate text-2xs">{row.original.ownerEmail}</p>
          </div>
        ),
      },
      {
        id: "userCount",
        accessorKey: "userCount",
        header: "成员",
        cell: ({ row }) => (
          <span className="num text-xs">
            {row.original.userCount} / {row.original.seats}
          </span>
        ),
      },
      {
        id: "monthlyCalls",
        accessorKey: "monthlyCalls",
        header: "月调用量",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.monthlyCalls)}</span>,
      },
      {
        id: "monthlyCost",
        accessorKey: "monthlyCost",
        header: "月成本",
        cell: ({ row }) => (
          <span className="num text-xs">{formatCompactCurrency(row.original.monthlyCost)}</span>
        ),
      },
      {
        id: "expiresAt",
        accessorKey: "expiresAt",
        header: "到期时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.expiresAt)}</span>
        ),
      },
      {
        id: "flags",
        header: "租户开关",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.allowCustomModels ? <Badge variant="outline">自定义</Badge> : null}
            {row.original.allowByok ? <Badge variant="outline">BYOK</Badge> : null}
            {row.original.allowLocalModels ? <Badge variant="outline">本地</Badge> : null}
            {row.original.allowSharedModels ? <Badge variant="outline">共享</Badge> : null}
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
            onView={() => setDetailTenant(row.original)}
            onEdit={() => setEditingTenant(row.original)}
            onDuplicate={() => {
              setTenantList((list) => [
                {
                  ...row.original,
                  id: `tn-${String(list.length + 1).padStart(2, "0")}`,
                  name: `${row.original.name}（副本）`,
                  slug: `${row.original.slug}-copy`,
                  status: "provisioning",
                  createdAt: new Date().toISOString(),
                },
                ...list,
              ]);
              toast.success("已复制租户配置");
            }}
            onToggleStatus={() => toggleStatus(row.original)}
            statusActive={row.original.status !== "suspended"}
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
        title="租户管理"
        description="管理租户的套餐、配额、功能开关与生命周期，支持批量操作与详情抽屉。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条租户数据（演示）`)}
            >
              <Download />
              导出
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              新建租户
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="租户总数" value={stats.total} icon={Building2} delta={3.2} />
        <StatCard label="正常租户" value={stats.active} icon={ShieldCheck} tone="success" hint="付费且在服务期内" />
        <StatCard label="试用中" value={stats.trial} icon={Filter} tone="info" hint="需要跟进转化" />
        <StatCard label="风险租户" value={stats.risk} icon={TriangleAlert} tone="danger" hint="已暂停或已过期" />
        <StatCard label="覆盖成员" value={stats.users} icon={Users} delta={5.8} />
        <StatCard
          label="月度成本"
          value={stats.cost}
          valueFormatter={(value) => formatCompactCurrency(value)}
          delta={-6.8}
          invertDelta
          tone="warning"
        />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setPlanFilter("all");
          setStatusFilter("all");
          setRegionFilter("all");
        }}
      >
        <FilterSelect label="套餐" value={planFilter} onChange={setPlanFilter} options={PLAN_OPTIONS} />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterSelect label="区域" value={regionFilter} onChange={setRegionFilter} options={REGION_OPTIONS} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索租户名称、标识、负责人…"
        enableRowSelection
        onRowClick={(row) => setDetailTenant(row)}
        bulkActions={(rows, clear) => (
          <>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                toast.success(`已批量发送续费提醒（${rows.length} 个租户）`);
                clear();
              }}
            >
              通知续费
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-destructive"
              onClick={() => {
                setTenantList((list) =>
                  list.map((tenant) =>
                    rows.some((row) => row.id === tenant.id)
                      ? { ...tenant, status: "suspended" }
                      : tenant,
                  ),
                );
                toast.success(`已暂停 ${rows.length} 个租户`);
                clear();
              }}
            >
              <Trash2 />
              批量暂停
            </Button>
          </>
        )}
        emptyTitle="没有符合条件的租户"
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            新建租户
          </Button>
        }
      />

      <Dialog
        open={createOpen || editingTenant !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingTenant(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTenant ? `编辑租户 · ${editingTenant.name}` : "新建租户"}</DialogTitle>
            <DialogDescription>
              表单仅保存在本地状态，用于演示管理端的创建与编辑流程。
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
                      <FormLabel>租户名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：云启科技" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>租户标识</FormLabel>
                      <FormControl>
                        <Input placeholder="cloudnova" {...field} />
                      </FormControl>
                      <FormDescription>用于子域名与 API 路径，创建后不建议修改。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>套餐</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLAN_OPTIONS.map((option) => (
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>状态</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
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
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>区域</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGION_OPTIONS.map((option) => (
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
                  name="seats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>席位数量</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>负责人</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：陈立" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>负责人邮箱</FormLabel>
                      <FormControl>
                        <Input placeholder="owner@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 rounded-md border border-border p-3">
                <div>
                  <p className="text-xs font-medium">租户级功能开关</p>
                  <p className="text-muted-foreground text-2xs">
                    关闭后该租户无法使用对应能力，已在运行的模型会进入只读状态。
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["allowCustomModels", "允许自定义模型"],
                      ["allowByok", "允许 BYOK"],
                      ["allowLocalModels", "允许本地模型"],
                      ["allowSharedModels", "允许共享模型"],
                    ] as const
                  ).map(([name, labelText]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <Label htmlFor={`switch-${name}`} className="text-xs font-normal">
                            {labelText}
                          </Label>
                          <Switch
                            id={`switch-${name}`}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingTenant(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingTenant ? "保存修改" : "创建租户"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailTenant !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTenant(null);
        }}
        title={detailTenant?.name ?? "租户详情"}
        description={detailTenant ? `${detailTenant.slug} · ${detailTenant.region}` : undefined}
        footer={
          detailTenant ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/tenants/${detailTenant.id}`}>打开完整详情页</Link>
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingTenant(detailTenant)}>
                  编辑
                </Button>
                <Button size="sm" onClick={() => toggleStatus(detailTenant)}>
                  {detailTenant.status === "suspended" ? "恢复服务" : "暂停服务"}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {detailTenant ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailTenant.status} />
              <Badge variant="secondary">{label(detailTenant.plan)}</Badge>
              {detailTenant.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <DetailSection title="基本信息">
              <DetailGrid>
                <DetailRow label="租户 ID" mono>
                  {detailTenant.id}
                </DetailRow>
                <DetailRow label="创建时间">{formatDate(detailTenant.createdAt, "yyyy-MM-dd HH:mm")}</DetailRow>
                <DetailRow label="负责人">
                  {detailTenant.ownerName}（{detailTenant.ownerEmail}）
                </DetailRow>
                <DetailRow label="到期时间">
                  <span className="num">{formatDate(detailTenant.expiresAt)}</span>
                </DetailRow>
                <DetailRow label="席位使用">
                  <span className="num">
                    {detailTenant.userCount} / {detailTenant.seats}
                  </span>
                </DetailRow>
                <DetailRow label="SSO">
                  {detailTenant.ssoEnabled ? "已启用" : "未启用"}
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="用量概览">
              <DetailGrid>
                <DetailRow label="月调用量">
                  <span className="num">{formatNumber(detailTenant.monthlyCalls)}</span>
                </DetailRow>
                <DetailRow label="月 Token">
                  <span className="num">{formatCompact(detailTenant.monthlyTokens)}</span>
                </DetailRow>
                <DetailRow label="月成本">
                  <span className="num">{formatCompactCurrency(detailTenant.monthlyCost)}</span>
                </DetailRow>
                <DetailRow label="项目 / Agent">
                  <span className="num">
                    {detailTenant.projectCount} / {detailTenant.agentCount}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="配额使用" description="超出配额后调用会被限流，并触发超支告警">
              <div className="space-y-3">
                {(
                  [
                    ["Token", detailTenant.quota.tokens],
                    ["调用次数", detailTenant.quota.calls],
                    ["存储", detailTenant.quota.storage],
                    ["并发", detailTenant.quota.concurrency],
                    ["成本", detailTenant.quota.cost],
                  ] as const
                ).map(([quotaLabel, bucket]) => {
                  const percent = Math.min(100, Math.round((bucket.used / bucket.limit) * 100));
                  return (
                    <div key={quotaLabel} className="space-y-1">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="text-muted-foreground">{quotaLabel}</span>
                        <span className="num">
                          {formatCompact(bucket.used)} / {formatCompact(bucket.limit)} {bucket.unit}
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className={
                            percent >= 90
                              ? "bg-red-500 h-full rounded-full"
                              : percent >= 70
                                ? "bg-amber-500 h-full rounded-full"
                                : "bg-emerald-500 h-full rounded-full"
                          }
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailSection>

            <DetailSection title="租户级功能开关">
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["允许自定义模型", detailTenant.allowCustomModels],
                    ["允许 BYOK", detailTenant.allowByok],
                    ["允许本地模型", detailTenant.allowLocalModels],
                    ["允许共享模型", detailTenant.allowSharedModels],
                  ] as const
                ).map(([flagLabel, enabled]) => (
                  <div
                    key={flagLabel}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                  >
                    {flagLabel}
                    <StatusBadge status={enabled ? "enabled" : "disabled"} />
                  </div>
                ))}
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除租户「${deleteTarget?.name ?? ""}」？`}
        description="删除后该租户的成员、项目、密钥与用量数据将进入 30 天回收站，期间可人工恢复。"
        confirmLabel="确认删除"
        loading={deletePending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
