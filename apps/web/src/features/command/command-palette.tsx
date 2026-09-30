import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@hucoo/ui/components/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@hucoo/ui/components/command";
import { setTheme } from "@/lib/theme";
import { useThreadsStore } from "@/features/threads/threads-store";
import type { Thread } from "@/features/threads/types";
import { searchCommands, type Command as CommandDef } from "./registry";
import { useCommandStore } from "./command-store";

const MAX_SESSION_RESULTS = 5;
const MAX_MESSAGE_RESULTS = 5;

function snippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, index - 16);
  const slice = text.slice(start, start + 60).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${text.length > start + 60 ? "…" : ""}`;
}

export function CommandPalette() {
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const toggle = useCommandStore((s) => s.toggle);
  const navigate = useNavigate();
  const threads = useThreadsStore((s) => s.threads);
  const [query, setQuery] = useState("");

  const staticCommands = useMemo<CommandDef[]>(
    () => [
      {
        id: "nav.dashboard",
        title: "前往 首页",
        group: "导航",
        keywords: ["home", "dashboard", "首页"],
        run: () => navigate({ to: "/" }),
      },
      {
        id: "nav.inbox",
        title: "前往 收件箱",
        group: "导航",
        keywords: ["inbox", "通知", "待处理"],
        run: () => navigate({ to: "/inbox" }),
      },
      {
        id: "nav.canvas",
        title: "前往 画布",
        group: "导航",
        keywords: ["canvas", "画布", "全景"],
        run: () => navigate({ to: "/canvas" }),
      },
      {
        id: "nav.agents",
        title: "前往 场景目录",
        group: "导航",
        keywords: ["agents", "场景", "市场"],
        run: () => navigate({ to: "/agents" }),
      },
      {
        id: "nav.new",
        title: "新建会话",
        group: "操作",
        keywords: ["new", "chat", "会话"],
        shortcut: "⌘N",
        run: () => navigate({ to: "/t/$threadId", params: { threadId: "new" } }),
      },
      {
        id: "theme.toggle",
        title: "切换主题",
        group: "操作",
        keywords: ["theme", "dark", "light", "暗色", "亮色"],
        run: () => {
          const isDark = document.documentElement.classList.contains("dark");
          setTheme(isDark ? "light" : "dark");
        },
      },
    ],
    [navigate],
  );

  const dynamicCommands = useMemo<CommandDef[]>(() => {
    const q = query.trim().toLowerCase();
    const openThread = (id: string) => () =>
      navigate({ to: "/t/$threadId", params: { threadId: id } });

    if (!q) {
      return threads
        .slice(0, MAX_SESSION_RESULTS)
        .map((thread) => ({
          id: `session:${thread.id}`,
          title: thread.title,
          group: "最近会话",
          run: openThread(thread.id),
        }));
    }

    const sessions = threads
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, MAX_SESSION_RESULTS)
      .map((thread) => ({
        id: `session:${thread.id}`,
        title: thread.title,
        group: "会话",
        run: openThread(thread.id),
      }));

    const messages: CommandDef[] = [];
    for (const thread of threads) {
      for (const message of thread.messages) {
        if (messages.length >= MAX_MESSAGE_RESULTS) break;
        if (message.text && message.text.toLowerCase().includes(q)) {
          messages.push({
            id: `message:${message.id}`,
            title: `${thread.title} · ${snippet(message.text, q)}`,
            group: "消息",
            run: openThread(thread.id),
          });
        }
      }
      if (messages.length >= MAX_MESSAGE_RESULTS) break;
    }

    return [...sessions, ...messages];
  }, [threads, query, navigate]);

  const results = useMemo(
    () => searchCommands([...dynamicCommands, ...staticCommands], query),
    [dynamicCommands, staticCommands, query],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const groups: { label: string; items: CommandDef[] }[] = [];
  for (const command of results) {
    let group = groups.find((g) => g.label === command.group);
    if (!group) {
      group = { label: command.group, items: [] };
      groups.push(group);
    }
    group.items.push(command);
  }

  function runCommand(command: CommandDef) {
    setOpen(false);
    command.run();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <Command shouldFilter={false} loop>
          <CommandInput
            placeholder="搜索命令、会话、消息…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>没有结果</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    onSelect={() => runCommand(command)}
                  >
                    {command.title}
                    {command.shortcut && (
                      <CommandShortcut>{command.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
