import { describe, expect, it } from "vitest";
import { SseParser } from "./parse-sse";

describe("SseParser", () => {
  it("parses a single complete event", () => {
    const p = new SseParser();
    const out = p.push(
      'event: text.delta\ndata: {"delta":"hi"}\nid: 3\n\n',
    );
    expect(out).toEqual([
      { event: "text.delta", data: '{"delta":"hi"}', id: "3" },
    ]);
  });

  it("buffers partial chunks across pushes", () => {
    const p = new SseParser();
    expect(p.push("event: text.delta\nda")).toEqual([]);
    const out = p.push('ta: {"delta":"a"}\n\n');
    expect(out).toHaveLength(1);
    expect(out[0]?.event).toBe("text.delta");
  });

  it("ignores comment lines and joins multi-line data", () => {
    const p = new SseParser();
    const out = p.push(": heartbeat\nevent: x\ndata: a\ndata: b\n\n");
    expect(out).toEqual([{ event: "x", data: "a\nb", id: undefined }]);
  });

  it("normalizes CRLF", () => {
    const p = new SseParser();
    const out = p.push("event: x\r\ndata: 1\r\n\r\n");
    expect(out).toEqual([{ event: "x", data: "1", id: undefined }]);
  });

  it("flushes a trailing event without delimiter", () => {
    const p = new SseParser();
    p.push("event: x\ndata: 1");
    expect(p.flush()).toEqual([{ event: "x", data: "1", id: undefined }]);
  });
});
