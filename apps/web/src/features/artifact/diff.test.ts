import { describe, expect, it } from "vitest";
import { diffStats, lineDiff } from "./diff";

describe("lineDiff", () => {
  it("marks unchanged lines as same", () => {
    const lines = lineDiff("a\nb", "a\nb");
    expect(lines).toEqual([
      { type: "same", text: "a" },
      { type: "same", text: "b" },
    ]);
  });

  it("detects an added line", () => {
    const lines = lineDiff("a\nc", "a\nb\nc");
    expect(lines).toEqual([
      { type: "same", text: "a" },
      { type: "add", text: "b" },
      { type: "same", text: "c" },
    ]);
    expect(diffStats(lines)).toEqual({ added: 1, removed: 0 });
  });

  it("detects a removed line", () => {
    const lines = lineDiff("a\nb\nc", "a\nc");
    expect(diffStats(lines)).toEqual({ added: 0, removed: 1 });
  });

  it("treats an in-place edit as del + add", () => {
    const lines = lineDiff("a\nold", "a\nnew");
    expect(diffStats(lines)).toEqual({ added: 1, removed: 1 });
  });
});
