import { describe, expect, it } from "vitest";
import { parseComposerText } from "./composer-payload";

describe("parseComposerText", () => {
  it("extracts slash tools and at-mentions", () => {
    const result = parseComposerText("请用 /query_metrics 和 @数据分析 处理");
    expect(result.tools).toEqual(["query_metrics"]);
    expect(result.mentions).toEqual(["数据分析"]);
  });

  it("deduplicates repeated tokens", () => {
    const result = parseComposerText("/a /a @x @x");
    expect(result.tools).toEqual(["a"]);
    expect(result.mentions).toEqual(["x"]);
  });

  it("returns empty arrays when there are no tokens", () => {
    expect(parseComposerText("普通文本")).toEqual({
      tools: [],
      mentions: [],
    });
  });
});
