"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Bell,
  Check,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  FileText,
  Plus,
  Receipt,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { billingPlans, budgetAlerts, invoices } from "@/lib/mock-data/finops";
import { tenants } from "@/lib/mock-data/tenants";
import { cn, formatCompact, formatCompactCurrency, formatCurrency, formatDate } from "@/lib/utils";
import { label } from "@/lib/labels";
import type { BillingPlan, BudgetAlert, Invoice } from "@/types";

const PERIOD_OPTIONS = [
  { value: "2026-08", label: "2026-08" },
  { value: "2026-07", label: "2026-07" },
];

const INVOICE_STATUS_OPTIONS = [
  { value: "paid", label: "已支付" },
  { value: "issued", label: "已开具" },
  { value: "overdue", label: "已逾期" },
  { value: "draft", label: "草稿" },
  { value: "void", label: "已作废" },
];

const METHOD_OPTIONS = [
  { value: "invoice", label: "对公转账" },
  { value: "card", label: "信用卡" },
  { value: "wire", label: "电汇" },
  { value: "alipay", label: "支付宝" },
  { value: "balance", label: "余额抵扣" },
];

const SCOPE_OPTIONS = [
  { value: "租户", label: "租户" },
  { value: "项目", label: "项目" },
  { value: "成本中心", label: "成本中心" },
];

const CHANNEL_OPTIONS = ["邮件", "飞书", "Slack", "Webhook"];

function periodBounds(period: string) {
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText ?? "2026");
  const month = Number(monthText ?? "1");
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${period}-01`, end: `${period}-${String(lastDay).padStart(2, "0")}` };
}

const invoiceSchema = z.object({
  tenantName: z.string().min(1, "请选择租户"),
  planId: z.string().min(1, "请选择套餐"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "请选择账期"),
  seats: z.coerce.number().int().min(1, "席位至少为 1").max(5000, "席位过多"),
  modelFees: z.coerce.number().min(0, "模型费不能为负"),
  byokFee: z.coerce.number().min(0, "BYOK 费用不能为负"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const priceSchema = z.object({
  pricePerSeat: z.coerce.number().min(0, "价格不能为负").max(100_000, "价格过高"),
});

type PriceFormValues = z.infer<typeof priceSchema>;

const alertSchema = z.object({
  scope: z.enum(["租户", "项目", "成本中心"]),
  scopeName: z.string().min(1, "请填写告警对象"),
  budget: z.coerce.number().min(1, "预算需大于 0"),
  threshold: z.coerce.number().min(1, "阈值需大于 0").max(100, "阈值不能超过 100"),
  channels: z.array(z.string()).min(1, "至少选择一个通知渠道"),
});

type AlertFormValues = z.infer<typeof alertSchema>;

export default function BillingPage() {
  const [invoiceList, setInvoiceList] = React.useState<Invoice[]>(invoices);
  const [planList, setPlanList] = React.useState<BillingPlan[]>(billingPlans);
  const [alertList, setAlertList] = React.useState<BudgetAlert[]>(budgetAlerts);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [planFilter, setPlanFilter] = React.useState("all");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [detailInvoice, setDetailInvoice] = React.useState<Invoice | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [markPaidTarget, setMarkPaidTarget] = React.useState<Invoice | null>(null);
  const [voidTarget, setVoidTarget] = React.useState<Invoice | null>(null);
  const [pending, setPending] = React.useState(false);
  const [priceTarget, setPriceTarget] = React.useState<BillingPlan | null>(null);
  const [alertOpen, setAlertOpen] = React.useState(false);

  const stats = React.useMemo(() => {
    const billable = invoiceList.filter((invoice) => invoice.status !== "draft" && invoice.status !== "void");
    const revenue = billable.reduce((total, invoice) => total + invoice.total, 0);
    const paid = invoiceList
      .filter((invoice) => invoice.status === "paid")
      .reduce((total, invoice) => total + invoice.total, 0);
    const pendingAmount = invoiceList
      .filter((invoice) => invoice.status === "issued")
      .reduce((total, invoice) => total + invoice.total, 0);
    const overdue = invoiceList
      .filter((invoice) => invoice.status === "overdue")
      .reduce((total, invoice) => total + invoice.total, 0);
    const renewing = new Set(
      billable.map((invoice) => invoice.tenantName),
    ).size;
    return { revenue, paid, pendingAmount, overdue, count: invoiceList.length, renewing };
  }, [invoiceList]);

  const planFilterOptions = React.useMemo(
    () => planList.map((plan) => ({ value: plan.name, label: plan.name })),
    [planList],
  );

  const filteredInvoices = React.useMemo(
    () =>
      invoiceList.filter(
        (invoice) =>
          (statusFilter === "all" || invoice.status === statusFilter) &&
          (planFilter === "all" || invoice.planName === planFilter) &&
          (methodFilter === "all" || invoice.method === methodFilter) &&
          (periodFilter === "all" || invoice.periodStart.slice(0, 7) === periodFilter),
      ),
    [invoiceList, statusFilter, planFilter, methodFilter, periodFilter],
  );

  const activeFilterCount = [statusFilter, planFilter, methodFilter, periodFilter].filter(
    (value) => value !== "all",
  ).length;

  const invoiceForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      tenantName: tenants[0]?.name ?? "",
      planId: billingPlans[1]?.id ?? billingPlans[0]?.id ?? "",
      period: "2026-08",
      seats: 20,
      modelFees: 12_000,
      byokFee: 0,
    },
  });

  const priceForm = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: { pricePerSeat: 0 },
  });

  React.useEffect(() => {
    if (priceTarget) {
      priceForm.reset({ pricePerSeat: priceTarget.pricePerSeat });
    }
  }, [priceTarget, priceForm]);

  const alertForm = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      scope: "成本中心",
      scopeName: "",
      budget: 100_000,
      threshold: 90,
      channels: ["邮件"],
    },
  });

  const onCreateInvoice = (values: InvoiceFormValues) => {
    const plan = planList.find((item) => item.id === values.planId);
    if (!plan) {
      toast.error("未找到所选套餐");
      return;
    }
    const bounds = periodBounds(values.period);
    const platformFee = values.seats * plan.pricePerSeat;
    const tax = Number(((platformFee + values.modelFees + values.byokFee) * 0.06).toFixed(2));
    const total = Number((platformFee + values.modelFees + values.byokFee + tax).toFixed(2));
    const issuedAt = new Date().toISOString();
    const newInvoice: Invoice = {
      id: `inv-${String(invoiceList.length + 1).padStart(2, "0")}`,
      number: `INV-${values.period}-${String(invoiceList.length + 1).padStart(4, "0")}`,
      tenantName: values.tenantName,
      planName: plan.name,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      seats: values.seats,
      platformFee,
      modelFees: values.modelFees,
      byokFee: values.byokFee,
      tax,
      total,
      currency: "CNY",
      status: "issued",
      method: "invoice",
      issuedAt,
      dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      paidAt: null,
    };
    setInvoiceList((list) => [newInvoice, ...list]);
    toast.success(`已开具发票 ${newInvoice.number}`);
    setCreateOpen(false);
    invoiceForm.reset();
  };

  const onAdjustPrice = (values: PriceFormValues) => {
    if (!priceTarget) return;
    setPlanList((list) =>
      list.map((plan) =>
        plan.id === priceTarget.id ? { ...plan, pricePerSeat: values.pricePerSeat } : plan,
      ),
    );
    toast.success(`已将「${priceTarget.name}」席位价格调整为 ${formatCurrency(values.pricePerSeat)}`);
    setPriceTarget(null);
  };

  const onToggleChannel = (channel: string, checked: boolean) => {
    const current = alertForm.getValues("channels");
    alertForm.setValue(
      "channels",
      checked ? [...current, channel] : current.filter((item) => item !== channel),
      { shouldValidate: true },
    );
  };

  const onCreateAlert = (values: AlertFormValues) => {
    const newAlert: BudgetAlert = {
      id: `ba-${String(alertList.length + 1).padStart(2, "0")}`,
      scope: values.scope,
      scopeName: values.scopeName,
      period: "2026-09",
      budget: values.budget,
      spent: 0,
      percent: 0,
      threshold: values.threshold,
      status: "normal",
      notifyChannels: values.channels,
    };
    setAlertList((list) => [newAlert, ...list]);
    toast.success(`已创建预算告警「${values.scopeName}」`);
    setAlertOpen(false);
    alertForm.reset();
  };

  const confirmMarkPaid = () => {
    if (!markPaidTarget) return;
    setPending(true);
    window.setTimeout(() => {
      setInvoiceList((list) =>
        list.map((invoice) =>
          invoice.id === markPaidTarget.id
            ? { ...invoice, status: "paid", paidAt: new Date().toISOString() }
            : invoice,
        ),
      );
      toast.success(`已将发票 ${markPaidTarget.number} 标记为已支付`);
      setPending(false);
      setMarkPaidTarget(null);
    }, 500);
  };

  const confirmVoid = () => {
    if (!voidTarget) return;
    setPending(true);
    window.setTimeout(() => {
      setInvoiceList((list) =>
        list.map((invoice) => (invoice.id === voidTarget.id ? { ...invoice, status: "void" } : invoice)),
      );
      toast.success(`已作废发票 ${voidTarget.number}`);
      setPending(false);
      setVoidTarget(null);
    }, 500);
  };

  const columns = React.useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      {
        id: "number",
        accessorKey: "number",
        header: "发票号",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.number}</span>,
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.tenantName}</span>,
      },
      {
        id: "planName",
        accessorKey: "planName",
        header: "套餐",
        cell: ({ row }) => <Badge variant="secondary">{row.original.planName}</Badge>,
      },
      {
        id: "period",
        header: "周期",
        accessorKey: "periodStart",
        cell: ({ row }) => (
          <span className="num text-2xs">
            {formatDate(row.original.periodStart)} ~ {formatDate(row.original.periodEnd)}
          </span>
        ),
      },
      {
        id: "seats",
        accessorKey: "seats",
        header: "席位",
        cell: ({ row }) => <span className="num text-xs">{row.original.seats}</span>,
      },
      {
        id: "platformFee",
        accessorKey: "platformFee",
        header: "平台费",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatCompactCurrency(row.original.platformFee)}</span>
        ),
      },
      {
        id: "modelFees",
        accessorKey: "modelFees",
        header: "模型费",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatCompactCurrency(row.original.modelFees)}</span>
        ),
      },
      {
        id: "byokFee",
        accessorKey: "byokFee",
        header: "BYOK 费",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatCompactCurrency(row.original.byokFee)}</span>
        ),
      },
      {
        id: "tax",
        accessorKey: "tax",
        header: "税额",
        cell: ({ row }) => <span className="num text-2xs">{formatCompactCurrency(row.original.tax)}</span>,
      },
      {
        id: "total",
        accessorKey: "total",
        header: "总额",
        cell: ({ row }) => (
          <span className="num text-xs font-semibold">{formatCompactCurrency(row.original.total)}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "method",
        accessorKey: "method",
        header: "支付方式",
        cell: ({ row }) => <span className="text-2xs">{label(row.original.method)}</span>,
      },
      {
        id: "dates",
        header: "开具 / 到期 / 支付",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="num text-2xs leading-5">
            <p>{formatDate(row.original.issuedAt)}</p>
            <p className="text-muted-foreground">
              {formatDate(row.original.dueAt)} → {row.original.paidAt ? formatDate(row.original.paidAt) : "未支付"}
            </p>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => {
          const invoice = row.original;
          const canMarkPaid = invoice.status !== "paid" && invoice.status !== "void";
          const canVoid = invoice.status !== "void" && invoice.status !== "paid";
          return (
            <RowActions
              viewLabel="查看发票"
              onView={() => setDetailInvoice(invoice)}
              extraItems={[
                ...(canMarkPaid
                  ? [{ label: "标记已支付", onSelect: () => setMarkPaidTarget(invoice) }]
                  : []),
                ...(canVoid
                  ? [{ label: "作废发票", destructive: true, onSelect: () => setVoidTarget(invoice) }]
                  : []),
              ]}
            />
          );
        },
      },
    ],
    [],
  );

  const alertColumns = React.useMemo<ColumnDef<BudgetAlert, unknown>[]>(
    () => [
      {
        id: "scope",
        accessorKey: "scope",
        header: "范围",
        cell: ({ row }) => <Badge variant="outline">{row.original.scope}</Badge>,
      },
      {
        id: "scopeName",
        accessorKey: "scopeName",
        header: "对象",
        cell: ({ row }) => <span className="text-xs">{row.original.scopeName}</span>,
      },
      {
        id: "budget",
        accessorKey: "budget",
        header: "预算",
        cell: ({ row }) => <span className="num text-xs">{formatCompactCurrency(row.original.budget)}</span>,
      },
      {
        id: "spent",
        accessorKey: "spent",
        header: "已用",
        cell: ({ row }) => <span className="num text-xs">{formatCompactCurrency(row.original.spent)}</span>,
      },
      {
        id: "percent",
        accessorKey: "percent",
        header: "使用率",
        cell: ({ row }) => (
          <div className="w-28 space-y-1">
            <span className="num text-2xs">{row.original.percent}%</span>
            <Progress
              value={Math.min(100, row.original.percent)}
              indicatorClassName={
                row.original.status === "exceeded"
                  ? "bg-red-500"
                  : row.original.status === "warning"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }
            />
          </div>
        ),
      },
      {
        id: "threshold",
        accessorKey: "threshold",
        header: "阈值",
        cell: ({ row }) => <span className="num text-xs">{row.original.threshold}%</span>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "notifyChannels",
        header: "通知渠道",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.notifyChannels.map((channel) => (
              <Badge key={channel} variant="outline">
                {channel}
              </Badge>
            ))}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="账单与套餐"
        description="管理发票开具与核销、套餐定价与包含量，以及预算告警规则。金额均为人民币，数据为本地演示数据。"
        badges={<Badge variant="info">月度结算</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filteredInvoices.length} 条发票记录（演示）`)}
            >
              <Download />
              导出账目
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus />
              开具发票
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="本月收入"
          value={stats.revenue}
          icon={CircleDollarSign}
          delta={9.4}
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="已支付"
          value={stats.paid}
          icon={Wallet}
          tone="success"
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="待收"
          value={stats.pendingAmount}
          icon={Clock}
          tone="info"
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard
          label="逾期"
          value={stats.overdue}
          icon={TriangleAlert}
          tone="danger"
          valueFormatter={(value) => formatCompactCurrency(value)}
        />
        <StatCard label="发票总数" value={stats.count} unit="张" icon={Receipt} />
        <StatCard label="续费租户" value={stats.renewing} unit="个" icon={Users} tone="success" />
      </StatCardGrid>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setStatusFilter("all");
          setPlanFilter("all");
          setMethodFilter("all");
          setPeriodFilter("all");
        }}
      >
        <FilterSelect
          label="状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={INVOICE_STATUS_OPTIONS}
        />
        <FilterSelect label="套餐" value={planFilter} onChange={setPlanFilter} options={planFilterOptions} />
        <FilterSelect label="支付方式" value={methodFilter} onChange={setMethodFilter} options={METHOD_OPTIONS} />
        <FilterSelect label="周期" value={periodFilter} onChange={setPeriodFilter} options={PERIOD_OPTIONS} />
      </FilterBar>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">发票</TabsTrigger>
          <TabsTrigger value="plans">套餐</TabsTrigger>
          <TabsTrigger value="alerts">预算告警</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <DataTable
            columns={columns}
            data={filteredInvoices}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索发票号、租户、套餐…"
            pageSize={10}
            onRowClick={(row) => setDetailInvoice(row)}
            emptyTitle="没有符合条件的发票"
          />
        </TabsContent>

        <TabsContent value="plans">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {planList.map((plan) => (
              <Card key={plan.id} className="gap-0 py-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <Badge variant="secondary" className="num">
                      {plan.tenantCount} 个租户
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display num text-2xl font-semibold">
                      {plan.pricePerSeat === 0 ? "免费" : formatCurrency(plan.pricePerSeat)}
                    </span>
                    {plan.pricePerSeat > 0 ? (
                      <span className="text-muted-foreground text-2xs">/席位/月</span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-2xs">
                    <div className="rounded-md border border-border p-2">
                      <p className="text-muted-foreground">包含 Token</p>
                      <p className="num mt-0.5 font-medium">{formatCompact(plan.includedTokens)}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-muted-foreground">包含调用</p>
                      <p className="num mt-0.5 font-medium">{formatCompact(plan.includedCalls)}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-muted-foreground">并发上限</p>
                      <p className="num mt-0.5 font-medium">{plan.concurrency}</p>
                    </div>
                    <div className="rounded-md border border-border p-2">
                      <p className="text-muted-foreground">超额单价</p>
                      <p className="num mt-0.5 font-medium">
                        ¥{plan.overagePricePer1kTokens.toFixed(3)}/千 Token
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-2xs">SLA：{plan.sla}</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-1.5 text-2xs leading-relaxed">
                        <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPriceTarget(plan)}>
                    调整价格
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-2xs">
              共 {alertList.length} 条预算告警规则，覆盖租户、项目与成本中心。
            </p>
            <Button size="sm" onClick={() => setAlertOpen(true)}>
              <Plus />
              新建告警
            </Button>
          </div>
          <DataTable
            columns={alertColumns}
            data={alertList}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索告警对象…"
            emptyTitle="暂无预算告警"
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            invoiceForm.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>开具发票</DialogTitle>
            <DialogDescription>按席位与调用量生成月度发票，平台费随套餐单价自动计算。</DialogDescription>
          </DialogHeader>
          <Form {...invoiceForm}>
            <form onSubmit={invoiceForm.handleSubmit(onCreateInvoice)} className="space-y-4">
              <FormField
                control={invoiceForm.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>租户</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择租户" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.name}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={invoiceForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>套餐</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择套餐" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {planList.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={invoiceForm.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账期</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="选择账期" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((option) => (
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
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={invoiceForm.control}
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
                <div />
                <FormField
                  control={invoiceForm.control}
                  name="modelFees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>模型费（元）</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={invoiceForm.control}
                  name="byokFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BYOK 管理费（元）</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription>税额按 6% 增值税率自动计算，生成后可在详情中核对。</FormDescription>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <FileText />
                  生成发票
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={priceTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPriceTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调整套餐价格</DialogTitle>
            <DialogDescription>
              {priceTarget ? `${priceTarget.name} · 当前 ${formatCurrency(priceTarget.pricePerSeat)}/席位/月` : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...priceForm}>
            <form onSubmit={priceForm.handleSubmit(onAdjustPrice)} className="space-y-4">
              <FormField
                control={priceForm.control}
                name="pricePerSeat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>席位单价（元/月）</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>调整后仅影响后续开具的发票，历史账单不变。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setPriceTarget(null)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  保存价格
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={alertOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAlertOpen(false);
            alertForm.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建预算告警</DialogTitle>
            <DialogDescription>当用量达到阈值时通过所选渠道通知负责人。</DialogDescription>
          </DialogHeader>
          <Form {...alertForm}>
            <form onSubmit={alertForm.handleSubmit(onCreateAlert)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={alertForm.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>告警范围</FormLabel>
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
                  control={alertForm.control}
                  name="scopeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>告警对象</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：算法部成本中心" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={alertForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>预算（元）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={alertForm.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>阈值（%）</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={alertForm.control}
                name="channels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>通知渠道</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {CHANNEL_OPTIONS.map((channel) => {
                        const active = field.value.includes(channel);
                        return (
                          <Button
                            key={channel}
                            type="button"
                            variant={active ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => onToggleChannel(channel, !active)}
                          >
                            {active ? <Check /> : null}
                            {channel}
                          </Button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setAlertOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  <Bell />
                  创建告警
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailInvoice !== null}
        onOpenChange={(open) => {
          if (!open) setDetailInvoice(null);
        }}
        title={detailInvoice?.number ?? "发票详情"}
        description={detailInvoice ? `${detailInvoice.tenantName} · ${detailInvoice.planName}` : undefined}
        footer={
          detailInvoice ? (
            <div className="flex items-center justify-between">
              <StatusBadge status={detailInvoice.status} />
              <div className="flex items-center gap-2">
                {detailInvoice.status !== "paid" && detailInvoice.status !== "void" ? (
                  <Button variant="outline" size="sm" onClick={() => setMarkPaidTarget(detailInvoice)}>
                    标记已支付
                  </Button>
                ) : null}
                {detailInvoice.status !== "void" && detailInvoice.status !== "paid" ? (
                  <Button variant="destructive" size="sm" onClick={() => setVoidTarget(detailInvoice)}>
                    作废
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      >
        {detailInvoice ? (
          <>
            <DetailSection title="账单信息">
              <DetailGrid>
                <DetailRow label="发票号" mono>
                  {detailInvoice.number}
                </DetailRow>
                <DetailRow label="租户">{detailInvoice.tenantName}</DetailRow>
                <DetailRow label="套餐">{detailInvoice.planName}</DetailRow>
                <DetailRow label="支付方式">{label(detailInvoice.method)}</DetailRow>
                <DetailRow label="账期">
                  <span className="num">
                    {detailInvoice.periodStart} ~ {detailInvoice.periodEnd}
                  </span>
                </DetailRow>
                <DetailRow label="席位">
                  <span className="num">{detailInvoice.seats}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="费用明细" description="平台费 + 模型费 + BYOK 管理费 + 税额 = 总额">
              <div className="space-y-1">
                <DetailRow label="平台费">
                  <span className="num">{formatCurrency(detailInvoice.platformFee)}</span>
                </DetailRow>
                <DetailRow label="模型费">
                  <span className="num">{formatCurrency(detailInvoice.modelFees)}</span>
                </DetailRow>
                <DetailRow label="BYOK 管理费">
                  <span className="num">{formatCurrency(detailInvoice.byokFee)}</span>
                </DetailRow>
                <DetailRow label="税额">
                  <span className="num">{formatCurrency(detailInvoice.tax)}</span>
                </DetailRow>
                <DetailRow label="总额">
                  <span className="num font-semibold">{formatCurrency(detailInvoice.total)}</span>
                </DetailRow>
              </div>
            </DetailSection>

            {(() => {
              const subtotal =
                detailInvoice.platformFee + detailInvoice.modelFees + detailInvoice.byokFee;
              const expectedTax = Number((subtotal * 0.06).toFixed(2));
              const consistent =
                Math.abs(expectedTax - detailInvoice.tax) < 0.01 &&
                Math.abs(subtotal + detailInvoice.tax - detailInvoice.total) < 0.01;
              return (
                <DetailSection title="合计校验">
                  <Badge variant={consistent ? "success" : "danger"}>
                    {consistent ? "费用合计一致" : "费用合计存在偏差"}
                  </Badge>
                </DetailSection>
              );
            })()}

            <DetailSection title="时间线">
              <DetailGrid>
                <DetailRow label="开具时间">
                  <span className="num">{formatDate(detailInvoice.issuedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="到期时间">
                  <span className="num">{formatDate(detailInvoice.dueAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="支付时间">
                  <span className="num">
                    {detailInvoice.paidAt ? formatDate(detailInvoice.paidAt, "yyyy-MM-dd HH:mm") : "未支付"}
                  </span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={markPaidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMarkPaidTarget(null);
        }}
        title={`将发票 ${markPaidTarget?.number ?? ""} 标记为已支付？`}
        description="标记后该发票不再计入待收与逾期金额，可在详情中查看支付时间。"
        confirmLabel="确认已支付"
        variant="default"
        loading={pending}
        onConfirm={confirmMarkPaid}
      />

      <ConfirmDialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        title={`作废发票 ${voidTarget?.number ?? ""}？`}
        description="作废后发票不可恢复，也不再计入收入与应收统计。"
        confirmLabel="确认作废"
        loading={pending}
        onConfirm={confirmVoid}
      />

      <div className={cn("text-muted-foreground flex items-center gap-1.5 text-2xs")}>
        <CreditCard className="size-3.5" />
        <span>发票与套餐数据均为本地演示数据，不产生真实扣款。</span>
      </div>
    </PageContainer>
  );
}
