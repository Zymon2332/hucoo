import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { TooltipProvider } from "@hucoo/ui/components/tooltip";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@hucoo/ui/components/sidebar";
import { Toaster } from "@hucoo/ui/components/sonner";
import { SidebarNav } from "./sidebar-nav";
import { CommandPalette } from "@/features/command/command-palette";

export function AppShell() {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void navigate({ to: "/t/$threadId", params: { threadId: "new" } });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset className="h-[calc(100dvh-1rem)] overflow-hidden border border-border bg-card shadow-[var(--shadow-card)]">
          <header className="flex h-12 shrink-0 items-center gap-2 px-3">
            <SidebarTrigger />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
            <Outlet />
          </main>
        </SidebarInset>
        <CommandPalette />
        <Toaster position="bottom-right" closeButton />
      </SidebarProvider>
    </TooltipProvider>
  );
}
