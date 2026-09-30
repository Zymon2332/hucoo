import { describe, expect, it } from "vitest";
import { decodeAgentEvent } from "./events";

const base = { v: 1, run_id: "r1", seq: 1, ts: 1000 };

describe("decodeAgentEvent", () => {
  it("decodes a known event", () => {
    const ev = decodeAgentEvent({
      event: "text.delta",
      data: JSON.stringify({
        ...base,
        type: "text.delta",
        message_id: "m1",
        delta: "hi",
      }),
    });
    expect(ev).toMatchObject({ type: "text.delta", delta: "hi" });
  });

  it("returns null for unknown type (forward compatible)", () => {
    expect(
      decodeAgentEvent({
        event: "future.thing",
        data: JSON.stringify({ ...base, type: "future.thing" }),
      }),
    ).toBeNull();
  });

  it("returns null for malformed json", () => {
    expect(decodeAgentEvent({ event: "text.delta", data: "{not json" })).toBeNull();
  });

  it("rejects unsupported contract version", () => {
    expect(
      decodeAgentEvent({
        event: "text.delta",
        data: JSON.stringify({ ...base, v: 2, type: "text.delta" }),
      }),
    ).toBeNull();
  });
});
