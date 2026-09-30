import { createStore, del, get, set, values } from "idb-keyval";
import type { ArtifactRecord, Thread } from "./types";
import type { ArtifactRepository, ThreadRepository } from "./repository";

const threadStore = createStore("hucoo-threads", "threads");
const artifactStore = createStore("hucoo-artifacts", "artifacts");

export const idbThreadRepository: ThreadRepository = {
  async list() {
    return (await values<Thread>(threadStore)) ?? [];
  },
  async get(id) {
    return get<Thread>(id, threadStore);
  },
  async save(thread) {
    await set(thread.id, thread, threadStore);
  },
  async remove(id) {
    await del(id, threadStore);
  },
};

export const idbArtifactRepository: ArtifactRepository = {
  async list() {
    return (await values<ArtifactRecord>(artifactStore)) ?? [];
  },
  async get(id) {
    return get<ArtifactRecord>(id, artifactStore);
  },
  async save(record) {
    await set(record.id, record, artifactStore);
  },
  async remove(id) {
    await del(id, artifactStore);
  },
};
