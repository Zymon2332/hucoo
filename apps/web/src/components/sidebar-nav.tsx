import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CaretUpDown,
  GearSix,
  MagnifyingGlass,
  Robot,
  ShareNetwork,
  SignOut,
  SquaresFour,
  Tray,
  type Icon,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@hucoo/ui/components/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hucoo/ui/components/dropdown-menu";
import { Avatar, AvatarFallback } from "@hucoo/ui/components/avatar";
import { useInboxStore } from "@/features/inbox/inbox-store";
import { useCommandStore } from "@/features/command/command-store";
import { useAuthStore } from "@/features/auth/auth-store";
import { SettingsDialog } from "@/features/settings/settings-dialog";

interface NavItem {
  label: string;
  icon: Icon;
  to: string;
  params?: Record<string, string>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "工作区",
    items: [
      { label: "首页", icon: SquaresFour, to: "/" },
      { label: "收件箱", icon: Tray, to: "/inbox" },
      { label: "画布", icon: ShareNetwork, to: "/canvas" },
    ],
  },
  {
    label: "场景",
    items: [{ label: "全部场景", icon: Robot, to: "/agents" }],
  },
  {
    label: "项目",
    items: [
      {
        label: "项目空间",
        icon: SquaresFour,
        to: "/projects/$projectId",
        params: { projectId: "demo" },
      },
    ],
  },
];

function isActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to.includes("$")) return pathname.startsWith("/projects/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function SidebarNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inboxCount = useInboxStore((s) => s.items.length);
  const openCommand = useCommandStore((s) => s.setOpen);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayName = user?.name ?? "未登录";
  const displayEmail = user?.email ?? "—";
  const avatarText =
    displayName
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  function logout() {
    clearSession();
    void navigate({ to: "/login" });
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Hucoo 工作台">
              <Link to="/">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Robot size={18} weight="fill" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Hucoo 工作台</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => openCommand(true)}
              tooltip="搜索"
            >
              <MagnifyingGlass size={16} />
              <span>搜索…</span>
              <kbd className="ml-auto rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const IconCmp = item.icon;
                  const active = isActive(pathname, item.to);
                  const badge =
                    item.label === "收件箱" && inboxCount > 0
                      ? String(inboxCount)
                      : undefined;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                      >
                        <Link to={item.to} params={item.params as never}>
                          <IconCmp size={18} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={displayName}>
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {avatarText}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {displayEmail}
                    </span>
                  </div>
                  <CaretUpDown size={14} className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <GearSix size={16} />
                  设置
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <SignOut size={16} />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
}
