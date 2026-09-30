import { SlidersHorizontal } from "@phosphor-icons/react";
import type { RunState } from "@hucoo/streaming";
import { ScrollArea } from "@hucoo/ui/components/scroll-area";
import { ContextPanel } from "./context-panel";

export function ContextPane({ run }: { run: RunState }) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <SlidersHorizontal size={16} className="shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">上下文</span>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <ContextPanel run={run} />
      </ScrollArea>
    </div>
  );
}
