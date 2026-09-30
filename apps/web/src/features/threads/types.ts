import type { RunState } from "@hucoo/streaming";
import type { ArtifactKind } from "@/features/artifact/artifact-types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  createdAt: number;
  text: string;
  run?: RunState;
}

export interface Thread {
  id: string;
  title: string;
  scenarioId?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ArtifactRevision {
  revision: number;
  content: string;
  createdAt: number;
  source: "agent" | "user";
}

export interface ArtifactRecord {
  id: string;
  threadId: string;
  kind: ArtifactKind;
  title: string;
  revisions: ArtifactRevision[];
  acceptedRevision: number;
  createdAt: number;
  updatedAt: number;
}

export function latestRevision(record: ArtifactRecord): ArtifactRevision | undefined {
  return record.revisions.at(-1);
}

export function acceptedRevision(
  record: ArtifactRecord,
): ArtifactRevision | undefined {
  return record.revisions.find((r) => r.revision === record.acceptedRevision);
}

export function hasPendingRevision(record: ArtifactRecord): boolean {
  const latest = latestRevision(record);
  return latest !== undefined && latest.revision !== record.acceptedRevision;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
