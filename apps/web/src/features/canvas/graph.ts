import type { Edge, Node } from "@xyflow/react";
import {
  hasPendingRevision,
  type ArtifactRecord,
  type Thread,
} from "@/features/threads/types";

export interface ThreadNodeData extends Record<string, unknown> {
  kind: "thread";
  title: string;
  scenarioId?: string;
  messages: number;
  updatedAt: number;
}

export interface ArtifactNodeData extends Record<string, unknown> {
  kind: "artifact";
  title: string;
  artifactKind: string;
  pending: boolean;
}

export type CanvasNodeData = ThreadNodeData | ArtifactNodeData;
export type CanvasNode = Node<CanvasNodeData, "thread" | "artifact">;

const COLUMN_X = 380;
const ROW_HEIGHT = 148;
const ARTIFACT_GAP = 92;

export function buildGraph(
  threads: Thread[],
  artifacts: ArtifactRecord[],
): { nodes: CanvasNode[]; edges: Edge[] } {
  const nodes: CanvasNode[] = [];
  const edges: Edge[] = [];

  let y = 0;
  for (const thread of threads) {
    const threadArtifacts = artifacts.filter((a) => a.threadId === thread.id);
    const rowHeight = Math.max(1, threadArtifacts.length) * ARTIFACT_GAP + 56;
    const rowCenter = y + rowHeight / 2 - 56;

    nodes.push({
      id: `thread:${thread.id}`,
      type: "thread",
      position: { x: 0, y: rowCenter },
      data: {
        kind: "thread",
        title: thread.title,
        scenarioId: thread.scenarioId,
        messages: thread.messages.length,
        updatedAt: thread.updatedAt,
      },
    });

    threadArtifacts.forEach((artifact, index) => {
      nodes.push({
        id: `artifact:${artifact.id}`,
        type: "artifact",
        position: {
          x: COLUMN_X,
          y: y + index * ARTIFACT_GAP,
        },
        data: {
          kind: "artifact",
          title: artifact.title,
          artifactKind: artifact.kind,
          pending: hasPendingRevision(artifact),
        },
      });
      edges.push({
        id: `e:${thread.id}:${artifact.id}`,
        source: `thread:${thread.id}`,
        target: `artifact:${artifact.id}`,
        animated: hasPendingRevision(artifact),
      });
    });

    y += rowHeight + 24;
  }

  return { nodes, edges };
}
