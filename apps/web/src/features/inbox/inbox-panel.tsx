import { useNavigate } from "@tanstack/react-router";
import { Check, Sparkle, X } from "@phosphor-icons/react";
import { Card } from "@hucoo/ui/components/card";
import { Badge } from "@hucoo/ui/components/badge";
import { Button } from "@hucoo/ui/components/button";
import { useThreadsStore } from "@/features/threads/threads-store";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import { createId } from "@/features/threads/types";
import { useInboxStore, type InboxItem } from "./inbox-store";

const KIND_LABEL: Record<InboxItem["kind"], string> = {
  draft: "草稿",
  result: "结果",
  suggestion: "建议",
};

function InboxCard({ item }: { item: InboxItem }) {
  const navigate = useNavigate();
  const consume = useInboxStore((s) => s.consume);
  const dismiss = useInboxStore((s) => s.dismiss);
  const createThread = useThreadsStore((s) => s.create);
  const addMessage = useThreadsStore((s) => s.addMessage);
  const applyArtifact = useArtifactsStore((s) => s.applyArtifact);

  function accept() {
    const consumed = consume(item.id);
    if (!consumed) return;
    const thread = createThread({
      title: consumed.seed.title,
      scenarioId: consumed.scenarioId,
    });
    addMessage(thread.id, {
      id: createId(),
      role: "assistant",
      createdAt: Date.now(),
      text: consumed.seed.assistantText,
    });
    if (consumed.seed.artifact) {
      applyArtifact(thread.id, consumed.seed.artifact);
    }
    void navigate({ to: "/t/$threadId", params: { threadId: thread.id } });
  }

  return (
    <Card className="gap-0 p-3 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <Badge className="bg-accent text-accent-foreground">
          <Sparkle size={11} weight="fill" />
          {KIND_LABEL[item.kind]}
        </Badge>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {Math.round(item.confidence * 100)}%
        </span>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug">{item.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">来自 {item.source}</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" onClick={accept}>
          <Check size={12} weight="bold" />
          采纳
        </Button>
        <Button size="sm" variant="outline" onClick={() => dismiss(item.id)}>
          <X size={12} />
          忽略
        </Button>
      </div>
    </Card>
  );
}

export function InboxPanel() {
  const items = useInboxStore((s) => s.items);

  return (
    <div className="mt-4 space-y-2">
      {items.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          暂无待处理事项
        </p>
      ) : (
        items.map((item) => <InboxCard key={item.id} item={item} />)
      )}
    </div>
  );
}
