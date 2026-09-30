import { describe, expect, it } from "vitest";
import { buildGraph } from "./graph";
import type { ArtifactRecord, Thread } from "@/features/threads/types";

function thread(id: string, scenarioId?: string): Thread {
  return {
    id,
    title: `会话 ${id}`,
    scenarioId,
    createdAt: 1,
    updatedAt: 1,
    messages: [],
  };
}

function artifact(id: string, threadId: string): ArtifactRecord {
  return {
    id,
    threadId,
    kind: "markdown",
    title: `产物 ${id}`,
    revisions: [{ revision: 1, content: "x", createdAt: 1, source: "agent" }],
    acceptedRevision: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("buildGraph", () => {
  it("creates a node per thread and artifact, with an edge between them", () => {
    const { nodes, edges } = buildGraph([thread("t1", "s1")], [artifact("a1", "t1")]);
    expect(nodes.map((n) => n.id).sort()).toEqual([
      "artifact:a1",
      "thread:t1",
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: "thread:t1",
      target: "artifact:a1",
    });
  });

  it("marks pending revisions on artifacts", () => {
    const record = artifact("a1", "t1");
    const pending: ArtifactRecord = {
      ...record,
      revisions: [
        ...record.revisions,
        { revision: 2, content: "y", createdAt: 2, source: "agent" },
      ],
    };
    const { nodes, edges } = buildGraph([thread("t1")], [pending]);
    const artifactNode = nodes.find((n) => n.id === "artifact:a1");
    expect(artifactNode?.data.pending).toBe(true);
    expect(edges[0]?.animated).toBe(true);
  });

  it("only links artifacts to their own thread", () => {
    const { edges } = buildGraph(
      [thread("t1"), thread("t2")],
      [artifact("a1", "t2")],
    );
    expect(edges).toHaveLength(1);
    expect(edges[0]?.source).toBe("thread:t2");
  });
});
