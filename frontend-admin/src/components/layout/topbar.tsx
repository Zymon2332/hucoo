"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationMenu } from "@/components/layout/notification-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { useUiStore } from "@/store/ui-store";

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  return (
    <header className="bg-card sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="打开导航"
      >
        <Menu className="size-4" />
      </Button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandOpen(true)}
          className="text-muted-foreground hidden h-9 w-60 justify-start gap-2 rounded-lg text-xs font-normal sm:flex"
        >
          <Search className="size-3.5" />
          搜索…
          <kbd className="bg-muted num ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setCommandOpen(true)}
          aria-label="搜索"
        >
          <Search className="size-4" />
        </Button>
        <ThemeToggle />
        <NotificationMenu />
        <Separator orientation="vertical" className="mx-1.5 h-5" />
        <UserMenu variant="topbar" />
      </div>
    </header>
  );
}
