import { Link } from "@tanstack/react-router";
import { ArrowRight, Cube, Path, Sparkle } from "@phosphor-icons/react";
import { Card } from "@hucoo/ui/components/card";
import { Badge } from "@hucoo/ui/components/badge";
import { Button } from "@hucoo/ui/components/button";
import { SCENARIOS } from "@/features/agents/data";
import { useThreadsStore } from "@/features/threads/threads-store";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import { hasPendingRevision } from "@/features/threads/types";
import { formatRelative } from "@/features/threads/relative-time";
import type { Thread } from "@/features/threads/types";

const KIND_LABEL: Record<string, string> = {
  markdown: "文档",
  code: "代码",
  table: "表格",
  html: "网页",
};

function CardShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </Card>
  );
}

function ContinueCard({ thread }: { thread?: Thread }) {
  return (
    <CardShell icon={<Path size={14} />} title="继续上次">
      {thread ? (
        <>
          <p className="truncate text-sm font-medium">{thread.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {thread.scenarioId
              ? `${SCENARIOS.find((s) => s.id === thread.scenarioId)?.name ?? ""} · `
              : ""}
            {formatRelative(thread.updatedAt)}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
            <Link to="/t/$threadId" params={{ threadId: thread.id }}>
              继续
              <ArrowRight size={14} />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">还没有进行中的会话。</p>
          <Button asChild size="sm" className="mt-auto w-fit">
            <Link to="/t/$threadId" params={{ threadId: "new" }}>
              新建会话
            </Link>
          </Button>
        </>
      )}
    </CardShell>
  );
}

function RecentArtifactCard() {
  const records = useArtifactsStore((s) => s.records);
  const latest = [...records].sort((a, b) => b.updatedAt - a.updatedAt)[0];

  return (
    <CardShell icon={<Cube size={14} />} title="最近产物">
      {latest ? (
        <>
          <p className="truncate text-sm font-medium">{latest.title}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {KIND_LABEL[latest.kind] ?? latest.kind}
            </Badge>
            {hasPendingRevision(latest) && (
              <span className="text-[11px] text-warning">待审阅</span>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-auto w-fit">
            <Link
              to="/artifacts/$artifactId"
              params={{ artifactId: latest.id }}
            >
              打开
              <ArrowRight size={14} />
            </Link>
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">还没有产物。</p>
      )}
    </CardShell>
  );
}

function UsageCard() {
  const count = useThreadsStore((s) => s.threads.length);
  const tokens = (count * 4.2).toFixed(1);

  return (
    <CardShell icon={<Sparkle size={14} />} title="我的用量">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums">{count}</span>
        <span className="text-xs text-muted-foreground">本月会话</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums">{tokens}k</span>
        <span className="text-xs text-muted-foreground">Token</span>
      </div>
      <p className="mt-auto text-[11px] text-muted-foreground">
        示例数据（后端接入后替换）
      </p>
    </CardShell>
  );
}

export function QuickEntries() {
  const threads = useThreadsStore((s) => s.threads);
  const lastThread = [...threads].sort((a, b) => b.updatedAt - a.updatedAt)[0];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ContinueCard thread={lastThread} />
      <RecentArtifactCard />
      <UsageCard />
    </div>
  );
}
