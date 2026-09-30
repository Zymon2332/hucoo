import { beforeEach, describe, expect, it } from "vitest";
import { useArtifactsStore } from "./artifact-store";
import { hasPendingRevision, latestRevision } from "@/features/threads/types";

function reset() {
  useArtifactsStore.setState({ records: [], activeId: undefined });
}

const base = {
  id: "art1",
  kind: "markdown" as const,
  title: "文档",
};

describe("artifacts store", () => {
  beforeEach(reset);

  it("creates a record with an accepted first revision", () => {
    useArtifactsStore
      .getState()
      .applyArtifact("th1", { ...base, content: "v1" });
    const record = useArtifactsStore.getState().get("art1");
    expect(record?.revisions).toHaveLength(1);
    expect(record?.acceptedRevision).toBe(1);
    expect(hasPendingRevision(record!)).toBe(false);
    expect(useArtifactsStore.getState().activeId).toBe("art1");
  });

  it("ignores an unchanged artifact", () => {
    const store = useArtifactsStore.getState();
    store.applyArtifact("th1", { ...base, content: "v1" });
    store.applyArtifact("th1", { ...base, content: "v1" });
    expect(useArtifactsStore.getState().get("art1")?.revisions).toHaveLength(1);
  });

  it("appends a pending revision on change", () => {
    const store = useArtifactsStore.getState();
    store.applyArtifact("th1", { ...base, content: "v1" });
    store.applyArtifact("th1", { ...base, content: "v2" });
    const record = useArtifactsStore.getState().get("art1");
    expect(record?.revisions).toHaveLength(2);
    expect(hasPendingRevision(record!)).toBe(true);
  });

  it("accepts the latest revision", () => {
    const store = useArtifactsStore.getState();
    store.applyArtifact("th1", { ...base, content: "v1" });
    store.applyArtifact("th1", { ...base, content: "v2" });
    useArtifactsStore.getState().accept("art1");
    const record = useArtifactsStore.getState().get("art1");
    expect(record?.acceptedRevision).toBe(2);
    expect(hasPendingRevision(record!)).toBe(false);
  });

  it("rejects back to the accepted revision", () => {
    const store = useArtifactsStore.getState();
    store.applyArtifact("th1", { ...base, content: "v1" });
    store.applyArtifact("th1", { ...base, content: "v2" });
    useArtifactsStore.getState().reject("art1");
    const record = useArtifactsStore.getState().get("art1");
    expect(record?.revisions).toHaveLength(1);
    expect(latestRevision(record!)?.content).toBe("v1");
  });

  it("filters artifacts by thread", () => {
    const store = useArtifactsStore.getState();
    store.applyArtifact("th1", { ...base, id: "a1", content: "x" });
    store.applyArtifact("th2", { ...base, id: "a2", content: "y" });
    expect(useArtifactsStore.getState().forThread("th1")).toHaveLength(1);
    expect(useArtifactsStore.getState().forThread("th2")).toHaveLength(1);
  });
});
