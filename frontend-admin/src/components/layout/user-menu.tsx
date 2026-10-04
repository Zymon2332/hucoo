"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, initialsOf } from "@/lib/utils";

export const CURRENT_USER = {
  name: "陈立",
  email: "chenli@cloudnova.cn",
  role: "超级管理员",
  tenant: "云启科技",
};

interface UserMenuProps {
  variant?: "topbar" | "sidebar";
  compact?: boolean;
}

export function UserMenu({ variant = "topbar", compact = false }: UserMenuProps) {
  const isSidebar = variant === "sidebar";

  const trigger = isSidebar ? (
    <button
      type="button"
      aria-label="用户菜单"
      className={cn(
        "hover:bg-sidebar-accent flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
        compact && "justify-center px-0 py-1.5",
      )}
    >
      <Avatar className="size-8">
        <AvatarFallback>{initialsOf(CURRENT_USER.name)}</AvatarFallback>
      </Avatar>
      {!compact ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">{CURRENT_USER.name}</p>
            <p className="text-muted-foreground text-2xs truncate">{CURRENT_USER.email}</p>
          </div>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </>
      ) : null}
    </button>
  ) : (
    <Button variant="ghost" size="sm" className="gap-2 px-1.5" aria-label="用户菜单">
      <Avatar className="size-6">
        <AvatarFallback>{initialsOf(CURRENT_USER.name)}</AvatarFallback>
      </Avatar>
      <span className="hidden text-xs font-medium sm:inline">{CURRENT_USER.name}</span>
    </Button>
  );

  const triggerNode = compact ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">{CURRENT_USER.name}</TooltipContent>
    </Tooltip>
  ) : (
    <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {triggerNode}
      <DropdownMenuContent
        side={isSidebar ? "top" : "bottom"}
        align={isSidebar ? "start" : "end"}
        className="w-60"
      >
        <DropdownMenuLabel className="normal-case">
          <div className="flex items-center gap-2 py-0.5">
            <Avatar className="size-8">
              <AvatarFallback>{initialsOf(CURRENT_USER.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{CURRENT_USER.name}</p>
              <p className="text-muted-foreground text-2xs truncate">{CURRENT_USER.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="text-muted-foreground text-2xs flex items-center justify-between px-2 py-1.5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            {CURRENT_USER.role}
          </span>
          <span>{CURRENT_USER.tenant}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/users/usr-01">
            <UserRound />
            个人资料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            系统设置
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <Link href="/login" onClick={() => toast.info("演示环境：已模拟退出登录")}>
            <LogOut />
            退出登录
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
