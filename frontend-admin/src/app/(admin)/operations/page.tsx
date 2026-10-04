"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BadgePercent,
  Bell,
  Flag,
  Gift,
  Megaphone,
  Plus,
  Sparkles,
  Store,
  Ticket,
  TicketCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { RiskBadge, StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { marketListings as listingSeed } from "@/lib/mock-data/capability";
import { tenants } from "@/lib/mock-data/tenants";
import { formatCompact, formatDate, formatNumber } from "@/lib/utils";
import type { MarketListing } from "@/types";

type AnnouncementPosition = "home-banner" | "console-top" | "login";
type AnnouncementStatus = "published" | "draft";

interface Announcement {
  id: string;
  title: string;
  content: string;
  position: AnnouncementPosition;
  status: AnnouncementStatus;
  startAt: string;
  endAt: string;
  views: number;
}

type TicketType = "consult" | "incident" | "feature" | "complaint";
type TicketPriority = "low" | "medium" | "high" | "critical";
type TicketStatus = "open" | "in-progress" | "resolved";

interface TicketMessage {
  from: string;
  text: string;
  at: string;
}

interface Ticket {
  id: string;
  code: string;
  tenantName: string;
  type: TicketType;
  priority: TicketPriority;
  title: string;
  status: TicketStatus;
  owner: string;
  createdAt: string;
  messages: TicketMessage[];
}

type CouponType = "reduce" | "discount" | "tokens";

interface Coupon {
  id: string;
  name: string;
  type: CouponType;
  amount: number;
  expiresAt: string;
  used: number;
  total: number;
  status: "active" | "expired";
}

const POSITION_LABEL: Record<AnnouncementPosition, string> = {
  "home-banner": "首页横幅",
  "console-top": "控制台顶部",
  login: "登录页",
};

const POSITION_OPTIONS = Object.entries(POSITION_LABEL).map(([value, text]) => ({ value, label: text }));

const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  consult: "咨询",
  incident: "故障",
  feature: "需求",
  complaint: "投诉",
};

const TICKET_TYPE_OPTIONS = Object.entries(TICKET_TYPE_LABEL).map(([value, text]) => ({ value, label: text }));

const TICKET_PRIORITY_OPTIONS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
  { value: "critical", label: "紧急" },
];

const TICKET_STATUS_OPTIONS = [
  { value: "open", label: "待处理" },
  { value: "in-progress", label: "处理中" },
  { value: "resolved", label: "已解决" },
];

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  reduce: "满减",
  discount: "折扣",
  tokens: "赠送 Token",
};

const COUPON_TYPE_OPTIONS = Object.entries(COUPON_TYPE_LABEL).map(([value, text]) => ({ value, label: text }));

const ANNOUNCEMENT_SEED: Announcement[] = [
  { id: "anno-01", title: "模型网关 v2.15 升级公告", content: "本周六 02:00-04:00 进行网关升级，期间可能短暂出现 502。", position: "console-top", status: "published", startAt: "2026-09-15", endAt: "2026-09-30", views: 12_684 },
  { id: "anno-02", title: "新用户首月 8 折优惠", content: "活动期间新注册租户可享首月 8 折，自动发放至账户。", position: "home-banner", status: "published", startAt: "2026-09-01", endAt: "2026-09-30", views: 42_180 },
  { id: "anno-03", title: "国庆假期值班安排", content: "假期期间值班响应由 15 分钟调整为 30 分钟。", position: "login", status: "draft", startAt: "2026-10-01", endAt: "2026-10-07", views: 0 },
  { id: "anno-04", title: "BYOK 密钥轮换提醒", content: "请于 9 月 30 日前完成生产密钥轮换。", position: "console-top", status: "published", startAt: "2026-09-10", endAt: "2026-09-30", views: 8_420 },
];

const TICKET_SEED: Ticket[] = [
  {
    id: "tk-01",
    code: "TK-20260917-001",
    tenantName: "云启科技",
    type: "incident",
    priority: "high",
    title: "模型路由偶发 502 错误",
    status: "in-progress",
    owner: "孙晓",
    createdAt: "2026-09-17T09:12:00+08:00",
    messages: [
      { from: "云启科技 · 张伟", text: "上午高峰期调用 claude 模型偶发 502，请协助排查。", at: "2026-09-17T09:12:00+08:00" },
      { from: "值班 · 孙晓", text: "已定位到海外出口抖动，正在切换备用路由。", at: "2026-09-17T09:40:00+08:00" },
    ],
  },
  {
    id: "tk-02",
    code: "TK-20260916-014",
    tenantName: "星辰银行",
    type: "consult",
    priority: "low",
    title: "私有化部署 License 如何扩容节点",
    status: "open",
    owner: "陈立",
    createdAt: "2026-09-16T15:30:00+08:00",
    messages: [
      { from: "星辰银行 · 刘敏", text: "明年计划扩容到 24 个节点，License 需要重新采购吗？", at: "2026-09-16T15:30:00+08:00" },
    ],
  },
  {
    id: "tk-03",
    code: "TK-20260915-009",
    tenantName: "蓝鲸零售",
    type: "feature",
    priority: "medium",
    title: "希望支持按项目维度导出用量",
    status: "open",
    owner: "宋茜",
    createdAt: "2026-09-15T11:05:00+08:00",
    messages: [
      { from: "蓝鲸零售 · 王磊", text: "财务要求按项目拆分账单，目前只能按租户导出。", at: "2026-09-15T11:05:00+08:00" },
    ],
  },
  {
    id: "tk-04",
    code: "TK-20260914-021",
    tenantName: "光年出行",
    type: "complaint",
    priority: "high",
    title: "配额告警通知不及时",
    status: "resolved",
    owner: "许安",
    createdAt: "2026-09-14T08:20:00+08:00",
    messages: [
      { from: "光年出行 · 赵琪", text: "配额已用 95% 才收到告警，希望提前到 80%。", at: "2026-09-14T08:20:00+08:00" },
      { from: "值班 · 许安", text: "已为该租户单独将阈值调整为 80%，并加短信通道。", at: "2026-09-14T10:05:00+08:00" },
    ],
  },
];

const COUPON_SEED: Coupon[] = [
  { id: "cp-01", name: "新租户首月 8 折", type: "discount", amount: 8, expiresAt: "2026-12-31", used: 128, total: 500, status: "active" },
  { id: "cp-02", name: "满 5000 减 800", type: "reduce", amount: 800, expiresAt: "2026-10-31", used: 42, total: 200, status: "active" },
  { id: "cp-03", name: "赠送 100 万 Token", type: "tokens", amount: 1_000_000, expiresAt: "2026-09-30", used: 316, total: 316, status: "expired" },
  { id: "cp-04", name: "企业版续费 9 折", type: "discount", amount: 9, expiresAt: "2026-12-31", used: 18, total: 100, status: "active" },
];

const announcementSchema = z
  .object({
    title: z.string().min(2, "标题至少 2 个字符").max(50, "标题过长"),
    content: z.string().min(2, "请填写公告内容"),
    position: z.enum(["home-banner", "console-top", "login"]),
    startAt: z.string().min(1, "请选择开始时间"),
    endAt: z.string().min(1, "请选择结束时间"),
    enabled: z.boolean(),
  })
  .refine((values) => values.endAt >= values.startAt, {
    message: "结束时间需晚于开始时间",
    path: ["endAt"],
  });

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

const ticketSchema = z.object({
  tenantName: z.string().min(1, "请选择租户"),
  type: z.enum(["consult", "incident", "feature", "complaint"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  title: z.string().min(2, "标题至少 2 个字符").max(60, "标题过长"),
  owner: z.string().min(1, "请填写负责人"),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

const couponSchema = z.object({
  name: z.string().min(2, "名称至少 2 个字符").max(40, "名称过长"),
  type: z.enum(["reduce", "discount", "tokens"]),
  amount: z.coerce.number().min(0, "额度不能为负"),
  expiresAt: z.string().min(1, "请选择有效期"),
  total: z.coerce.number().int().min(1, "总量至少为 1"),
});

type CouponFormValues = z.infer<typeof couponSchema>;

function formatCouponAmount(coupon: Pick<Coupon, "type" | "amount">) {
  if (coupon.type === "reduce") return `¥${formatNumber(coupon.amount)}`;
  if (coupon.type === "discount") return `${coupon.amount} 折`;
  return `${formatCompact(coupon.amount)} Token`;
}

export default function OperationsPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>(ANNOUNCEMENT_SEED);
  const [tickets, setTickets] = React.useState<Ticket[]>(TICKET_SEED);
  const [coupons, setCoupons] = React.useState<Coupon[]>(COUPON_SEED);
  const [listings, setListings] = React.useState<MarketListing[]>(listingSeed);

  const [announcementDialogOpen, setAnnouncementDialogOpen] = React.useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = React.useState<Announcement | null>(null);
  const [deleteAnnouncement, setDeleteAnnouncement] = React.useState<Announcement | null>(null);

  const [ticketStatusFilter, setTicketStatusFilter] = React.useState("all");
  const [ticketTypeFilter, setTicketTypeFilter] = React.useState("all");
  const [detailTicket, setDetailTicket] = React.useState<Ticket | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = React.useState(false);
  const [closeTicketTarget, setCloseTicketTarget] = React.useState<Ticket | null>(null);

  const [couponDialogOpen, setCouponDialogOpen] = React.useState(false);
  const [deleteCoupon, setDeleteCoupon] = React.useState<Coupon | null>(null);

  const [reportTarget, setReportTarget] = React.useState<MarketListing | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = React.useState(false);
  const [featureListing, setFeatureListing] = React.useState<string>("");
  const [featureRank, setFeatureRank] = React.useState("1");

  const announcementForm = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      position: "console-top",
      startAt: "2026-09-17",
      endAt: "2026-09-30",
      enabled: true,
    },
  });

  const ticketForm = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      tenantName: tenants[0]?.name ?? "云启科技",
      type: "consult",
      priority: "medium",
      title: "",
      owner: "孙晓",
    },
  });

  const couponForm = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: { name: "", type: "reduce", amount: 100, expiresAt: "2026-12-31", total: 100 },
  });

  React.useEffect(() => {
    if (editingAnnouncement) {
      announcementForm.reset({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        position: editingAnnouncement.position,
        startAt: editingAnnouncement.startAt,
        endAt: editingAnnouncement.endAt,
        enabled: editingAnnouncement.status === "published",
      });
    } else {
      announcementForm.reset({
        title: "",
        content: "",
        position: "console-top",
        startAt: "2026-09-17",
        endAt: "2026-09-30",
        enabled: true,
      });
    }
  }, [editingAnnouncement, announcementForm]);

  const topListings = React.useMemo(
    () => [...listings].sort((a, b) => b.trendScore - a.trendScore).slice(0, 5),
    [listings],
  );

  const reportListings = React.useMemo(() => listings.filter((listing) => listing.reports > 0), [listings]);

  const filteredTickets = React.useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          (ticketStatusFilter === "all" || ticket.status === ticketStatusFilter) &&
          (ticketTypeFilter === "all" || ticket.type === ticketTypeFilter),
      ),
    [tickets, ticketStatusFilter, ticketTypeFilter],
  );

  const stats = React.useMemo(() => {
    const published = announcements.filter((item) => item.status === "published").length;
    const openTickets = tickets.filter((ticket) => ticket.status !== "resolved").length;
    const activeCoupons = coupons.filter((coupon) => coupon.status === "active").length;
    const trialTenants = tenants.filter((tenant) => tenant.status === "trial").length;
    return {
      announcements: announcements.length,
      published,
      tickets: tickets.length,
      openTickets,
      activeCoupons,
      trialTenants,
    };
  }, [announcements, tickets, coupons]);

  const submitAnnouncement = (values: AnnouncementFormValues) => {
    if (editingAnnouncement) {
      setAnnouncements((list) =>
        list.map((item) =>
          item.id === editingAnnouncement.id
            ? {
                ...item,
                title: values.title,
                content: values.content,
                position: values.position,
                startAt: values.startAt,
                endAt: values.endAt,
                status: values.enabled ? "published" : "draft",
              }
            : item,
        ),
      );
      toast.success(`已更新公告「${values.title}」`);
      setEditingAnnouncement(null);
      return;
    }
    const newAnnouncement: Announcement = {
      id: `anno-${String(announcements.length + 1).padStart(2, "0")}`,
      title: values.title,
      content: values.content,
      position: values.position,
      status: values.enabled ? "published" : "draft",
      startAt: values.startAt,
      endAt: values.endAt,
      views: 0,
    };
    setAnnouncements((list) => [newAnnouncement, ...list]);
    toast.success(`已发布公告「${values.title}」`);
    setAnnouncementDialogOpen(false);
    announcementForm.reset();
  };

  const toggleAnnouncement = (announcement: Announcement) => {
    const nextStatus: AnnouncementStatus = announcement.status === "published" ? "draft" : "published";
    setAnnouncements((list) =>
      list.map((item) => (item.id === announcement.id ? { ...item, status: nextStatus } : item)),
    );
    toast.success(nextStatus === "published" ? `已上架「${announcement.title}」` : `已下架「${announcement.title}」`);
  };

  const submitTicket = (values: TicketFormValues) => {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: `tk-${String(tickets.length + 1).padStart(2, "0")}`,
      code: `TK-${formatDate(now, "yyyy-MM-dd").replace(/-/g, "")}-${String(tickets.length + 1).padStart(3, "0")}`,
      tenantName: values.tenantName,
      type: values.type,
      priority: values.priority,
      title: values.title,
      status: "open",
      owner: values.owner,
      createdAt: now,
      messages: [{ from: `${values.tenantName} · 租户`, text: values.title, at: now }],
    };
    setTickets((list) => [ticket, ...list]);
    toast.success(`已创建工单「${ticket.code}」`);
    setTicketDialogOpen(false);
    ticketForm.reset();
  };

  const submitCoupon = (values: CouponFormValues) => {
    const coupon: Coupon = {
      id: `cp-${String(coupons.length + 1).padStart(2, "0")}`,
      name: values.name,
      type: values.type,
      amount: values.amount,
      expiresAt: values.expiresAt,
      used: 0,
      total: values.total,
      status: "active",
    };
    setCoupons((list) => [coupon, ...list]);
    toast.success(`已创建优惠券「${values.name}」`);
    setCouponDialogOpen(false);
    couponForm.reset();
  };

  const announcementColumns = React.useMemo<ColumnDef<Announcement, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "标题",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[22rem]">
            <p className="truncate text-xs font-medium" title={row.original.title}>
              {row.original.title}
            </p>
            <p className="text-muted-foreground truncate text-2xs">{row.original.content}</p>
          </div>
        ),
      },
      {
        id: "position",
        accessorKey: "position",
        header: "位置",
        cell: ({ row }) => <Badge variant="secondary">{POSITION_LABEL[row.original.position]}</Badge>,
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} label={row.original.status === "published" ? "生效中" : "草稿"} />
        ),
      },
      {
        id: "startAt",
        accessorKey: "startAt",
        header: "开始时间",
        cell: ({ row }) => <span className="num text-2xs">{row.original.startAt}</span>,
      },
      {
        id: "endAt",
        accessorKey: "endAt",
        header: "结束时间",
        cell: ({ row }) => <span className="num text-2xs">{row.original.endAt}</span>,
      },
      {
        id: "views",
        accessorKey: "views",
        header: "阅读量",
        cell: ({ row }) => <span className="num text-xs">{formatNumber(row.original.views)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onEdit={() => setEditingAnnouncement(row.original)}
            onToggleStatus={() => toggleAnnouncement(row.original)}
            statusActive={row.original.status === "published"}
            onDelete={() => setDeleteAnnouncement(row.original)}
          />
        ),
      },
    ],
    [],
  );

  const ticketColumns = React.useMemo<ColumnDef<Ticket, unknown>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: "编号",
        cell: ({ row }) => <span className="font-mono text-2xs">{row.original.code}</span>,
      },
      {
        id: "tenantName",
        accessorKey: "tenantName",
        header: "租户",
        cell: ({ row }) => <span className="text-xs">{row.original.tenantName}</span>,
      },
      {
        id: "type",
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => <Badge variant="secondary">{TICKET_TYPE_LABEL[row.original.type]}</Badge>,
      },
      {
        id: "priority",
        accessorKey: "priority",
        header: "优先级",
        cell: ({ row }) => <RiskBadge risk={row.original.priority} />,
      },
      {
        id: "title",
        accessorKey: "title",
        header: "标题",
        cell: ({ row }) => (
          <p className="max-w-[20rem] truncate text-xs" title={row.original.title}>
            {row.original.title}
          </p>
        ),
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
        cell: ({ row }) => <span className="text-2xs">{row.original.owner}</span>,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "创建时间",
        cell: ({ row }) => (
          <span className="num text-2xs">{formatDate(row.original.createdAt, "MM-dd HH:mm")}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          <RowActions
            onView={() => setDetailTicket(row.original)}
            onDelete={() => setCloseTicketTarget(row.original)}
            extraItems={[
              {
                label: "标记处理中",
                onSelect: () => {
                  setTickets((list) =>
                    list.map((item) =>
                      item.id === row.original.id ? { ...item, status: "in-progress" } : item,
                    ),
                  );
                  toast.success(`工单「${row.original.code}」已进入处理中`);
                },
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const couponColumns = React.useMemo<ColumnDef<Coupon, unknown>[]>(
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
        cell: ({ row }) => <Badge variant="secondary">{COUPON_TYPE_LABEL[row.original.type]}</Badge>,
      },
      {
        id: "amount",
        header: "额度",
        enableSorting: false,
        cell: ({ row }) => <span className="num text-xs">{formatCouponAmount(row.original)}</span>,
      },
      {
        id: "expiresAt",
        accessorKey: "expiresAt",
        header: "有效期",
        cell: ({ row }) => <span className="num text-2xs">{row.original.expiresAt}</span>,
      },
      {
        id: "usage",
        header: "已用 / 总量",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="num text-xs">
            {formatNumber(row.original.used)} / {formatNumber(row.original.total)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            label={row.original.status === "active" ? "生效中" : "已过期"}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => <RowActions onDelete={() => setDeleteCoupon(row.original)} />,
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="运营中心"
        description="统一管理公告横幅、市场推荐、工单反馈与优惠试用策略。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.success("已推送运营日报（演示）")}>
              <Bell />
              推送日报
            </Button>
            <Button size="sm" onClick={() => setAnnouncementDialogOpen(true)}>
              <Plus />
              新建公告
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="公告总数" value={stats.announcements} icon={Megaphone} />
        <StatCard label="生效中" value={stats.published} icon={Sparkles} tone="success" />
        <StatCard label="工单总数" value={stats.tickets} icon={Ticket} />
        <StatCard label="待处理工单" value={stats.openTickets} icon={TicketCheck} tone="warning" />
        <StatCard label="生效优惠券" value={stats.activeCoupons} icon={Gift} tone="info" />
        <StatCard label="试用租户" value={stats.trialTenants} icon={TrendingUp} />
      </StatCardGrid>

      <Tabs defaultValue="announcements">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone />
            公告与横幅
          </TabsTrigger>
          <TabsTrigger value="market">
            <Store />
            市场运营
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket />
            工单与反馈
          </TabsTrigger>
          <TabsTrigger value="coupons">
            <Gift />
            优惠与试用
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-3">
          <DataTable
            columns={announcementColumns}
            data={announcements}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索公告标题、内容…"
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setAnnouncementDialogOpen(true)}>
                <Plus />
                新建公告
              </Button>
            }
            emptyTitle="还没有公告"
          />
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader title="推荐位与榜单" description="按热度评分排序的前 5 个 Agent 模板" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFeatureListing(topListings[0]?.id ?? "");
                setFeatureRank("1");
                setFeatureDialogOpen(true);
              }}
            >
              <Sparkles />
              调整推荐位
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {topListings.map((listing, index) => (
              <Card key={listing.id} className="gap-0 py-4">
                <CardContent className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{listing.name}</p>
                      <p className="text-muted-foreground text-2xs">{listing.publisher}</p>
                    </div>
                    <Badge variant={index === 0 ? "success" : "secondary"}>#{index + 1}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-2xs">
                    <div>
                      <p className="text-muted-foreground">热度</p>
                      <p className="num font-medium">{listing.trendScore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">安装</p>
                      <p className="num font-medium">{formatCompact(listing.installs)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">评分</p>
                      <p className="num font-medium">{listing.rating.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {listing.featured ? <Badge variant="info">已推荐</Badge> : null}
                    <Badge variant="outline">{listing.pricing === "paid" ? `¥${listing.price}` : "免费"}</Badge>
                    {listing.reports > 0 ? <Badge variant="danger">举报 {listing.reports}</Badge> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <SectionHeader title="举报处理" description={`${reportListings.length} 个模板存在待处理举报`} />
          <div className="space-y-2">
            {reportListings.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed border-border p-4 text-center text-2xs">
                暂无待处理举报。
              </p>
            ) : (
              reportListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{listing.name}</p>
                    <p className="text-muted-foreground text-2xs">
                      {listing.publisher} · {listing.reports} 条举报
                    </p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => setReportTarget(listing)}>
                    <Flag />
                    处理举报
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3">
          <FilterBar
            activeCount={[ticketStatusFilter, ticketTypeFilter].filter((value) => value !== "all").length}
            onReset={() => {
              setTicketStatusFilter("all");
              setTicketTypeFilter("all");
            }}
          >
            <FilterSelect
              label="状态"
              value={ticketStatusFilter}
              onChange={setTicketStatusFilter}
              options={TICKET_STATUS_OPTIONS}
            />
            <FilterSelect
              label="类型"
              value={ticketTypeFilter}
              onChange={setTicketTypeFilter}
              options={TICKET_TYPE_OPTIONS}
            />
          </FilterBar>

          <DataTable
            columns={ticketColumns}
            data={filteredTickets}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索工单编号、租户、标题…"
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setTicketDialogOpen(true)}>
                <Plus />
                新建工单
              </Button>
            }
            onRowClick={(row) => setDetailTicket(row)}
            emptyTitle="没有符合条件的工单"
          />
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <DataTable
            columns={couponColumns}
            data={coupons}
            getRowId={(row) => row.id}
            searchPlaceholder="搜索优惠券名称…"
            toolbar={
              <Button size="sm" variant="outline" onClick={() => setCouponDialogOpen(true)}>
                <Plus />
                新建优惠券
              </Button>
            }
            emptyTitle="还没有优惠券"
          />

          <div>
            <SectionHeader title="试用策略" description="新租户试用的默认额度、时长与转正规则" />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "试用时长", value: "14 天", hint: "到期后自动降级为免费版" },
                { title: "默认额度", value: "200 万 Token", hint: "含平台与自定义模型调用" },
                { title: "自动转正", value: "到期前 3 天提醒", hint: "支持一键升级为企业版" },
                { title: "并发上限", value: "20 并发", hint: "超出后进入排队队列" },
              ].map((item) => (
                <Card key={item.title} className="gap-0 py-4">
                  <CardContent className="space-y-1">
                    <p className="text-muted-foreground text-2xs">{item.title}</p>
                    <p className="font-display text-sm font-semibold">{item.value}</p>
                    <p className="text-muted-foreground text-2xs">{item.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DetailSheet
        open={detailTicket !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTicket(null);
        }}
        title={detailTicket?.title ?? "工单详情"}
        description={detailTicket ? `${detailTicket.code} · ${detailTicket.tenantName}` : undefined}
        footer={
          detailTicket ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(`已催办工单「${detailTicket.code}」`)}
              >
                <Bell />
                催办
              </Button>
              <Button size="sm" onClick={() => setCloseTicketTarget(detailTicket)}>
                关闭工单
              </Button>
            </div>
          ) : null
        }
      >
        {detailTicket ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailTicket.status} />
              <Badge variant="secondary">{TICKET_TYPE_LABEL[detailTicket.type]}</Badge>
              <RiskBadge risk={detailTicket.priority} />
            </div>

            <DetailSection title="工单信息">
              <DetailGrid>
                <DetailRow label="工单编号" mono>
                  {detailTicket.code}
                </DetailRow>
                <DetailRow label="租户">{detailTicket.tenantName}</DetailRow>
                <DetailRow label="负责人">{detailTicket.owner}</DetailRow>
                <DetailRow label="创建时间">
                  <span className="num">{formatDate(detailTicket.createdAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
                <DetailRow label="类型">{TICKET_TYPE_LABEL[detailTicket.type]}</DetailRow>
                <DetailRow label="优先级">{detailTicket.priority}</DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="对话时间线">
              <div className="space-y-3">
                {detailTicket.messages.map((message, index) => (
                  <div key={`${message.at}-${index}`} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{message.from}</p>
                      <span className="num text-muted-foreground text-2xs">
                        {formatDate(message.at, "MM-dd HH:mm")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{message.text}</p>
                  </div>
                ))}
              </div>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <Dialog
        open={announcementDialogOpen || editingAnnouncement !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAnnouncementDialogOpen(false);
            setEditingAnnouncement(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "编辑公告" : "新建公告"}</DialogTitle>
            <DialogDescription>公告与横幅仅保存在本地状态，用于演示运营配置流程。</DialogDescription>
          </DialogHeader>
          <Form {...announcementForm}>
            <form onSubmit={announcementForm.handleSubmit(submitAnnouncement)} className="space-y-4">
              <FormField
                control={announcementForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：模型网关升级公告" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={announcementForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>内容</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="填写公告正文…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={announcementForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>展示位置</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POSITION_OPTIONS.map((option) => (
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
                  control={announcementForm.control}
                  name="startAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开始时间</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={announcementForm.control}
                  name="endAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>结束时间</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={announcementForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <FormLabel className="text-xs">立即启用</FormLabel>
                        <FormDescription>关闭后保存为草稿，可稍后上架。</FormDescription>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAnnouncementDialogOpen(false);
                    setEditingAnnouncement(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingAnnouncement ? "保存修改" : "发布公告"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建工单</DialogTitle>
            <DialogDescription>创建后会自动分配给指定负责人并发送通知。</DialogDescription>
          </DialogHeader>
          <Form {...ticketForm}>
            <form onSubmit={ticketForm.handleSubmit(submitTicket)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={ticketForm.control}
                  name="tenantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>租户</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tenants.slice(0, 8).map((tenant) => (
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
                  control={ticketForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TICKET_TYPE_OPTIONS.map((option) => (
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
                  control={ticketForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TICKET_PRIORITY_OPTIONS.map((option) => (
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
                  control={ticketForm.control}
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
              </div>
              <FormField
                control={ticketForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="简要描述问题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setTicketDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建工单
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建优惠券</DialogTitle>
            <DialogDescription>优惠券创建后立即生效，可在租户账单中抵扣。</DialogDescription>
          </DialogHeader>
          <Form {...couponForm}>
            <form onSubmit={couponForm.handleSubmit(submitCoupon)} className="space-y-4">
              <FormField
                control={couponForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：满 5000 减 800" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={couponForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>类型</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUPON_TYPE_OPTIONS.map((option) => (
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
                  control={couponForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>额度</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormDescription>满减为金额，折扣为折数，Token 为数量。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={couponForm.control}
                  name="total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>发放总量</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={couponForm.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>有效期</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setCouponDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm">
                  创建优惠券
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调整推荐位</DialogTitle>
            <DialogDescription>推荐位会展示在市场首页与榜单顶部，调整后立即生效。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium">选择模板</p>
              <Select value={featureListing} onValueChange={setFeatureListing}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择模板" />
                </SelectTrigger>
                <SelectContent>
                  {topListings.map((listing) => (
                    <SelectItem key={listing.id} value={listing.id}>
                      {listing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium">推荐位次</p>
              <Select value={featureRank} onValueChange={setFeatureRank}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((rank) => (
                    <SelectItem key={rank} value={rank}>
                      第 {rank} 位
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFeatureDialogOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const listing = listings.find((item) => item.id === featureListing);
                toast.success(`已将「${listing?.name ?? "模板"}」调整为第 ${featureRank} 位推荐`);
                setFeatureDialogOpen(false);
              }}
            >
              保存调整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteAnnouncement !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAnnouncement(null);
        }}
        title={`删除公告「${deleteAnnouncement?.title ?? ""}」？`}
        description="删除后公告将立即从所有位置下架，阅读数据无法恢复。"
        confirmLabel="确认删除"
        onConfirm={() => {
          if (!deleteAnnouncement) return;
          setAnnouncements((list) => list.filter((item) => item.id !== deleteAnnouncement.id));
          toast.success(`已删除公告「${deleteAnnouncement.title}」`);
          setDeleteAnnouncement(null);
        }}
      />

      <ConfirmDialog
        open={closeTicketTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCloseTicketTarget(null);
        }}
        title={`关闭工单「${closeTicketTarget?.code ?? ""}」？`}
        description="关闭后租户将无法继续在该工单中回复，如有需要可重新创建工单。"
        confirmLabel="确认关闭"
        onConfirm={() => {
          if (!closeTicketTarget) return;
          setTickets((list) =>
            list.map((item) => (item.id === closeTicketTarget.id ? { ...item, status: "resolved" } : item)),
          );
          toast.success(`已关闭工单「${closeTicketTarget.code}」`);
          setCloseTicketTarget(null);
        }}
      />

      <ConfirmDialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null);
        }}
        title={`处理「${reportTarget?.name ?? ""}」的举报？`}
        description="确认后该模板的举报将标记为已处理，模板保持正常展示。"
        confirmLabel="标记已处理"
        variant="default"
        onConfirm={() => {
          if (!reportTarget) return;
          setListings((list) =>
            list.map((item) => (item.id === reportTarget.id ? { ...item, reports: 0 } : item)),
          );
          toast.success(`已完成「${reportTarget.name}」的举报处理`);
          setReportTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteCoupon !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCoupon(null);
        }}
        title={`删除优惠券「${deleteCoupon?.name ?? ""}」？`}
        description="删除后未使用的优惠券将失效，已核销部分不受影响。"
        confirmLabel="确认删除"
        onConfirm={() => {
          if (!deleteCoupon) return;
          setCoupons((list) => list.filter((item) => item.id !== deleteCoupon.id));
          toast.success(`已删除优惠券「${deleteCoupon.name}」`);
          setDeleteCoupon(null);
        }}
      />

      <div className="text-muted-foreground flex items-center gap-2 text-2xs">
        <BadgePercent className="size-3.5" />
        <span>运营数据均为本地静态演示数据，所有变更仅保存在当前页面。</span>
      </div>
    </PageContainer>
  );
}
