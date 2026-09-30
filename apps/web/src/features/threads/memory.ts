import type { ArtifactRecord, Thread } from "./types";
import type { ArtifactRepository, ThreadRepository } from "./repository";

export function createMemoryThreadRepository(): ThreadRepository {
  const map = new Map<string, Thread>();
  return {
    async list() {
      return [...map.values()];
    },
    async get(id) {
      return map.get(id);
    },
    async save(thread) {
      map.set(thread.id, thread);
    },
    async remove(id) {
      map.delete(id);
    },
  };
}

export function createMemoryArtifactRepository(): ArtifactRepository {
  const map = new Map<string, ArtifactRecord>();
  return {
    async list() {
      return [...map.values()];
    },
    async get(id) {
      return map.get(id);
    },
    async save(record) {
      map.set(record.id, record);
    },
    async remove(id) {
      map.delete(id);
    },
  };
}

export const memoryThreadRepository = createMemoryThreadRepository();
export const memoryArtifactRepository = createMemoryArtifactRepository();
