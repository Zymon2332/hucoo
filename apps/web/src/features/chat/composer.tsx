import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Paperclip, Stop, Wrench, X } from "@phosphor-icons/react";
import { Card } from "@hucoo/ui/components/card";
import { Button } from "@hucoo/ui/components/button";
import { Textarea } from "@hucoo/ui/components/textarea";
import { Badge } from "@hucoo/ui/components/badge";
import { cn } from "@hucoo/ui";
import { SCENARIOS } from "@/features/agents/data";
import { parseComposerText, type SendPayload } from "./composer-payload";

const TOOLS = [
  { name: "query_metrics", description: "查询指标数据" },
  { name: "create_document", description: "生成文档产物" },
  { name: "search_knowledge", description: "检索企业知识库" },
  { name: "send_notification", description: "发送通知" },
];

interface Attachment {
  id: string;
  name: string;
}

interface MenuOption {
  value: string;
  label: string;
  description?: string;
}

interface ActiveToken {
  kind: "slash" | "mention";
  query: string;
  start: number;
}

function detectToken(text: string): ActiveToken | null {
  const match = /(?:^|\s)([/@])([\w\u4e00-\u9fa5-]*)$/.exec(text);
  if (!match) return null;
  const query = match[2] ?? "";
  return {
    kind: match[1] === "/" ? "slash" : "mention",
    query,
    start: text.length - query.length - 1,
  };
}

function draftKey(threadId: string) {
  return `hucoo-draft:${threadId}`;
}

export function Composer({
  onSend,
  isStreaming,
  onStop,
  threadId,
}: {
  onSend: (payload: SendPayload) => void;
  isStreaming: boolean;
  onStop: () => void;
  threadId: string;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [menuIndex, setMenuIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(localStorage.getItem(draftKey(threadId)) ?? "");
    setAttachments([]);
  }, [threadId]);

  useEffect(() => {
    if (text) localStorage.setItem(draftKey(threadId), text);
    else localStorage.removeItem(draftKey(threadId));
  }, [text, threadId]);

  const token = detectToken(text);
  const menu = useMemo<MenuOption[]>(() => {
    if (!token) return [];
    const q = token.query.toLowerCase();
    const source =
      token.kind === "slash"
        ? TOOLS.map((t) => ({
            value: t.name,
            label: t.name,
            description: t.description,
          }))
        : SCENARIOS.map((s) => ({
            value: s.name,
            label: s.name,
            description: s.category,
          }));
    return source
      .filter(
        (option) =>
          option.label.toLowerCase().includes(q) ||
          (option.description ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [token]);

  useEffect(() => {
    setMenuIndex(0);
  }, [token?.query, token?.kind]);

  function applyOption(option: MenuOption) {
    if (!token) return;
    const prefix = token.kind === "slash" ? "/" : "@";
    setText(`${text.slice(0, token.start)}${prefix}${option.value} `);
    textareaRef.current?.focus();
  }

  function submit() {
    const value = text.trim();
    if ((!value && attachments.length === 0) || isStreaming) return;
    const { tools, mentions } = parseComposerText(value);
    onSend({
      text: value,
      tools,
      mentions,
      attachments: attachments.map((a) => a.name),
    });
    setText("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (menu.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMenuIndex((i) => (i + 1) % menu.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMenuIndex((i) => (i - 1 + menu.length) % menu.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        applyOption(menu[menuIndex]!);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setText((t) => t.replace(/[/@][\w\u4e00-\u9fa5-]*$/, ""));
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    setAttachments((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
      })),
    ]);
  }

  return (
    <div className="relative">
      {menu.length > 0 && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 gap-0 overflow-hidden p-0 shadow-[var(--shadow-card)]">
          {menu.map((option, i) => (
            <button
              key={option.value}
              type="button"
              onMouseEnter={() => setMenuIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                applyOption(option);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                i === menuIndex ? "bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              <Wrench size={14} className="shrink-0 text-muted-foreground" />
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <span className="truncate text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
            </button>
          ))}
        </Card>
      )}

      <Card className="gap-0 p-2 shadow-[var(--shadow-card)]">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-1.5">
            {attachments.map((file) => (
              <Badge key={file.id} variant="secondary" className="gap-1">
                <Paperclip size={11} />
                {file.name}
                <button
                  type="button"
                  aria-label={`移除 ${file.name}`}
                  onClick={() =>
                    setAttachments((prev) => prev.filter((f) => f.id !== file.id))
                  }
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={11} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="描述你的目标…（Enter 发送，Shift+Enter 换行，/ 工具，@ 场景）"
          className="max-h-[200px] min-h-0 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="添加附件"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={16} />
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5">
                /
              </kbd>{" "}
              工具 ·{" "}
              <kbd className="rounded border border-border bg-secondary px-1 py-0.5">
                @
              </kbd>{" "}
              场景
            </span>
          </div>

          {isStreaming ? (
            <Button type="button" variant="outline" size="sm" onClick={onStop}>
              <Stop size={13} weight="fill" />
              停止
            </Button>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              onClick={submit}
              disabled={!text.trim() && attachments.length === 0}
              aria-label="发送"
            >
              <ArrowUp size={16} weight="bold" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
