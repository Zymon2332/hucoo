import { idbArtifactRepository, idbThreadRepository } from "./idb";
import { memoryArtifactRepository, memoryThreadRepository } from "./memory";
import type { Repositories } from "./repository";

const hasIndexedDb = typeof indexedDB !== "undefined";

export const repositories: Repositories = {
  threads: hasIndexedDb ? idbThreadRepository : memoryThreadRepository,
  artifacts: hasIndexedDb ? idbArtifactRepository : memoryArtifactRepository,
};
