import { useMemo, useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { cn } from "@hucoo/ui";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@hucoo/ui/components/tabs";
import { ScrollArea } from "@hucoo/ui/components/scroll-area";
import { Button } from "@hucoo/ui/components/button";
import {
  acceptedRevision,
  hasPendingRevision,
  latestRevision,
  type ArtifactRecord,
} from "@/features/threads/types";
import { ArtifactBody } from "./artifact-panel";
import { diffStats, lineDiff } from "./diff";

function DiffReview({
  from,
  to,
  onAccept,
  onReject,
}: {
  from: string;
  to: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const lines = useMemo(() => lineDiff(from, to), [from, to]);
  const stats = diffStats(lines);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs">
        <span className="font-medium">待审阅变更</span>
        <span className="text-primary">+{stats.added}</span>
        <span className="text-destructive">-{stats.removed}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={onAccept}>
            <Check size={12} weight="bold" />
            接受
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <X size={12} />
            拒绝
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 font-mono text-xs leading-relaxed">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap rounded px-2",
                line.type === "add" && "bg-primary/10 text-primary",
                line.type === "del" && "bg-destructive/10 text-destructive",
              )}
            >
              <span className="mr-2 select-none opacity-50">
                {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
              </span>
              {line.text || "\u00A0"}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ArtifactPane({
  records,
  activeId,
  onSelect,
  onAccept,
  onReject,
  onClose,
}: {
  records: ArtifactRecord[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}) {
  const active =
    records.find((r) => r.id === activeId) ?? records[records.length - 1];
  const [tab, setTab] = useState<"content" | "history">("content");
  const [previewRevision, setPreviewRevision] = useState<number | null>(null);

  if (!active) return null;

  const accepted = acceptedRevision(active);
  const latest = latestRevision(active);
  const pending = hasPendingRevision(active);
  const reviewing = pending && previewRevision === null && tab === "content";

  const previewed =
    previewRevision !== null
      ? active.revisions.find((r) => r.revision === previewRevision)
      : undefined;

  function selectArtifact(id: string) {
    onSelect(id);
    setPreviewRevision(null);
    setTab("content");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => selectArtifact(record.id)}
              className={cn(
                "h-8 shrink-0 rounded-[10px] px-2.5 text-sm font-medium transition-colors",
                record.id === active.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {record.title}
              {hasPendingRevision(record) && (
                <span className="ml-1.5 inline-block size-1.5 rounded-full bg-warning align-middle" />
              )}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="关闭面板"
          onClick={onClose}
        >
          <X size={15} />
        </Button>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "content" | "history")}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="shrink-0 border-b border-border px-3 py-1.5">
          <TabsList>
            <TabsTrigger value="content">内容</TabsTrigger>
            <TabsTrigger value="history">
              版本历史
              {pending && (
                <span className="ml-1 inline-block size-1.5 rounded-full bg-warning align-middle" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="content" className="min-h-0 flex-1">
          {reviewing && accepted && latest ? (
            <DiffReview
              from={accepted.content}
              to={latest.content}
              onAccept={() => onAccept(active.id)}
              onReject={() => onReject(active.id)}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {previewed && previewed.revision !== active.acceptedRevision && (
                <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                  正在查看 v{previewed.revision}
                  <button
                    type="button"
                    onClick={() => setPreviewRevision(null)}
                    className="ml-auto rounded-[8px] border border-border px-2 py-0.5 transition-colors hover:bg-secondary"
                  >
                    返回当前版本
                  </button>
                </div>
              )}
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-4">
                  <ArtifactBody
                    artifact={{
                      id: active.id,
                      kind: active.kind,
                      title: active.title,
                      content: previewed?.content ?? accepted?.content ?? "",
                    }}
                  />
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <ul className="space-y-1.5 p-4">
              {[...active.revisions].reverse().map((rev) => (
                <li key={rev.revision}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewRevision(rev.revision);
                      setTab("content");
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="font-medium tabular-nums">
                      v{rev.revision}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rev.source === "agent" ? "Agent" : "用户"}
                    </span>
                    {rev.revision === active.acceptedRevision && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        当前
                      </span>
                    )}
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
