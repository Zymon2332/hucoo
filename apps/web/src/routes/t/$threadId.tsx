import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SidebarSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createEmptyRun, type RunState } from "@hucoo/streaming";
import { cn } from "@hucoo/ui";
import { Button } from "@hucoo/ui/components/button";
import { Textarea } from "@hucoo/ui/components/textarea";
import { Skeleton } from "@hucoo/ui/components/skeleton";
import { Badge } from "@hucoo/ui/components/badge";
import { useChat } from "@/features/chat/use-chat";
import { StreamView } from "@/features/chat/stream-view";
import { Composer } from "@/features/chat/composer";
import { MessageActions } from "@/features/chat/message-actions";
import { parseComposerText } from "@/features/chat/composer-payload";
import { takePendingInput } from "@/features/chat/pending-input";
import { extractText } from "@/features/chat/run-utils";
import { useThreadsStore } from "@/features/threads/threads-store";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import { ArtifactPane } from "@/features/artifact/artifact-pane";
import { ContextPane } from "@/features/context/context-pane";
import { ResizableSplit } from "@/components/resizable-split";
import { SCENARIOS } from "@/features/agents/data";
import type { ChatMessage } from "@/features/threads/types";

export const Route = createFileRoute("/t/$threadId")({ component: Thread });

type PaneTab = "artifact" | "context";

function UserBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[80%] whitespace-pre-wrap rounded-[var(--radius-card)] rounded-br-md bg-secondary px-4 py-2.5 text-sm">
      {text}
    </div>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("已复制");
  } catch {
    // clipboard unavailable
  }
}

function Thread() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();

  const hydrated = useThreadsStore((s) => s.hydrated);
  const threads = useThreadsStore((s) => s.threads);
  const createThread = useThreadsStore((s) => s.create);
  const thread = useMemo(
    () => threads.find((t) => t.id === threadId),
    [threads, threadId],
  );

  const records = useArtifactsStore((s) => s.records);
  const activeArtifactId = useArtifactsStore((s) => s.activeId);
  const setActiveArtifact = useArtifactsStore((s) => s.setActive);
  const acceptArtifact = useArtifactsStore((s) => s.accept);
  const rejectArtifact = useArtifactsStore((s) => s.reject);

  const threadArtifacts = useMemo(
    () => records.filter((r) => r.threadId === threadId),
    [records, threadId],
  );

  const { liveRun, isStreaming, send, regenerate, editAndResend, resume, stop } =
    useChat(thread);

  const [paneOpen, setPaneOpen] = useState(false);
  const [paneTab, setPaneTab] = useState<PaneTab>("context");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const createdRef = useRef(false);
  useEffect(() => {
    if (threadId !== "new" || !hydrated || createdRef.current) return;
    createdRef.current = true;
    const created = createThread();
    void navigate({
      to: "/t/$threadId",
      params: { threadId: created.id },
      replace: true,
    });
  }, [threadId, hydrated, createThread, navigate]);

  const pendingRef = useRef(false);
  useEffect(() => {
    if (!thread || pendingRef.current) return;
    const payload = takePendingInput(thread.id);
    if (payload) {
      pendingRef.current = true;
      void send(payload);
    }
  }, [thread, send]);

  useEffect(() => {
    if (threadArtifacts.length > 0) {
      setPaneTab("artifact");
      setPaneOpen(true);
    } else {
      setPaneTab((tab) => (tab === "artifact" ? "context" : tab));
    }
  }, [threadArtifacts.length]);

  const contextRun = useMemo<RunState>(() => {
    if (isStreaming) return liveRun;
    const last = [...(thread?.messages ?? [])]
      .reverse()
      .find((m) => m.run) as ChatMessage | undefined;
    return last?.run ?? createEmptyRun();
  }, [isStreaming, liveRun, thread]);

  function sendText(text: string) {
    const { tools, mentions } = parseComposerText(text);
    return send({ text, tools, mentions, attachments: [] });
  }

  if (!hydrated || threadId === "new") {
    return (
      <div className="mx-auto max-w-3xl space-y-3 pt-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 pt-8">
        <p className="text-sm text-muted-foreground">会话不存在或已删除。</p>
        <Button
          onClick={() =>
            void navigate({ to: "/t/$threadId", params: { threadId: "new" } })
          }
        >
          新建会话
        </Button>
      </div>
    );
  }

  function togglePane() {
    if (!paneOpen) {
      setPaneTab(threadArtifacts.length > 0 ? "artifact" : "context");
    }
    setPaneOpen((open) => !open);
  }

  const chatColumn = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-2 sm:px-4">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {thread.messages.map((message) => {
            if (message.role === "user") {
              return (
                <div
                  key={message.id}
                  className="group/message flex flex-col items-end gap-1"
                >
                  {editingId === message.id ? (
                    <div className="w-full max-w-[80%] space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-20"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const next = editText;
                            setEditingId(null);
                            void editAndResend(message.id, next);
                          }}
                        >
                          发送
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1">
                      <MessageActions
                        role="user"
                        onCopy={() => void copyText(message.text)}
                        onEdit={() => {
                          setEditingId(message.id);
                          setEditText(message.text);
                        }}
                      />
                      <UserBubble text={message.text} />
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={message.id} className="group/message space-y-1">
                <StreamView
                  run={message.run ?? createEmptyRun()}
                  onInterruptResolve={resume}
                  onRetry={() => void regenerate()}
                />
                <MessageActions
                  role="assistant"
                  onCopy={() =>
                    void copyText(
                      message.text ||
                        (message.run ? extractText(message.run) : ""),
                    )
                  }
                  onRegenerate={() => void regenerate()}
                />
              </div>
            );
          })}

          {isStreaming && (
            <StreamView run={liveRun} onInterruptResolve={resume} />
          )}

          {thread.messages.length === 0 && !isStreaming && (
            <StreamView run={liveRun} onSuggestion={sendText} />
          )}
        </div>
      </div>
      <div className="shrink-0 px-2 pb-2 sm:px-4">
        <Composer
          onSend={send}
          isStreaming={isStreaming}
          onStop={stop}
          threadId={thread.id}
        />
      </div>
    </div>
  );

  const rightPane =
    paneTab === "artifact" && threadArtifacts.length > 0 ? (
      <ArtifactPane
        records={threadArtifacts}
        activeId={activeArtifactId}
        onSelect={setActiveArtifact}
        onAccept={acceptArtifact}
        onReject={rejectArtifact}
        onClose={() => setPaneOpen(false)}
      />
    ) : (
      <ContextPane run={contextRun} />
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-2 pb-2 sm:px-4">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {thread.title}
        </h1>
        {thread.scenarioId && (
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
            {SCENARIOS.find((s) => s.id === thread.scenarioId)?.name ??
              thread.scenarioId}
          </Badge>
        )}
        <button
          type="button"
          aria-label={paneOpen ? "收起面板" : "展开面板"}
          title="面板"
          onClick={togglePane}
          className={cn(
            "ml-auto grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors",
            paneOpen
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <SidebarSimple size={18} className="rotate-180" />
        </button>
      </div>

      {paneOpen ? (
        <ResizableSplit left={chatColumn} right={rightPane} />
      ) : (
        chatColumn
      )}
    </div>
  );
}
