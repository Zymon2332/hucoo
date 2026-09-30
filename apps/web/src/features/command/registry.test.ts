import { describe, expect, it } from "vitest";
import { searchCommands, type Command } from "./registry";

const noop = () => {};

const COMMANDS: Command[] = [
  { id: "nav.dashboard", title: "前往 工作台", group: "导航", keywords: ["home", "dashboard"], run: noop },
  { id: "nav.inbox", title: "前往 收件箱", group: "导航", keywords: ["inbox"], run: noop },
  { id: "nav.agents", title: "前往 场景目录", group: "导航", keywords: ["agents"], run: noop },
  { id: "nav.new", title: "新建会话", group: "操作", keywords: ["new", "chat"], run: noop },
  { id: "theme.toggle", title: "切换主题", group: "操作", keywords: ["dark", "light"], run: noop },
];

describe("searchCommands", () => {
  it("returns all commands for an empty query", () => {
    expect(searchCommands(COMMANDS, "")).toHaveLength(COMMANDS.length);
  });

  it("matches title substrings", () => {
    const result = searchCommands(COMMANDS, "收件");
    expect(result.map((c) => c.id)).toEqual(["nav.inbox"]);
  });

  it("matches keywords", () => {
    const result = searchCommands(COMMANDS, "dashboard");
    expect(result.map((c) => c.id)).toContain("nav.dashboard");
  });

  it("returns nothing when there is no match", () => {
    expect(searchCommands(COMMANDS, "zzz-not-here")).toEqual([]);
  });

  it("ranks title prefix above keyword substring", () => {
    const result = searchCommands(COMMANDS, "新");
    expect(result[0]?.id).toBe("nav.new");
  });
});
