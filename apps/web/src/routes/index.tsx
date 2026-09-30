import { createFileRoute } from "@tanstack/react-router";
import { QuickStart } from "@/features/home/quick-start";
import { QuickEntries } from "@/features/home/quick-entries";
import { SessionsSection } from "@/features/threads/sessions-section";
import { useAuthStore } from "@/features/auth/auth-store";

export const Route = createFileRoute("/")({ component: Workbench });

function Workbench() {
  const user = useAuthStore((s) => s.user);
  const name = user?.name?.split(" ")[0] ?? "你好";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">工作台</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {name}，今天想做点什么？
        </p>
      </div>

      <QuickStart />
      <QuickEntries />
      <SessionsSection />
    </div>
  );
}
