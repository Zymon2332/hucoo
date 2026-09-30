import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useThreadsStore } from "@/features/threads/threads-store";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import { buildGraph, type CanvasNode } from "./graph";
import { ArtifactNodeView, ThreadNodeView } from "./canvas-nodes";

const nodeTypes: NodeTypes = {
  thread: ThreadNodeView,
  artifact: ArtifactNodeView,
};

export function CanvasView() {
  const threads = useThreadsStore((s) => s.threads);
  const hydrated = useThreadsStore((s) => s.hydrated);
  const records = useArtifactsStore((s) => s.records);
  const navigate = useNavigate();

  const { nodes, edges } = useMemo(
    () => buildGraph(threads, records),
    [threads, records],
  );

  const onNodeClick: NodeMouseHandler<CanvasNode> = (_event, node) => {
    const [kind, id] = node.id.split(":");
    if (!id) return;
    if (kind === "thread") {
      void navigate({ to: "/t/$threadId", params: { threadId: id } });
    } else if (kind === "artifact") {
      void navigate({ to: "/artifacts/$artifactId", params: { artifactId: id } });
    }
  };

  if (hydrated && threads.length === 0) {
    return (
      <div className="grid h-full place-items-center pt-8 text-sm text-muted-foreground">
        暂无会话与产物，去「工作台」新建一个吧。
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        className="[&_.react-flow__node]:cursor-pointer"
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
