import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUp } from "@phosphor-icons/react";
import { Button } from "@hucoo/ui/components/button";
import { parseComposerText } from "@/features/chat/composer-payload";
import { setPendingInput } from "@/features/chat/pending-input";
import { useThreadsStore } from "@/features/threads/threads-store";

export function QuickStart() {
  const create = useThreadsStore((s) => s.create);
  const navigate = useNavigate();
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value) return;
    const { tools, mentions } = parseComposerText(value);
    const thread = create({ title: value.slice(0, 24) });
    setPendingInput(thread.id, { text: value, tools, mentions, attachments: [] });
    void navigate({ to: "/t/$threadId", params: { threadId: thread.id } });
  }

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-border bg-card p-2 shadow-[var(--shadow-card)]">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="描述你的目标，开始一个新会话…"
        className="h-9 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Button
        size="icon-sm"
        onClick={submit}
        disabled={!text.trim()}
        aria-label="发送"
      >
        <ArrowUp size={16} weight="bold" />
      </Button>
    </div>
  );
}
