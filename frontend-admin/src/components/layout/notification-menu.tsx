"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/common/status-badge";
import { alerts } from "@/lib/mock-data/ops";
import { formatRelativeTime } from "@/lib/utils";

export function NotificationMenu() {
  const firing = alerts.filter((alert) => alert.status === "firing");
  const [readIds, setReadIds] = React.useState<string[]>([]);
  const unread = firing.filter((alert) => !readIds.includes(alert.id));
  const recent = alerts.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="通知" className="relative">
          <Bell className="size-4" />
          {unread.length > 0 ? (
            <span className="bg-destructive ring-card absolute top-1.5 right-1.5 size-2 rounded-full ring-2" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">通知</span>
            {unread.length > 0 ? <Badge variant="danger">{unread.length} 条未读</Badge> : null}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setReadIds(firing.map((alert) => alert.id));
              toast.success("已全部标记为已读");
            }}
          >
            <CheckCheck />
            全部已读
          </Button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <ScrollArea className="max-h-80">
          <div className="p-1">
            {recent.map((alert) => (
              <div
                key={alert.id}
                className="hover:bg-accent flex cursor-pointer flex-col gap-1 rounded-sm px-2 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs leading-snug font-medium">{alert.title}</p>
                  <StatusBadge status={alert.severity} dot={false} />
                </div>
                <p className="text-muted-foreground line-clamp-1 text-2xs">{alert.description}</p>
                <div className="text-muted-foreground num flex items-center gap-2 text-2xs">
                  <span>{alert.tenantName}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(alert.triggeredAt)}</span>
                  {readIds.includes(alert.id) || alert.status !== "firing" ? null : (
                    <span className="bg-primary ml-auto size-1.5 rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1">
          <Link
            href="/alerts"
            className="hover:bg-accent block rounded-sm px-2 py-1.5 text-center text-2xs"
          >
            查看全部告警
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
