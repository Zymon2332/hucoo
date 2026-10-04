"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const commandOpen = useUiStore((state) => state.commandOpen);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandOpen, setCommandOpen]);

  return (
    <div className="bg-card min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="bg-card flex min-h-svh overflow-hidden lg:h-full lg:min-h-0">
        <aside
          className={cn(
            "hidden shrink-0 transition-[width] duration-200 lg:block",
            sidebarCollapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]",
          )}
        >
          <Sidebar collapsed={sidebarCollapsed} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[var(--sidebar-width)] gap-0 p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <Sidebar collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
