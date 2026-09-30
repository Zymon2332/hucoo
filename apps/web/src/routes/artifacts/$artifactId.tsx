import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import { ArtifactPane } from "@/features/artifact/artifact-pane";

export const Route = createFileRoute("/artifacts/$artifactId")({
  component: Artifact,
});

function Artifact() {
  const { artifactId } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useArtifactsStore((s) => s.hydrated);
  const records = useArtifactsStore((s) => s.records);
  const setActive = useArtifactsStore((s) => s.setActive);
  const accept = useArtifactsStore((s) => s.accept);
  const reject = useArtifactsStore((s) => s.reject);

  const record = records.find((r) => r.id === artifactId);

  useEffect(() => {
    if (record) setActive(record.id);
  }, [record, setActive]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl pt-8 text-sm text-muted-foreground">
        正在载入产物…
      </div>
    );
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 pt-8">
        <p className="text-sm text-muted-foreground">产物不存在或已删除。</p>
        <Link
          to="/"
          className="inline-flex h-9 items-center rounded-[10px] border border-border px-4 text-sm font-medium"
        >
          返回工作台
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Link
          to="/t/$threadId"
          params={{ threadId: record.threadId }}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 返回会话
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{record.title}</h1>
      <div className="h-[70vh] overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]">
        <ArtifactPane
          records={[record]}
          activeId={record.id}
          onSelect={setActive}
          onAccept={accept}
          onReject={reject}
          onClose={() =>
            void navigate({
              to: "/t/$threadId",
              params: { threadId: record.threadId },
            })
          }
        />
      </div>
    </div>
  );
}
