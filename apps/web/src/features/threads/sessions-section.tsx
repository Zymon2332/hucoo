import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@hucoo/ui/components/button";
import { SCENARIOS } from "@/features/agents/data";
import { useThreadsStore } from "./threads-store";
import { SessionRow } from "./session-row";
import type { Thread } from "./types";

const RECENT_LIMIT = 6;

type Row =
  | { kind: "group"; label: string; count: number }
  | { kind: "item"; thread: Thread };

function scenarioLabel(id?: string): string {
  if (!id) return "未分类";
  return SCENARIOS.find((s) => s.id === id)?.name ?? id;
}

export function SessionsSection() {
  const threads = useThreadsStore((s) => s.threads);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? threads.filter((t) => t.title.toLowerCase().includes(q))
      : threads;

    const groups = new Map<string, Thread[]>();
    for (const thread of filtered) {
      const key = thread.scenarioId ?? "__none";
      const bucket = groups.get(key);
      if (bucket) bucket.push(thread);
      else groups.set(key, [thread]);
    }

    const out: Row[] = [];
    for (const [key, items] of groups) {
      out.push({
        kind: "group",
        label: scenarioLabel(key === "__none" ? undefined : key),
        count: items.length,
      });
      for (const thread of items) out.push({ kind: "item", thread });
    }
    return out;
  }, [threads, query]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  if (!expanded) {
    const recent = threads.slice(0, RECENT_LIMIT);
    return (
      <section>
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-sm font-semibold">最近会话</h2>
          {threads.length > RECENT_LIMIT && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
            >
              查看全部（{threads.length}）
            </Button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            暂无会话，试试上面的快速开始。
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recent.map((thread) => (
              <li key={thread.id}>
                <SessionRow thread={thread} />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-sm font-semibold">全部会话</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpanded(false);
            setQuery("");
          }}
        >
          收起
        </Button>
      </div>

      <label className="mb-2 flex h-9 items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-sm">
        <MagnifyingGlass size={16} className="shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索会话标题…"
          className="h-full flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div ref={parentRef} className="h-[60vh] overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]!;
            return (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: item.size,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                {row.kind === "group" ? (
                  <div className="flex h-full items-end gap-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-section-label">
                    {row.label}
                    <span className="text-muted-foreground/70">
                      · {row.count}
                    </span>
                  </div>
                ) : (
                  <SessionRow thread={row.thread} />
                )}
              </div>
            );
          })}
        </div>
        {rows.length === 0 && (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            没有匹配的会话
          </p>
        )}
      </div>
    </section>
  );
}
