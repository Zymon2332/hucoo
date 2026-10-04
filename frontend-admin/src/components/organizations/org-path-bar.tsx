"use client";

import * as React from "react";
import { Download, Plus, Search, ShieldCheck, X } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OrgTreeIndex } from "@/lib/org-tree";
import { ORG_ROLES, ORG_ROLE_LABEL, type OrgRole } from "@/lib/permissions";
import type { Organization } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

/** 面包屑超过 4 级时折叠中间层级，避免深层组织把顶栏撑爆。 */
const MAX_VISIBLE_CRUMBS = 4;

function CrumbButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:text-foreground max-w-[12rem] cursor-pointer truncate transition-colors"
    >
      {children}
    </button>
  );
}

function Metric({ srLabel, value, suffix }: { srLabel: string; value: number; suffix: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <dt className="sr-only">{srLabel}</dt>
      <dd className="num text-foreground font-medium">{formatNumber(value)}</dd>
      <span aria-hidden>{suffix}</span>
    </span>
  );
}

interface OrgPathBarProps {
  /** 页面标题：并入工具条第一行，省下一整行高度留给下方两个面板 */
  title: string;
  description: string;
  index: OrgTreeIndex;
  path: Organization[];
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number | null;
  onNavigate: (id: string | null) => void;
  role: OrgRole;
  onRoleChange: (role: OrgRole) => void;
  canCreate: boolean;
  createDenyReason: string | null;
  onCreate: () => void;
  canExport: boolean;
  exportDenyReason: string | null;
  onExport: () => void;
}

export function OrgPathBar({
  title,
  description,
  index,
  path,
  query,
  onQueryChange,
  matchCount,
  onNavigate,
  role,
  onRoleChange,
  canCreate,
  createDenyReason,
  onCreate,
  canExport,
  exportDenyReason,
  onExport,
}: OrgPathBarProps) {
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  // “/” 聚焦搜索，Esc 清空——与树面板的键盘操作保持一致
  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const isDeep = path.length > MAX_VISIBLE_CRUMBS;
  const collapsed = isDeep ? path.slice(1, -2) : [];
  // 用 slice 拼接而不是下标取值，避免 noUncheckedIndexedAccess 引入 undefined
  const visible = isDeep ? [...path.slice(0, 1), ...path.slice(-2)] : path;
  const roleMeta = ORG_ROLES.find((item) => item.id === role);

  return (
    <section
      aria-label="组织导航"
      aria-labelledby="org-workspace-title"
      className="border-border bg-card flex shrink-0 flex-col gap-2 rounded-xl border px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1
            id="org-workspace-title"
            className="font-display text-base font-semibold tracking-tight"
          >
            {title}
          </h1>
          <span className="text-muted-foreground text-2xs hidden 2xl:inline">{description}</span>
        </div>
        <span aria-hidden className="bg-border hidden h-4 w-px lg:block" />

        <Breadcrumb className="min-w-0" aria-label="组织层级导航">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <CrumbButton onClick={() => onNavigate(null)}>全部组织</CrumbButton>
            </BreadcrumbItem>

            {collapsed.length > 0 ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`展开中间 ${collapsed.length} 级组织`}
                        className="hover:text-foreground flex size-5 cursor-pointer items-center justify-center rounded transition-colors"
                      >
                        <BreadcrumbEllipsis />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>中间层级</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {collapsed.map((node) => (
                        <DropdownMenuItem key={node.id} onSelect={() => onNavigate(node.id)}>
                          <span className="truncate">{node.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
              </>
            ) : null}

            {visible.map((node) => {
              const isLast = node.id === path[path.length - 1]?.id;
              return (
                <React.Fragment key={node.id}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="max-w-[14rem] truncate">
                        {node.name}
                      </BreadcrumbPage>
                    ) : (
                      <CrumbButton onClick={() => onNavigate(node.id)}>{node.name}</CrumbButton>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Select value={role} onValueChange={(value) => onRoleChange(value as OrgRole)}>
                <SelectTrigger size="sm" className="text-2xs w-[9.5rem]" aria-label="权限视角">
                  <ShieldCheck className="text-muted-foreground size-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_ROLES.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="text-2xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TooltipTrigger>
            <TooltipContent>{roleMeta?.description}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canExport}
                  onClick={onExport}
                  className={cn(!canExport && "cursor-not-allowed")}
                >
                  <Download />
                  导出
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canExport ? "导出当前视图的组织数据" : exportDenyReason}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canCreate}
                  onClick={onCreate}
                  className={cn(!canCreate && "cursor-not-allowed")}
                >
                  <Plus />
                  新建组织
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canCreate ? `当前身份：${ORG_ROLE_LABEL[role]}` : createDenyReason}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="relative w-full sm:w-80">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onQueryChange("");
            }}
            placeholder="搜索组织名称、编码或负责人"
            aria-label="搜索组织"
            className="h-8 text-xs"
            style={{ paddingLeft: "2rem", paddingRight: query ? "4.75rem" : "2.5rem" }}
          />
          <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
            {query ? (
              <>
                <span className="text-muted-foreground num text-2xs" aria-live="polite">
                  {formatNumber(matchCount ?? 0)} 项
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="清空搜索"
                  onClick={() => onQueryChange("")}
                  className="text-muted-foreground size-6"
                >
                  <X />
                </Button>
              </>
            ) : (
              <kbd className="border-border text-muted-foreground text-2xs pointer-events-none rounded border px-1 font-mono">
                /
              </kbd>
            )}
          </div>
        </div>

        <dl className="text-muted-foreground text-2xs ml-auto hidden flex-wrap items-center gap-x-3.5 gap-y-1 md:flex">
          <Metric srLabel="组织总数" value={index.nodeById.size} suffix="个组织" />
          <Metric srLabel="公司数量" value={index.typeCounts.company} suffix="家公司" />
          <Metric srLabel="部门数量" value={index.typeCounts.department} suffix="个部门" />
          <Metric srLabel="团队数量" value={index.typeCounts.team} suffix="个团队" />
          <Metric srLabel="成员总数" value={index.totalMembers} suffix="名成员" />
        </dl>
      </div>
    </section>
  );
}
