import type {
  AgentEvent,
  FinishReason,
  RunFinishReason,
  Usage,
} from "./events";

export type RunStatus = "idle" | "streaming" | "finished" | "error" | "interrupted";

export type ContentBlock =
  | {
      kind: "reasoning";
      id: string;
      text: string;
      status: "streaming" | "done";
      durationMs?: number;
    }
  | {
      kind: "text";
      id: string;
      text: string;
      status: "streaming" | "done";
      durationMs?: number;
    }
  | {
      kind: "tool";
      id: string;
      toolCallId: string;
      name: string;
      argsRaw: string;
      args?: unknown;
      status: "starting" | "args" | "ready" | "done" | "error";
      content?: string;
      isError?: boolean;
      durationMs?: number;
    };

export interface RunStep {
  messageId: string;
  blocks: ContentBlock[];
  finishReason?: FinishReason | null;
  rawFinishReason?: string | null;
  durationMs?: number;
  usage?: Usage;
}

export interface RunState {
  runId?: string;
  threadId?: string;
  model?: string;
  status: RunStatus;
  steps: RunStep[];
  usage?: Usage;
  durationMs?: number;
  finishReason?: RunFinishReason;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  interrupt?: { id: string; value: unknown };
  lastSeq: number;
}

export function createEmptyRun(): RunState {
  return { status: "idle", steps: [], lastSeq: 0 };
}

const isTerminal = (s: RunStatus) =>
  s === "finished" || s === "error" || s === "interrupted";

function closeOpenBlock(step: RunStep | undefined) {
  const last = step?.blocks.at(-1);
  if (last && last.status === "streaming") last.status = "done";
}

export function runReducer(state: RunState, event: AgentEvent): RunState {
  if (isTerminal(state.status)) return state;

  const next: RunState = { ...state, lastSeq: event.seq };
  const step = (): RunStep | undefined => next.steps.at(-1);

  switch (event.type) {
    case "run.start":
      return {
        ...next,
        status: "streaming",
        runId: event.run_id,
        threadId: event.thread_id,
        model: event.model,
      };

    case "step.start":
      return {
        ...next,
        status: next.status === "idle" ? "streaming" : next.status,
        steps: [...next.steps, { messageId: event.message_id, blocks: [] }],
      };

    case "reasoning.start":
    case "text.start": {
      const s = step();
      if (!s) return next;
      closeOpenBlock(s);
      const kind = event.type === "text.start" ? "text" : "reasoning";
      s.blocks.push({
        kind,
        id: `${event.message_id}:${kind}`,
        text: "",
        status: "streaming",
      });
      return { ...next, steps: [...next.steps] };
    }

    case "reasoning.delta":
    case "text.delta": {
      const s = step();
      if (!s) return next;
      const kind = event.type === "text.delta" ? "text" : "reasoning";
      let block = s.blocks.findLast((b) => b.kind === kind);
      if (!block) {
        closeOpenBlock(s);
        const created: ContentBlock =
          kind === "text"
            ? {
                kind: "text",
                id: `${event.message_id}:text`,
                text: "",
                status: "streaming",
              }
            : {
                kind: "reasoning",
                id: `${event.message_id}:reasoning`,
                text: "",
                status: "streaming",
              };
        s.blocks.push(created);
        block = created;
      }
      if (block.kind === "text" || block.kind === "reasoning") {
        block.text += event.delta;
      }
      return { ...next, steps: [...next.steps] };
    }

    case "reasoning.end":
    case "text.end": {
      const s = step();
      const kind = event.type === "text.end" ? "text" : "reasoning";
      const block = s?.blocks.findLast((b) => b.kind === kind);
      if (block && (block.kind === "text" || block.kind === "reasoning")) {
        block.status = "done";
        block.durationMs = event.duration_ms;
      }
      return { ...next, steps: [...next.steps] };
    }

    case "tool.start": {
      const s = step();
      if (!s) return next;
      closeOpenBlock(s);
      s.blocks.push({
        kind: "tool",
        id: event.tool_call_id,
        toolCallId: event.tool_call_id,
        name: event.name,
        argsRaw: "",
        status: "args",
      });
      return { ...next, steps: [...next.steps] };
    }

    case "tool.args": {
      const block = step()?.blocks.find(
        (b) => b.kind === "tool" && b.toolCallId === event.tool_call_id,
      );
      if (block?.kind === "tool") block.argsRaw += event.delta;
      return { ...next, steps: [...next.steps] };
    }

    case "tool.end": {
      const block = step()?.blocks.find(
        (b) => b.kind === "tool" && b.toolCallId === event.tool_call_id,
      );
      if (block?.kind === "tool") {
        block.status = "ready";
        block.args = event.args;
      }
      return { ...next, steps: [...next.steps] };
    }

    case "tool.result": {
      const block = step()?.blocks.find(
        (b) => b.kind === "tool" && b.toolCallId === event.tool_call_id,
      );
      if (block?.kind === "tool") {
        block.status = event.is_error ? "error" : "done";
        block.content = event.content;
        block.isError = event.is_error;
        block.durationMs = event.duration_ms;
      }
      return { ...next, steps: [...next.steps] };
    }

    case "step.end": {
      const s = step();
      if (s) {
        closeOpenBlock(s);
        s.finishReason = event.finish_reason;
        s.rawFinishReason = event.raw_finish_reason;
        s.durationMs = event.duration_ms;
        s.usage = event.usage;
      }
      return { ...next, steps: [...next.steps] };
    }

    case "run.finish":
      return {
        ...next,
        status: "finished",
        finishReason: event.finish_reason,
        usage: event.usage,
        durationMs: event.duration_ms,
      };

    case "run.error":
      return {
        ...next,
        status: "error",
        error: {
          code: event.code,
          message: event.message,
          details: event.details,
        },
      };

    case "interrupt":
      return {
        ...next,
        status: "interrupted",
        interrupt: { id: event.id, value: event.value },
      };

    default:
      return next;
  }
}
