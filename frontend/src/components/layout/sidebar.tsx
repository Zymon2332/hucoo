"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { navGroups } from "@/config/nav";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/layout/user-menu";
import { approvals } from "@/lib/mock-data/approvals";
import { customModels } from "@/lib/mock-data/models";
import { alerts } from "@/lib/mock-data/ops";

export interface NavBadgeCounts {
  pendingApprovals: number;
  firingAlerts: number;
  pendingModels: number;
}

export function useNavBadgeCounts(): NavBadgeCounts {
  return React.useMemo(
    () => ({
      pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
      firingAlerts: alerts.filter((alert) => alert.status === "firing").length,
      pendingModels: customModels.filter(
        (model) => model.status === "pending-review" || model.status === "validating",
      ).length,
    }),
    [],
  );
}

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const badgeCounts = useNavBadgeCounts();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <div
        className={cn(
          "border-sidebar-border flex h-16 shrink-0 items-center gap-2.5 border-b px-3",
          collapsed && "justify-center px-2",
        )}
      >
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="展开侧边栏"
            className="text-sidebar-foreground"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        ) : (
          <>
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-foreground truncate text-sm font-semibold">
                Agent 平台
              </p>
              <p className="text-muted-foreground text-2xs">管理控制台</p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleSidebar}
              aria-label="折叠侧边栏"
              className="text-muted-foreground ml-auto"
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          </>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 overscroll-contain">
        <nav className="space-y-4 px-2 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed ? (
                <p className="text-muted-foreground/80 px-2 pb-1.5 text-[11px] font-medium">
                  {group.label}
                </p>
              ) : (
                <div className="bg-sidebar-border mx-auto mb-1.5 h-px w-5" />
              )}
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badgeValue = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                const content = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0 py-2",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {!collapsed && badgeValue > 0 ? (
                      <Badge variant="danger" className="num ml-auto px-1.5">
                        {badgeValue}
                      </Badge>
                    ) : null}
                    {collapsed && badgeValue > 0 ? (
                      <span className="bg-destructive absolute top-1.5 right-1.5 size-1.5 rounded-full" />
                    ) : null}
                  </Link>
                );

                return collapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right">
                      {group.label} · {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <React.Fragment key={item.href}>{content}</React.Fragment>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-sidebar-border mt-auto shrink-0 border-t p-2.5">
        <UserMenu variant="sidebar" compact={collapsed} />
      </div>
    </div>
  );
}
