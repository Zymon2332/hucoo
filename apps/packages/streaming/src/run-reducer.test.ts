import { describe, expect, it } from "vitest";
import { createEmptyRun, runReducer } from "./run-reducer";
import type { AgentEvent } from "./events";

const base = { v: 1 as const, run_id: "r1", seq: 1, ts: 0 };
const feed = (events: AgentEvent[]) => events.reduce(runReducer, createEmptyRun());

describe("runReducer", () => {
  it("groups blocks under steps and aggregates text deltas", () => {
    const s = feed([
      { ...base, type: "run.start", thread_id: "t1", model: "gpt" },
      { ...base, type: "step.start", message_id: "m1" },
      { ...base, type: "text.start", message_id: "m1" },
      { ...base, type: "text.delta", message_id: "m1", delta: "He" },
      { ...base, type: "text.delta", message_id: "m1", delta: "llo" },
      { ...base, type: "text.end", message_id: "m1", duration_ms: 5 },
    ]);
    expect(s.status).toBe("streaming");
    expect(s.steps[0]?.blocks[0]).toMatchObject({
      kind: "text",
      text: "Hello",
      status: "done",
    });
  });

  it("closes the open text block when a tool starts", () => {
    const s = feed([
      { ...base, type: "step.start", message_id: "m1" },
      { ...base, type: "text.start", message_id: "m1" },
      { ...base, type: "text.delta", message_id: "m1", delta: "x" },
      { ...base, type: "tool.start", tool_call_id: "c1", name: "search", message_id: "m1" },
    ]);
    expect(s.steps[0]?.blocks.map((b) => b.kind)).toEqual(["text", "tool"]);
    expect(s.steps[0]?.blocks[0]?.status).toBe("done");
  });

  it("tracks tool args then result", () => {
    const s = feed([
      { ...base, type: "step.start", message_id: "m1" },
      { ...base, type: "tool.start", tool_call_id: "c1", name: "search", message_id: "m1" },
      { ...base, type: "tool.args", tool_call_id: "c1", delta: '{"q":' },
      { ...base, type: "tool.args", tool_call_id: "c1", delta: '"hi"}' },
      { ...base, type: "tool.end", tool_call_id: "c1", args: { q: "hi" } },
      { ...base, type: "tool.result", tool_call_id: "c1", name: "search", content: "ok", is_error: false, duration_ms: 12 },
    ]);
    const tool = s.steps[0]?.blocks[0];
    expect(tool).toMatchObject({
      kind: "tool",
      status: "done",
      args: { q: "hi" },
      content: "ok",
    });
  });

  it("sets terminal status exactly once", () => {
    const s = feed([
      { ...base, type: "run.start", thread_id: "t1", model: "gpt" },
      { ...base, type: "run.finish", finish_reason: "stop", duration_ms: 9, usage: { input_tokens: 1 } },
      { ...base, seq: 2, type: "run.error", code: "x", message: "late" },
    ]);
    expect(s.status).toBe("finished");
    expect(s.error).toBeUndefined();
  });

  it("records interrupt as terminal", () => {
    const s = feed([{ ...base, type: "interrupt", id: "i1", value: { q: "approve?" } }]);
    expect(s.status).toBe("interrupted");
    expect(s.interrupt).toEqual({ id: "i1", value: { q: "approve?" } });
  });

  it("tool error is not a fatal run error", () => {
    const s = feed([
      { ...base, type: "step.start", message_id: "m1" },
      { ...base, type: "tool.start", tool_call_id: "c1", name: "search", message_id: "m1" },
      { ...base, type: "tool.result", tool_call_id: "c1", name: "search", content: "boom", is_error: true, duration_ms: 3 },
    ]);
    expect(s.status).not.toBe("error");
    expect(s.steps[0]?.blocks[0]).toMatchObject({
      kind: "tool",
      status: "error",
      isError: true,
    });
  });
});
