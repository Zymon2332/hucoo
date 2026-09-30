import { create } from "zustand";
import { repositories } from "@/features/threads/repo";
import {
  latestRevision,
  type ArtifactRecord,
  type ArtifactRevision,
} from "@/features/threads/types";
import type { Artifact } from "./artifact-types";

interface ArtifactsStore {
  records: ArtifactRecord[];
  activeId?: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  applyArtifact: (threadId: string, artifact: Artifact) => void;
  accept: (id: string) => void;
  reject: (id: string) => void;
  setActive: (id: string) => void;
  get: (id: string) => ArtifactRecord | undefined;
  forThread: (threadId: string) => ArtifactRecord[];
}

function persist(record: ArtifactRecord | undefined) {
  if (record) void repositories.artifacts.save(record);
}

export const useArtifactsStore = create<ArtifactsStore>((set, get) => ({
  records: [],
  activeId: undefined,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const records = await repositories.artifacts.list();
    set({ records, hydrated: true });
  },

  applyArtifact: (threadId, artifact) =>
    set((s) => {
      const existing = s.records.find((r) => r.id === artifact.id);
      const now = Date.now();

      if (!existing) {
        const record: ArtifactRecord = {
          id: artifact.id,
          threadId,
          kind: artifact.kind,
          title: artifact.title,
          revisions: [
            {
              revision: 1,
              content: artifact.content,
              createdAt: now,
              source: "agent",
            },
          ],
          acceptedRevision: 1,
          createdAt: now,
          updatedAt: now,
        };
        persist(record);
        return {
          records: [...s.records, record],
          activeId: s.activeId ?? record.id,
        };
      }

      const latest = latestRevision(existing);
      if (latest && latest.content === artifact.content) return s;

      const revision: ArtifactRevision = {
        revision: (latest?.revision ?? 0) + 1,
        content: artifact.content,
        createdAt: now,
        source: "agent",
      };
      const record: ArtifactRecord = {
        ...existing,
        kind: artifact.kind,
        title: artifact.title,
        revisions: [...existing.revisions, revision],
        updatedAt: now,
      };
      persist(record);
      return {
        records: s.records.map((r) => (r.id === record.id ? record : r)),
      };
    }),

  accept: (id) =>
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== id) return r;
        const latest = latestRevision(r);
        if (!latest) return r;
        const next = { ...r, acceptedRevision: latest.revision };
        persist(next);
        return next;
      }),
    })),

  reject: (id) =>
    set((s) => ({
      records: s.records.map((r) => {
        if (r.id !== id) return r;
        const next = {
          ...r,
          revisions: r.revisions.filter((rev) => rev.revision <= r.acceptedRevision),
        };
        persist(next);
        return next;
      }),
    })),

  setActive: (id) => set({ activeId: id }),

  get: (id) => get().records.find((r) => r.id === id),

  forThread: (threadId) => get().records.filter((r) => r.threadId === threadId),
}));
