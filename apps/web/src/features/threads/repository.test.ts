import { describe, expect, it } from "vitest";
import { idbArtifactRepository, idbThreadRepository } from "./idb";
import { createMemoryThreadRepository } from "./memory";
import type { ArtifactRecord, Thread } from "./types";

function makeThread(id: string): Thread {
  return {
    id,
    title: `会话 ${id}`,
    createdAt: 1,
    updatedAt: 1,
    messages: [],
  };
}

function makeArtifact(id: string, threadId: string): ArtifactRecord {
  return {
    id,
    threadId,
    kind: "markdown",
    title: "文档",
    revisions: [{ revision: 1, content: "hello", createdAt: 1, source: "agent" }],
    acceptedRevision: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("memory thread repository", () => {
  it("saves, lists and removes", async () => {
    const repo = createMemoryThreadRepository();
    await repo.save(makeThread("t1"));
    await repo.save(makeThread("t2"));
    expect((await repo.list())).toHaveLength(2);
    expect((await repo.get("t1"))?.title).toBe("会话 t1");
    await repo.remove("t1");
    expect(await repo.get("t1")).toBeUndefined();
    expect(await repo.list()).toHaveLength(1);
  });
});

describe("indexeddb repositories", () => {
  it("round-trips a thread", async () => {
    await idbThreadRepository.save(makeThread("idb-t1"));
    const loaded = await idbThreadRepository.get("idb-t1");
    expect(loaded?.title).toBe("会话 idb-t1");
    expect((await idbThreadRepository.list()).some((t) => t.id === "idb-t1")).toBe(
      true,
    );
    await idbThreadRepository.remove("idb-t1");
    expect(await idbThreadRepository.get("idb-t1")).toBeUndefined();
  });

  it("round-trips an artifact record", async () => {
    await idbArtifactRepository.save(makeArtifact("idb-a1", "idb-t1"));
    const loaded = await idbArtifactRepository.get("idb-a1");
    expect(loaded?.revisions[0]?.content).toBe("hello");
    await idbArtifactRepository.remove("idb-a1");
    expect(await idbArtifactRepository.get("idb-a1")).toBeUndefined();
  });
});
