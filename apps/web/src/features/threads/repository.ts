import type { ArtifactRecord, Thread } from "./types";

export interface ThreadRepository {
  list(): Promise<Thread[]>;
  get(id: string): Promise<Thread | undefined>;
  save(thread: Thread): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ArtifactRepository {
  list(): Promise<ArtifactRecord[]>;
  get(id: string): Promise<ArtifactRecord | undefined>;
  save(record: ArtifactRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface Repositories {
  threads: ThreadRepository;
  artifacts: ArtifactRepository;
}
