import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChatsCircle,
  DotsThree,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@hucoo/ui/components/badge";
import { Button } from "@hucoo/ui/components/button";
import { Input } from "@hucoo/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hucoo/ui/components/dropdown-menu";
import { cn } from "@hucoo/ui";
import { SCENARIOS } from "@/features/agents/data";
import { useThreadsStore } from "./threads-store";
import { formatRelative } from "./relative-time";
import type { Thread } from "./types";

function scenarioName(id?: string): string | undefined {
  if (!id) return undefined;
  return SCENARIOS.find((s) => s.id === id)?.name ?? id;
}

export function SessionRow({ thread }: { thread: Thread }) {
  const remove = useThreadsStore((s) => s.remove);
  const restore = useThreadsStore((s) => s.restore);
  const rename = useThreadsStore((s) => s.rename);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title);
  const active = pathname === `/t/${thread.id}`;
  const scenario = scenarioName(thread.scenarioId);

  function commitRename() {
    rename(thread.id, draft.trim() || thread.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-11"
      />
    );
  }

  return (
    <div className="group relative">
      <Link
        to="/t/$threadId"
        params={{ threadId: thread.id }}
        className={cn(
          "flex h-11 items-center gap-2 rounded-[10px] border border-transparent px-3 pr-10 transition-colors hover:bg-secondary",
          active && "border-border bg-card shadow-[var(--shadow-card)]",
        )}
      >
        <ChatsCircle size={16} className="shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{thread.title}</span>
        {scenario && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {scenario}
          </Badge>
        )}
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {thread.messages.length} 条 · {formatRelative(thread.updatedAt)}
        </span>
      </Link>

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="会话操作">
              <DotsThree size={16} weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setDraft(thread.title);
                setEditing(true);
              }}
            >
              <PencilSimple size={14} />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                remove(thread.id);
                if (active) void navigate({ to: "/" });
                toast("已删除会话", {
                  action: { label: "撤销", onClick: () => restore(thread) },
                });
              }}
            >
              <Trash size={14} />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
