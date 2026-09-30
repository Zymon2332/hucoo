import type { AgentEvent } from "@hucoo/streaming";

export type ArtifactKind = "markdown" | "code" | "table" | "html";

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
}

const KINDS: ReadonlySet<string> = new Set(["markdown", "code", "table", "html"]);

function isArtifact(value: unknown): value is Artifact {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.content === "string" &&
    typeof v.kind === "string" &&
    KINDS.has(v.kind)
  );
}

export function artifactFromEvent(event: AgentEvent): Artifact | null {
  if (event.type !== "custom" || event.name !== "artifact") return null;
  return isArtifact(event.data) ? event.data : null;
}
