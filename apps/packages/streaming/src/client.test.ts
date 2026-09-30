import { describe, expect, it, vi } from "vitest";
import { streamChat } from "./client";
import type { RunState } from "./run-reducer";

function sseStream(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(encoder.encode(ch));
      c.close();
    },
  });
  return new Response(body, { status: 200 });
}

describe("streamChat", () => {
  it("emits normalized state updates and stops after terminal event", async () => {
    const states: RunState[] = [];
    const fetchImpl = vi.fn(async () =>
      sseStream([
        'event: run.start\ndata: {"v":1,"run_id":"r1","seq":1,"ts":0,"type":"run.start","thread_id":"t1","model":"gpt"}\n\n',
        'event: step.start\ndata: {"v":1,"run_id":"r1","seq":2,"ts":0,"type":"step.start","message_id":"m1"}\n\n',
        'event: text.delta\ndata: {"v":1,"run_id":"r1","seq":3,"ts":0,"type":"text.delta","message_id":"m1","delta":"hi"}\n\n',
        'event: run.finish\ndata: {"v":1,"run_id":"r1","seq":4,"ts":0,"type":"run.finish","finish_reason":"stop","duration_ms":1}\n\n',
      ]),
    ) as unknown as typeof fetch;

    await streamChat({
      url: "/agent/v1/chat/stream",
      body: { input: "hello" },
      fetchImpl,
      onUpdate: (s) => states.push(s),
      signal: new AbortController().signal,
    });

    expect(states.at(-1)?.status).toBe("finished");
    expect(states.at(-1)?.steps[0]?.blocks[0]).toMatchObject({
      kind: "text",
      text: "hi",
    });
  });
});
