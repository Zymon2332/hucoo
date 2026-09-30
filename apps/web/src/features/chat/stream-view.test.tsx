import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  createEmptyRun,
  runReducer,
  type AgentEvent,
  type RunState,
} from "@hucoo/streaming";
import { StreamView } from "./stream-view";

const base = { v: 1 as const, run_id: "r1", seq: 1, ts: 0 };

function stateFrom(events: AgentEvent[]): RunState {
  return events.reduce(runReducer, createEmptyRun());
}

describe("StreamView", () => {
  it("renders reasoning, tool timeline and streamed text", () => {
    const run = stateFrom([
      { ...base, type: "run.start", thread_id: "t1", model: "m" },
      { ...base, type: "step.start", message_id: "m1" },
      { ...base, type: "reasoning.start", message_id: "m1" },
      { ...base, type: "reasoning.delta", message_id: "m1", delta: "先思考" },
      { ...base, type: "reasoning.end", message_id: "m1", duration_ms: 400 },
      { ...base, type: "text.start", message_id: "m1" },
      { ...base, type: "text.delta", message_id: "m1", delta: "结果是 **42**" },
      { ...base, type: "tool.start", tool_call_id: "c1", name: "query_metrics", message_id: "m1" },
      { ...base, type: "tool.end", tool_call_id: "c1", args: { range: "q" } },
      { ...base, type: "tool.result", tool_call_id: "c1", name: "query_metrics", content: "ok", is_error: false, duration_ms: 10 },
    ]);

    render(<StreamView run={run} />);

    expect(screen.getByText(/思考/)).toBeInTheDocument();
    expect(screen.getByText("query_metrics")).toBeInTheDocument();
    expect(screen.getByText("结果是")).toBeInTheDocument();
  });

  it("shows a localized notice for truncated output", () => {
    const run = stateFrom([
      { ...base, type: "step.start", message_id: "m1" },
      { ...base, type: "text.start", message_id: "m1" },
      { ...base, type: "text.delta", message_id: "m1", delta: "partial" },
      { ...base, type: "step.end", message_id: "m1", finish_reason: "length", duration_ms: 5 },
    ]);
    render(<StreamView run={run} />);
    expect(screen.getByText(/回答被截断/)).toBeInTheDocument();
  });

  it("renders an approval card on interrupt", () => {
    const run = stateFrom([
      { ...base, type: "interrupt", id: "i1", value: { action: "delete" } },
    ]);
    render(<StreamView run={run} />);
    expect(screen.getByText("需要你的确认")).toBeInTheDocument();
    expect(screen.getByText("批准")).toBeInTheDocument();
  });
});
