import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Cube, Robot } from "@phosphor-icons/react";
import { Badge } from "@hucoo/ui/components/badge";
import { cn } from "@hucoo/ui";
import { SCENARIOS } from "@/features/agents/data";
import type { ArtifactNodeData, ThreadNodeData } from "./graph";

type ThreadNode = Node<ThreadNodeData, "thread">;
type ArtifactNode = Node<ArtifactNodeData, "artifact">;

const KIND_LABEL: Record<string, string> = {
  markdown: "文档",
  code: "代码",
  table: "表格",
  html: "网页",
};

function scenarioName(id?: string): string | undefined {
  if (!id) return undefined;
  return SCENARIOS.find((s) => s.id === id)?.name ?? id;
}

export function ThreadNodeView({ data, selected }: NodeProps<ThreadNode>) {
  return (
    <div
      className={cn(
        "w-64 rounded-[var(--radius-card)] border border-border bg-card p-3 shadow-[var(--shadow-card)]",
        selected && "ring-2 ring-ring/50",
      )}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-0 !bg-border"
      />
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Robot size={15} weight="fill" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {data.title}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {data.scenarioId && (
          <Badge variant="secondary" className="text-[10px]">
            {scenarioName(data.scenarioId)}
          </Badge>
        )}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {data.messages} 条
        </span>
      </div>
    </div>
  );
}

export function ArtifactNodeView({ data, selected }: NodeProps<ArtifactNode>) {
  return (
    <div
      className={cn(
        "w-56 rounded-[var(--radius-card)] border bg-card p-3 shadow-[var(--shadow-card)]",
        data.pending ? "border-warning/50" : "border-border",
        selected && "ring-2 ring-ring/50",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-0 !bg-border"
      />
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
          <Cube size={15} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {data.title}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {KIND_LABEL[data.artifactKind] ?? data.artifactKind}
        </Badge>
        {data.pending && (
          <span className="ml-auto text-[11px] text-warning">待审阅</span>
        )}
      </div>
    </div>
  );
}
