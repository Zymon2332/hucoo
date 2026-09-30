import type { RawSseEvent } from "./parse-sse";

export interface EventBase {
  v: 1;
  run_id: string;
  seq: number;
  ts: number;
}

export type FinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "refusal"
  | "error"
  | "other";

export type RunFinishReason = "stop" | "interrupted" | "error" | "cancelled";

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_tokens?: number;
}

export type AgentEvent =
  | (EventBase & { type: "run.start"; thread_id: string; model: string })
  | (EventBase & {
      type: "run.finish";
      finish_reason: RunFinishReason;
      usage?: Usage;
      duration_ms: number;
    })
  | (EventBase & {
      type: "run.error";
      code: string;
      message: string;
      retryable: boolean;
      details?: unknown;
    })
  | (EventBase & { type: "step.start"; message_id: string })
  | (EventBase & {
      type: "step.end";
      message_id: string;
      finish_reason?: FinishReason | null;
      raw_finish_reason?: string | null;
      duration_ms: number;
      usage?: Usage;
    })
  | (EventBase & { type: "reasoning.start"; message_id: string })
  | (EventBase & { type: "reasoning.delta"; message_id: string; delta: string })
  | (EventBase & { type: "reasoning.end"; message_id: string; duration_ms: number })
  | (EventBase & { type: "text.start"; message_id: string })
  | (EventBase & { type: "text.delta"; message_id: string; delta: string })
  | (EventBase & { type: "text.end"; message_id: string; duration_ms: number })
  | (EventBase & {
      type: "tool.start";
      tool_call_id: string;
      name: string;
      message_id: string;
    })
  | (EventBase & { type: "tool.args"; tool_call_id: string; delta: string })
  | (EventBase & { type: "tool.end"; tool_call_id: string; args?: unknown })
  | (EventBase & {
      type: "tool.result";
      tool_call_id: string;
      name: string;
      content: string;
      is_error: boolean;
      duration_ms: number;
    })
  | (EventBase & { type: "state"; patch: unknown })
  | (EventBase & { type: "interrupt"; id: string; value: unknown })
  | (EventBase & { type: "custom"; name: string; data: unknown });

const KNOWN = new Set<AgentEvent["type"]>([
  "run.start",
  "run.finish",
  "run.error",
  "step.start",
  "step.end",
  "reasoning.start",
  "reasoning.delta",
  "reasoning.end",
  "text.start",
  "text.delta",
  "text.end",
  "tool.start",
  "tool.args",
  "tool.end",
  "tool.result",
  "state",
  "interrupt",
  "custom",
]);

export function decodeAgentEvent(raw: RawSseEvent): AgentEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.data);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  if (obj.v !== 1) return null;

  const type = (obj.type ?? raw.event) as AgentEvent["type"];
  if (!KNOWN.has(type)) return null;

  return { ...obj, type } as AgentEvent;
}
