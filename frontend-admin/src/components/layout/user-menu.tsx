"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Loader2, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
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
import {
  hasPermission,
  signOut,
  useAuthPermissions,
  useAuthStore,
  useAuthUser,
} from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/env";
import { cn, initialsOf } from "@/lib/utils";

/** 未接入真实接口的页面（组织架构等）仍在用的演示身份。 */
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
  const router = useRouter();
  const user = useAuthUser();
  const permissions = useAuthPermissions();
  const tenantId = useAuthStore((state) => state.session?.tenantId ?? null);
  const [signingOut, setSigningOut] = React.useState(false);

  const displayName = user?.displayName ?? CURRENT_USER.name;
  const accountLabel = user?.username ?? CURRENT_USER.email;
  const role = hasPermission(permissions, "*") ? "超级管理员" : "成员";
  const tenant = tenantId ?? CURRENT_USER.tenant;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("已退出登录");
      router.replace(LOGIN_PATH);
    } finally {
      setSigningOut(false);
    }
  };

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
        <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
      </Avatar>
      {!compact ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">{displayName}</p>
            <p className="text-muted-foreground text-2xs truncate">{accountLabel}</p>
          </div>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </>
      ) : null}
    </button>
  ) : (
    <Button variant="ghost" size="sm" className="gap-2 px-1.5" aria-label="用户菜单">
      <Avatar className="size-6">
        <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
      </Avatar>
      <span className="hidden text-xs font-medium sm:inline">{displayName}</span>
    </Button>
  );

  const triggerNode = compact ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">{displayName}</TooltipContent>
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
              <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="text-muted-foreground text-2xs truncate">{accountLabel}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="text-muted-foreground text-2xs flex items-center justify-between px-2 py-1.5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            {role}
          </span>
          <span className="font-mono">{tenant}</span>
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
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={() => void handleSignOut()}
        >
          {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          {signingOut ? "正在退出…" : "退出登录"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
