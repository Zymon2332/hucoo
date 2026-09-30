import type { ContentBlock, RunState, RunStatus } from "@hucoo/streaming";

export function extractText(run: RunState): string {
  return run.steps
    .flatMap((step) => step.blocks)
    .filter((block): block is Extract<ContentBlock, { kind: "text" }> =>
      block.kind === "text",
    )
    .map((block) => block.text)
    .join("\n\n")
    .trim();
}

export function isTerminalStatus(status: RunStatus): boolean {
  return status === "finished" || status === "error" || status === "interrupted";
}
