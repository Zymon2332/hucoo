"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Clock,
  Download,
  Flag,
  PowerOff,
  Star,
  Store,
  Trophy,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { DataTable } from "@/components/common/data-table";
import { FilterBar, FilterSelect, FilterToggle } from "@/components/common/filter-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { RowActions } from "@/components/common/row-actions";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DetailGrid, DetailRow, DetailSection, DetailSheet } from "@/components/common/detail-sheet";
import { marketListings as listingSeed } from "@/lib/mock-data/capability";
import { label } from "@/lib/labels";
import { formatCompact, formatDate, formatNumber } from "@/lib/utils";
import type { MarketListing } from "@/types";

const PRICING_LABEL: Record<MarketListing["pricing"], string> = {
  free: "免费",
  paid: "付费",
  internal: "内部",
};

const CATEGORY_OPTIONS = [
  { value: "coding", label: "编码" },
  { value: "review", label: "代码审查" },
  { value: "testing", label: "测试" },
  { value: "ops", label: "运维" },
  { value: "data", label: "数据分析" },
  { value: "writing", label: "文档写作" },
  { value: "support", label: "客户支持" },
];

const PRICING_OPTIONS = [
  { value: "free", label: "免费" },
  { value: "paid", label: "付费" },
  { value: "internal", label: "内部" },
];

const STATUS_OPTIONS = [
  { value: "listed", label: "已上架" },
  { value: "pending", label: "待审核" },
  { value: "removed", label: "已下架" },
];

export default function AgentMarketPage() {
  const [listingList, setListingList] = React.useState<MarketListing[]>(listingSeed);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [pricingFilter, setPricingFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [featuredOnly, setFeaturedOnly] = React.useState(false);

  const [detailListing, setDetailListing] = React.useState<MarketListing | null>(null);
  const [recommendOpen, setRecommendOpen] = React.useState(false);
  const [featuredIds, setFeaturedIds] = React.useState<string[]>([]);
  const [removeTarget, setRemoveTarget] = React.useState<MarketListing | null>(null);
  const [reportTarget, setReportTarget] = React.useState<MarketListing | null>(null);

  const filtered = React.useMemo(
    () =>
      listingList.filter(
        (listing) =>
          (categoryFilter === "all" || listing.category === categoryFilter) &&
          (pricingFilter === "all" || listing.pricing === pricingFilter) &&
          (statusFilter === "all" || listing.status === statusFilter) &&
          (!featuredOnly || listing.featured),
      ),
    [listingList, categoryFilter, pricingFilter, statusFilter, featuredOnly],
  );

  const activeFilterCount =
    [categoryFilter, pricingFilter, statusFilter].filter((value) => value !== "all").length +
    (featuredOnly ? 1 : 0);

  const stats = React.useMemo(() => {
    const total = listingList.length;
    const listed = listingList.filter((listing) => listing.status === "listed").length;
    const pending = listingList.filter((listing) => listing.status === "pending").length;
    const removed = listingList.filter((listing) => listing.status === "removed").length;
    const installs = listingList.reduce((sum, listing) => sum + listing.installs, 0);
    const rating =
      total === 0 ? 0 : listingList.reduce((sum, listing) => sum + listing.rating, 0) / total;
    const reports = listingList.reduce((sum, listing) => sum + listing.reports, 0);
    return { listed, pending, removed, installs, rating, reports };
  }, [listingList]);

  const recommendation = React.useMemo(() => {
    const featured = listingList.filter((listing) => listing.featured);
    if (featured.length >= 3) return featured.slice(0, 3);
    const rest = listingList
      .filter((listing) => !listing.featured)
      .sort((a, b) => b.trendScore - a.trendScore);
    return [...featured, ...rest].slice(0, 3);
  }, [listingList]);

  const chart = React.useMemo(
    () => [...listingList].sort((a, b) => b.trendScore - a.trendScore).slice(0, 5),
    [listingList],
  );

  const openRecommendDialog = () => {
    setFeaturedIds(listingList.filter((listing) => listing.featured).map((listing) => listing.id));
    setRecommendOpen(true);
  };

  const toggleFeaturedId = (id: string) => {
    setFeaturedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        toast.warning("推荐位最多保留 3 个");
        return current;
      }
      return [...current, id];
    });
  };

  const saveRecommendation = () => {
    setListingList((list) =>
      list.map((listing) => {
        const featured = featuredIds.includes(listing.id);
        const rank = featured ? featuredIds.indexOf(listing.id) + 1 : null;
        return { ...listing, featured, chartRank: rank };
      }),
    );
    toast.success(`已更新推荐位（${featuredIds.length} 个）`);
    setRecommendOpen(false);
  };

  const setListingStatus = (listing: MarketListing, status: MarketListing["status"], message: string) => {
    setListingList((list) =>
      list.map((item) => (item.id === listing.id ? { ...item, status } : item)),
    );
    toast.success(message);
  };

  const columns = React.useMemo<ColumnDef<MarketListing, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Agent",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-xs font-medium">{row.original.name}</p>
            <p className="text-muted-foreground text-2xs">{row.original.publisher}</p>
          </div>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "分类",
        cell: ({ row }) => <Badge variant="secondary">{label(row.original.category)}</Badge>,
      },
      {
        id: "pricing",
        accessorKey: "pricing",
        header: "定价",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant={row.original.pricing === "paid" ? "info" : "outline"}>
              {PRICING_LABEL[row.original.pricing]}
            </Badge>
            {row.original.pricing === "paid" ? (
              <span className="num text-2xs">¥{formatNumber(row.original.price)}/月</span>
            ) : null}
          </div>
        ),
      },
      {
        id: "installs",
        accessorKey: "installs",
        header: "安装量",
        cell: ({ row }) => <span className="num text-xs">{formatCompact(row.original.installs)}</span>,
      },
      {
        id: "rating",
        accessorKey: "rating",
        header: "评分",
        cell: ({ row }) => (
          <span className="num flex items-center gap-1 text-xs">
            <Star className="size-3 text-amber-500" />
            {row.original.rating.toFixed(2)}
          </span>
        ),
      },
      {
        id: "trendScore",
        accessorKey: "trendScore",
        header: "趋势分",
        cell: ({ row }) => <span className="num text-xs font-medium">{row.original.trendScore}</span>,
      },
      {
        id: "chartRank",
        accessorKey: "chartRank",
        header: "榜单排名",
        cell: ({ row }) =>
          row.original.chartRank ? (
            <Badge variant="warning" className="num">
              #{row.original.chartRank}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-2xs">—</span>
          ),
      },
      {
        id: "reports",
        accessorKey: "reports",
        header: "举报数",
        cell: ({ row }) =>
          row.original.reports > 0 ? (
            <Badge variant="danger" className="num">
              {row.original.reports}
            </Badge>
          ) : (
            <span className="num text-2xs">0</span>
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
        cell: ({ row }) => <span className="num text-2xs">{formatDate(row.original.updatedAt)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => {
          const listing = row.original;
          return (
            <RowActions
              onView={() => setDetailListing(listing)}
              onDelete={() => setRemoveTarget(listing)}
              extraItems={[
                listing.status === "listed"
                  ? {
                      label: "下架",
                      onSelect: () =>
                        setListingStatus(listing, "removed", `已下架「${listing.name}」`),
                    }
                  : {
                      label: "重新上架",
                      onSelect: () =>
                        setListingStatus(listing, "listed", `已重新上架「${listing.name}」`),
                    },
                {
                  label: listing.featured ? "移除推荐" : "设为推荐",
                  onSelect: () => {
                    setListingList((list) =>
                      list.map((item) =>
                        item.id === listing.id ? { ...item, featured: !item.featured } : item,
                      ),
                    );
                    toast.success(listing.featured ? "已移除推荐位" : "已加入推荐位");
                  },
                },
                ...(listing.reports > 0
                  ? [
                      {
                        label: `处理举报（${listing.reports}）`,
                        destructive: true,
                        onSelect: () => setReportTarget(listing),
                      },
                    ]
                  : []),
              ]}
            />
          );
        },
      },
    ],
    [],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Agent 市场运营"
        description="运营面向市场的 Agent 上架、定价、推荐位与榜单，并跟进用户举报处理。"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`已导出 ${filtered.length} 条市场数据（演示）`)}
            >
              <Upload />
              导出
            </Button>
            <Button size="sm" onClick={openRecommendDialog}>
              <Trophy />
              调整推荐位
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="上架数" value={stats.listed} icon={Store} tone="success" />
        <StatCard label="待审核" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="已下架" value={stats.removed} icon={PowerOff} tone="info" />
        <StatCard
          label="总安装量"
          value={stats.installs}
          icon={Download}
          valueFormatter={(value) => formatCompact(value)}
          delta={10.8}
        />
        <StatCard
          label="平均评分"
          value={stats.rating}
          icon={Star}
          valueFormatter={(value) => value.toFixed(2)}
        />
        <StatCard label="举报总数" value={stats.reports} icon={Flag} tone="danger" />
      </StatCardGrid>

      <SectionHeader
        title="推荐位"
        description="首页榜单优先曝光的 3 个 Agent，可手动调整"
        actions={
          <Button variant="outline" size="xs" onClick={openRecommendDialog}>
            调整推荐位
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recommendation.map((listing, index) => (
          <div
            key={listing.id}
            className="bg-card flex flex-col gap-3 rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{listing.name}</p>
                <p className="text-muted-foreground text-2xs">{listing.publisher}</p>
              </div>
              <Badge variant={index === 0 ? "warning" : "secondary"} className="num">
                第 {index + 1} 位
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-2xs">
              <div>
                <p className="text-muted-foreground">趋势分</p>
                <p className="num font-semibold">{listing.trendScore}</p>
              </div>
              <div>
                <p className="text-muted-foreground">安装量</p>
                <p className="num font-semibold">{formatCompact(listing.installs)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">榜单排名</p>
                <p className="num font-semibold">
                  {listing.chartRank ? `#${listing.chartRank}` : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FilterBar
        activeCount={activeFilterCount}
        onReset={() => {
          setCategoryFilter("all");
          setPricingFilter("all");
          setStatusFilter("all");
          setFeaturedOnly(false);
        }}
      >
        <FilterSelect label="分类" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
        <FilterSelect label="定价" value={pricingFilter} onChange={setPricingFilter} options={PRICING_OPTIONS} />
        <FilterSelect label="状态" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <FilterToggle label="仅看推荐位" active={featuredOnly} onClick={() => setFeaturedOnly((value) => !value)} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        searchPlaceholder="搜索 Agent 名称、发布者…"
        onRowClick={(row) => setDetailListing(row)}
        emptyTitle="没有符合条件的市场条目"
      />

      <SectionHeader title="趋势榜单 Top 5" description="按趋势分排序，用于首页榜单曝光" />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16">排名</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>定价</TableHead>
              <TableHead>趋势分</TableHead>
              <TableHead>安装量</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chart.map((listing, index) => (
              <TableRow key={listing.id} className="cursor-pointer" onClick={() => setDetailListing(listing)}>
                <TableCell>
                  <Badge variant={index === 0 ? "warning" : "secondary"} className="num">
                    #{index + 1}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{listing.name}</p>
                  <p className="text-muted-foreground text-2xs">{listing.publisher}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{label(listing.category)}</Badge>
                </TableCell>
                <TableCell className="num text-2xs">
                  {PRICING_LABEL[listing.pricing]}
                  {listing.pricing === "paid" ? ` · ¥${formatNumber(listing.price)}` : ""}
                </TableCell>
                <TableCell className="num text-xs font-medium">{listing.trendScore}</TableCell>
                <TableCell className="num text-xs">{formatCompact(listing.installs)}</TableCell>
                <TableCell>
                  <StatusBadge status={listing.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={recommendOpen} onOpenChange={setRecommendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>调整推荐位</DialogTitle>
            <DialogDescription>
              最多选择 3 个 Agent 进入首页推荐位，保存后立即生效。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {listingList.map((listing) => {
              const checked = featuredIds.includes(listing.id);
              return (
                <label
                  key={listing.id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleFeaturedId(listing.id)}
                  />
                  <span className="truncate">{listing.name}</span>
                  <span className="text-muted-foreground num ml-auto text-2xs">
                    趋势分 {listing.trendScore}
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <span className="text-muted-foreground mr-auto text-2xs">已选 {featuredIds.length} / 3</span>
            <Button variant="outline" size="sm" onClick={() => setRecommendOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={saveRecommendation}>
              保存推荐位
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={detailListing !== null}
        onOpenChange={(open) => {
          if (!open) setDetailListing(null);
        }}
        title={detailListing?.name ?? "市场条目详情"}
        description={detailListing ? `${detailListing.publisher} · ${label(detailListing.category)}` : undefined}
        footer={
          detailListing ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setListingList((list) =>
                    list.map((item) =>
                      item.id === detailListing.id
                        ? { ...item, status: item.status === "listed" ? "removed" : "listed" }
                        : item,
                    ),
                  );
                  toast.success(
                    detailListing.status === "listed"
                      ? `已下架「${detailListing.name}」`
                      : `已重新上架「${detailListing.name}」`,
                  );
                  setDetailListing(null);
                }}
              >
                {detailListing.status === "listed" ? "下架" : "重新上架"}
              </Button>
              {detailListing.reports > 0 ? (
                <Button size="sm" onClick={() => setReportTarget(detailListing)}>
                  处理举报
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {detailListing ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detailListing.status} />
              <Badge variant="secondary">{label(detailListing.category)}</Badge>
              <Badge variant={detailListing.pricing === "paid" ? "info" : "outline"}>
                {PRICING_LABEL[detailListing.pricing]}
              </Badge>
              {detailListing.featured ? <Badge variant="warning">推荐位</Badge> : null}
            </div>

            <DetailSection title="运营数据">
              <DetailGrid>
                <DetailRow label="定价">
                  {detailListing.pricing === "paid"
                    ? `¥${formatNumber(detailListing.price)}/月`
                    : PRICING_LABEL[detailListing.pricing]}
                </DetailRow>
                <DetailRow label="安装量">
                  <span className="num">{formatCompact(detailListing.installs)}</span>
                </DetailRow>
                <DetailRow label="评分">
                  <span className="num">
                    {detailListing.rating.toFixed(2)}（{formatCompact(detailListing.reviews)} 条评论）
                  </span>
                </DetailRow>
                <DetailRow label="趋势分">
                  <span className="num">{detailListing.trendScore}</span>
                </DetailRow>
                <DetailRow label="榜单排名">
                  <span className="num">{detailListing.chartRank ? `#${detailListing.chartRank}` : "—"}</span>
                </DetailRow>
                <DetailRow label="举报数">
                  <span className="num">{detailListing.reports}</span>
                </DetailRow>
                <DetailRow label="模板 ID" mono>
                  {detailListing.templateId}
                </DetailRow>
                <DetailRow label="更新时间">
                  <span className="num">{formatDate(detailListing.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                </DetailRow>
              </DetailGrid>
            </DetailSection>

            <DetailSection title="合规提示">
              <p className="text-muted-foreground text-2xs leading-relaxed">
                市场条目的定价、文案与示例输出需符合平台运营规范；被举报条目应在 24 小时内完成核查，
                确认违规后立即下架并通知发布者整改。
              </p>
            </DetailSection>
          </>
        ) : null}
      </DetailSheet>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={`将「${removeTarget?.name ?? ""}」移出市场？`}
        description="移除后该条目不再展示且无法被安装，已安装用户不受影响；如需恢复需重新提交审核。"
        confirmLabel="确认移除"
        onConfirm={() => {
          if (!removeTarget) return;
          setListingList((list) => list.filter((item) => item.id !== removeTarget.id));
          toast.success(`已移除「${removeTarget.name}」`);
          setRemoveTarget(null);
        }}
      />

      <ConfirmDialog
        open={reportTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReportTarget(null);
        }}
        title={`处理「${reportTarget?.name ?? ""}」的 ${reportTarget?.reports ?? 0} 条举报？`}
        description="确认处理后举报计数清零，操作会记入运营审计日志。"
        confirmLabel="标记已处理"
        variant="default"
        onConfirm={() => {
          if (!reportTarget) return;
          setListingList((list) =>
            list.map((item) => (item.id === reportTarget.id ? { ...item, reports: 0 } : item)),
          );
          toast.success(`已处理「${reportTarget.name}」的举报`);
          setReportTarget(null);
        }}
      />
    </PageContainer>
  );
}
