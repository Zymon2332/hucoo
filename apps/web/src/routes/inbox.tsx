import { createFileRoute } from "@tanstack/react-router";
import { Sparkle } from "@phosphor-icons/react";
import { Button } from "@hucoo/ui/components/button";
import { InboxPanel } from "@/features/inbox/inbox-panel";
import { useInboxStore } from "@/features/inbox/inbox-store";

export const Route = createFileRoute("/inbox")({ component: Inbox });

function Inbox() {
  const simulate = useInboxStore((s) => s.simulate);

  return (
    <div className="mx-auto max-w-3xl pt-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">收件箱</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agent 主动产出的草稿、建议与结果，待你确认。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={simulate}>
          <Sparkle size={14} weight="fill" />
          模拟新产出
        </Button>
      </div>
      <InboxPanel />
    </div>
  );
}
