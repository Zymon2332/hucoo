# Hucoo Agent 工作台 v1 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 `apps/web` 构建企业内员工的 Agent 工作台（三栏骨架 + Artifact-first 产物双表面 + 流式对话 + ⌘K），对齐 `Agentic UI` 绿色设计系统。

**Architecture:** pnpm workspace 多包：`packages/ui`（设计系统 + shadcn 组件）、`packages/streaming`（SSE 解析 + runReducer，纯函数优先）、`packages/sdk`（REST 客户端）、`apps/web`（Vite + React 19 + TanStack Router）。流式内核与设计系统先以 TDD 落地，界面逐层搭建。

**Tech Stack:** Vite, React 19, TypeScript, TanStack Router, TanStack Query, Zustand, Tailwind v4, shadcn/ui, motion, @tanstack/react-virtual, MSW, Vitest, Phosphor Icons。

**关联设计：** `docs/plans/2026-09-29-hucoo-agent-workbench-design.md`

---

## Phase 0：工作区与脚手架

### Task 0.1：pnpm workspace 根配置

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.npmrc`
- Create: `tsconfig.base.json`

**Step 1: 写 workspace 配置**

`pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`.npmrc`
```
shamefully-hoist=false
strict-peer-dependencies=false
```

根 `package.json`
```json
{
  "name": "hucoo-workbench",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "pnpm --filter @hucoo/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

`tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**Step 2: 校验**

Run: `pnpm --version`（若无 pnpm，先 `corepack enable`）
Expected: 打印版本，无报错。

**Step 3: Commit**
```bash
git add pnpm-workspace.yaml package.json .npmrc tsconfig.base.json
git commit -m "chore(web): init pnpm workspace"
```

---

### Task 0.2：`packages/streaming` 包骨架

**Files:**
- Create: `packages/streaming/package.json`
- Create: `packages/streaming/tsconfig.json`
- Create: `packages/streaming/vitest.config.ts`
- Create: `packages/streaming/src/index.ts`

**Step 1: 包配置**

`packages/streaming/package.json`
```json
{
  "name": "@hucoo/streaming",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/streaming/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

`packages/streaming/vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

`packages/streaming/src/index.ts`
```ts
export {};
```

**Step 2:** Run: `pnpm install && pnpm --filter @hucoo/streaming test`
Expected: 无测试，退出码 0。

**Step 3: Commit**
```bash
git add packages/streaming
git commit -m "chore(streaming): scaffold package"
```

---

### Task 0.3：`packages/ui` 包骨架 + 绿色设计令牌

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/styles/globals.css`
- Create: `packages/ui/src/lib/utils.ts`

**Step 1: 包配置**

`packages/ui/package.json`
```json
{
  "name": "@hucoo/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css"
  },
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.460.0",
    "@phosphor-icons/react": "^2.1.7"
  },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

`packages/ui/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

**Step 2: 写入绿色设计令牌（Tailwind v4 CSS-first）**

`packages/ui/src/styles/globals.css`（节选，完整实现所有 shadcn 语义令牌）
```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

:root {
  --background: #f0f0ee;
  --foreground: #171717;
  --card: #ffffff;
  --card-foreground: #171717;
  --popover: #ffffff;
  --popover-foreground: #171717;
  --primary: #15803d;
  --primary-foreground: #ffffff;
  --secondary: #f4f4f2;
  --secondary-foreground: #171717;
  --muted: #f4f4f2;
  --muted-foreground: #8a8a85;
  --accent: #eaf6ee;
  --accent-foreground: #14532d;
  --destructive: #dc2626;
  --destructive-foreground: #ffffff;
  --border: #e8e8e6;
  --input: #e8e8e6;
  --ring: #16a34a;
  --brand: #16a34a;
  --chart-1: #22c55e;
  --warning: #f59e0b;
  --radius: 0.625rem;
  --radius-card: 1rem;
  --section-label: #a3a39e;
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06);
}

.dark {
  --background: #111110;
  --foreground: #f5f5f4;
  --card: #1a1a19;
  --card-foreground: #f5f5f4;
  --popover: #1a1a19;
  --popover-foreground: #f5f5f4;
  --primary: #22c55e;
  --primary-foreground: #052e16;
  --secondary: #242423;
  --secondary-foreground: #f5f5f4;
  --muted: #242423;
  --muted-foreground: #a3a39e;
  --accent: #14311f;
  --accent-foreground: #bbf7d0;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #2a2a28;
  --input: #2a2a28;
  --ring: #22c55e;
  --brand: #22c55e;
  --chart-1: #22c55e;
  --warning: #f59e0b;
  --section-label: #6b6b66;
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.5);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-chart-1: var(--chart-1);
  --color-warning: var(--warning);
  --radius-card: var(--radius-card);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans antialiased; }
}
```

`packages/ui/src/lib/utils.ts`
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: Commit**
```bash
git add packages/ui
git commit -m "feat(ui): add package skeleton and green design tokens"
```

---

### Task 0.4：`apps/web` Vite 应用骨架

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles.css`

**Step 1: 应用配置**

`apps/web/package.json`
```json
{
  "name": "@hucoo/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@hucoo/streaming": "workspace:*",
    "@hucoo/ui": "workspace:*",
    "@phosphor-icons/react": "^2.1.7",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-router": "^1.80.0",
    "@tanstack/react-virtual": "^3.10.0",
    "motion": "^11.11.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tanstack/router-plugin": "^1.80.0",
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "msw": "^2.6.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`apps/web/vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: { port: 5173 },
});
```

`apps/web/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["vite/client"] },
  "include": ["src", "vite.config.ts"]
}
```

`apps/web/index.html`
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hucoo Agent 工作台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/styles.css`
```css
@import "@hucoo/ui/globals.css";
```

`apps/web/src/main.tsx`
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="p-8">Hucoo Agent 工作台</div>
  </StrictMode>,
);
```

**Step 2: 安装并启动**

Run: `pnpm install`
Run: `pnpm --filter @hucoo/web dev`
Expected: 本地 5173 打开，暖灰背景 + 文本渲染。

**Step 3: Commit**
```bash
git add apps/web
git commit -m "feat(web): scaffold vite react app with green tokens"
```

---

## Phase 1：流式内核（TDD）

### Task 1.1：SSE 分块解析器

**Files:**
- Create: `packages/streaming/src/parse-sse.ts`
- Test: `packages/streaming/src/parse-sse.test.ts`

**Step 1: 写失败测试**

`packages/streaming/src/parse-sse.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { SseParser } from "./parse-sse";

describe("SseParser", () => {
  it("parses a single complete event", () => {
    const p = new SseParser();
    const out = p.push("event: text.delta\ndata: {\"delta\":\"hi\"}\nid: 3\n\n");
    expect(out).toEqual([{ event: "text.delta", data: '{"delta":"hi"}', id: "3" }]);
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
```

**Step 2: 运行确认失败**

Run: `pnpm --filter @hucoo/streaming test`
Expected: FAIL（`SseParser` 未定义）。

**Step 3: 实现**

`packages/streaming/src/parse-sse.ts`
```ts
export interface RawSseEvent {
  event: string;
  data: string;
  id?: string;
}

function parseBlock(block: string): RawSseEvent | null {
  const lines = block.split("\n");
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];
  for (const line of lines) {
    if (line === "" || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
  }
  if (data.length === 0 && event === "message") return null;
  return { event, data: data.join("\n"), id };
}

export class SseParser {
  private buffer = "";

  push(chunk: string): RawSseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const out: RawSseEvent[] = [];
    let idx: number;
    while ((idx = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const parsed = parseBlock(block);
      if (parsed) out.push(parsed);
    }
    return out;
  }

  flush(): RawSseEvent[] {
    const block = this.buffer;
    this.buffer = "";
    if (block.trim() === "") return [];
    const parsed = parseBlock(block);
    return parsed ? [parsed] : [];
  }
}
```

**Step 4: 运行确认通过**

Run: `pnpm --filter @hucoo/streaming test`
Expected: PASS（5 tests）。

**Step 5: Commit**
```bash
git add packages/streaming/src/parse-sse.ts packages/streaming/src/parse-sse.test.ts
git commit -m "feat(streaming): add chunked SSE parser"
```

---

### Task 1.2：Agent 事件类型与 JSON 解码

**Files:**
- Create: `packages/streaming/src/events.ts`
- Test: `packages/streaming/src/events.test.ts`

**Step 1: 写失败测试**

`packages/streaming/src/events.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { decodeAgentEvent } from "./events";

const base = { v: 1, run_id: "r1", seq: 1, ts: 1000 };

describe("decodeAgentEvent", () => {
  it("decodes a known event", () => {
    const ev = decodeAgentEvent({ event: "text.delta", data: JSON.stringify({ ...base, type: "text.delta", message_id: "m1", delta: "hi" }) });
    expect(ev).toMatchObject({ type: "text.delta", delta: "hi" });
  });

  it("returns null for unknown type (forward compatible)", () => {
    expect(decodeAgentEvent({ event: "future.thing", data: JSON.stringify({ ...base, type: "future.thing" }) })).toBeNull();
  });

  it("returns null for malformed json", () => {
    expect(decodeAgentEvent({ event: "text.delta", data: "{not json" })).toBeNull();
  });

  it("rejects unsupported contract version", () => {
    expect(decodeAgentEvent({ event: "text.delta", data: JSON.stringify({ ...base, v: 2, type: "text.delta" }) })).toBeNull();
  });
});
```

**Step 2: 运行确认失败** — Run: `pnpm --filter @hucoo/streaming test`；Expected FAIL。

**Step 3: 实现**

`packages/streaming/src/events.ts`
```ts
import type { RawSseEvent } from "./parse-sse";

export interface EventBase {
  v: 1;
  run_id: string;
  seq: number;
  ts: number;
}

export type FinishReason =
  | "stop" | "length" | "tool_calls" | "content_filter"
  | "refusal" | "error" | "other";

export type RunFinishReason = "stop" | "interrupted" | "error" | "cancelled";

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cached_tokens?: number;
}

export type AgentEvent =
  | (EventBase & { type: "run.start"; thread_id: string; model: string })
  | (EventBase & { type: "run.finish"; finish_reason: RunFinishReason; usage?: Usage; duration_ms: number })
  | (EventBase & { type: "run.error"; code: string; message: string; retryable: boolean; details?: unknown })
  | (EventBase & { type: "step.start"; message_id: string })
  | (EventBase & { type: "step.end"; message_id: string; finish_reason?: FinishReason | null; raw_finish_reason?: string | null; duration_ms: number; usage?: Usage })
  | (EventBase & { type: "reasoning.start"; message_id: string })
  | (EventBase & { type: "reasoning.delta"; message_id: string; delta: string })
  | (EventBase & { type: "reasoning.end"; message_id: string; duration_ms: number })
  | (EventBase & { type: "text.start"; message_id: string })
  | (EventBase & { type: "text.delta"; message_id: string; delta: string })
  | (EventBase & { type: "text.end"; message_id: string; duration_ms: number })
  | (EventBase & { type: "tool.start"; tool_call_id: string; name: string; message_id: string })
  | (EventBase & { type: "tool.args"; tool_call_id: string; delta: string })
  | (EventBase & { type: "tool.end"; tool_call_id: string; args?: unknown })
  | (EventBase & { type: "tool.result"; tool_call_id: string; name: string; content: string; is_error: boolean; duration_ms: number })
  | (EventBase & { type: "state"; patch: unknown })
  | (EventBase & { type: "interrupt"; id: string; value: unknown })
  | (EventBase & { type: "custom"; name: string; data: unknown });

const KNOWN = new Set<AgentEvent["type"]>([
  "run.start", "run.finish", "run.error", "step.start", "step.end",
  "reasoning.start", "reasoning.delta", "reasoning.end",
  "text.start", "text.delta", "text.end",
  "tool.start", "tool.args", "tool.end", "tool.result",
  "state", "interrupt", "custom",
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
```

**Step 4: 运行确认通过** — Run: `pnpm --filter @hucoo/streaming test`；Expected PASS。

**Step 5: Commit**
```bash
git add packages/streaming/src/events.ts packages/streaming/src/events.test.ts
git commit -m "feat(streaming): add typed agent event decoder"
```

---

### Task 1.3：runReducer（纯函数状态机）

**Files:**
- Create: `packages/streaming/src/run-reducer.ts`
- Test: `packages/streaming/src/run-reducer.test.ts`

**Step 1: 写失败测试**

`packages/streaming/src/run-reducer.test.ts`
```ts
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
    expect(s.steps[0]?.blocks[0]).toMatchObject({ kind: "text", text: "Hello", status: "done" });
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
    expect(tool).toMatchObject({ kind: "tool", status: "done", args: { q: "hi" }, content: "ok" });
  });

  it("sets terminal status exactly once", () => {
    const s = feed([
      { ...base, type: "run.start", thread_id: "t1", model: "gpt" },
      { ...base, type: "run.finish", finish_reason: "stop", duration_ms: 9, usage: { input_tokens: 1 } },
      { ...base, seq: 2, type: "run.error", code: "x", message: "late", retryable: false },
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
    expect(s.steps[0]?.blocks[0]).toMatchObject({ kind: "tool", status: "error", isError: true });
  });
});
```

**Step 2: 运行确认失败** — Expected FAIL。

**Step 3: 实现**

`packages/streaming/src/run-reducer.ts`
```ts
import type { AgentEvent, FinishReason, RunFinishReason, Usage } from "./events";

export type RunStatus = "idle" | "streaming" | "finished" | "error" | "interrupted";

export type ContentBlock =
  | { kind: "reasoning"; id: string; text: string; status: "streaming" | "done"; durationMs?: number }
  | { kind: "text"; id: string; text: string; status: "streaming" | "done"; durationMs?: number }
  | {
      kind: "tool"; id: string; toolCallId: string; name: string;
      argsRaw: string; args?: unknown;
      status: "starting" | "args" | "ready" | "done" | "error";
      content?: string; isError?: boolean; durationMs?: number;
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
  error?: { code: string; message: string; retryable: boolean; details?: unknown };
  interrupt?: { id: string; value: unknown };
  lastSeq: number;
}

export function createEmptyRun(): RunState {
  return { status: "idle", steps: [], lastSeq: 0 };
}

const isTerminal = (s: RunStatus) => s === "finished" || s === "error" || s === "interrupted";

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
      return { ...next, status: "streaming", runId: event.run_id, threadId: event.thread_id, model: event.model };
    case "step.start": {
      const steps = [...next.steps, { messageId: event.message_id, blocks: [] }];
      return { ...next, steps };
    }
    case "reasoning.start":
    case "text.start": {
      const s = step();
      if (!s) return next;
      closeOpenBlock(s);
      const kind = event.type === "text.start" ? "text" : "reasoning";
      s.blocks.push({ kind, id: `${event.message_id}:${kind}`, text: "", status: "streaming" });
      return { ...next, steps: [...next.steps] };
    }
    case "reasoning.delta":
    case "text.delta": {
      const s = step();
      const kind = event.type === "text.delta" ? "text" : "reasoning";
      const block = s?.blocks.findLast((b) => b.kind === kind);
      if (block && (block.kind === "text" || block.kind === "reasoning")) block.text += event.delta;
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
        kind: "tool", id: event.tool_call_id, toolCallId: event.tool_call_id, name: event.name,
        argsRaw: "", status: "args",
      });
      return { ...next, steps: [...next.steps] };
    }
    case "tool.args": {
      const block = step()?.blocks.find((b) => b.kind === "tool" && b.toolCallId === event.tool_call_id);
      if (block?.kind === "tool") block.argsRaw += event.delta;
      return { ...next, steps: [...next.steps] };
    }
    case "tool.end": {
      const block = step()?.blocks.find((b) => b.kind === "tool" && b.toolCallId === event.tool_call_id);
      if (block?.kind === "tool") {
        block.status = "ready";
        block.args = event.args;
      }
      return { ...next, steps: [...next.steps] };
    }
    case "tool.result": {
      const block = step()?.blocks.find((b) => b.kind === "tool" && b.toolCallId === event.tool_call_id);
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
      return { ...next, status: "finished", finishReason: event.finish_reason, usage: event.usage, durationMs: event.duration_ms };
    case "run.error":
      return { ...next, status: "error", error: { code: event.code, message: event.message, retryable: event.retryable, details: event.details } };
    case "interrupt":
      return { ...next, status: "interrupted", interrupt: { id: event.id, value: event.value } };
    default:
      return next;
  }
}
```

**Step 4: 运行确认通过** — Expected PASS（6 tests）。

**Step 5: Commit**
```bash
git add packages/streaming/src/run-reducer.ts packages/streaming/src/run-reducer.test.ts
git commit -m "feat(streaming): add run reducer state machine"
```

---

### Task 1.4：Steam 客户端（fetch + ReadableStream）+ Zustand store

**Files:**
- Create: `packages/streaming/src/client.ts`
- Create: `packages/streaming/src/store.ts`
- Modify: `packages/streaming/src/index.ts`
- Test: `packages/streaming/src/client.test.ts`

**Step 1: 写失败测试（用可注入的 fetch 流）**

`packages/streaming/src/client.test.ts`
```ts
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
    const fetchImpl = vi.fn(async () => sseStream([
      'event: run.start\ndata: {"v":1,"run_id":"r1","seq":1,"ts":0,"type":"run.start","thread_id":"t1","model":"gpt"}\n\n',
      'event: step.start\ndata: {"v":1,"run_id":"r1","seq":2,"ts":0,"type":"step.start","message_id":"m1"}\n\n',
      'event: text.delta\ndata: {"v":1,"run_id":"r1","seq":3,"ts":0,"type":"text.delta","message_id":"m1","delta":"hi"}\n\n',
      'event: run.finish\ndata: {"v":1,"run_id":"r1","seq":4,"ts":0,"type":"run.finish","finish_reason":"stop","duration_ms":1}\n\n',
    ]));
    await streamChat({
      url: "/agent/v1/chat/stream",
      body: { input: "hello" },
      fetchImpl,
      onUpdate: (s) => states.push(s),
      signal: new AbortController().signal,
    });
    expect(states.at(-1)?.status).toBe("finished");
    expect(states.at(-1)?.steps[0]?.blocks[0]).toMatchObject({ kind: "text", text: "hi" });
  });
});
```

**Step 2: 失败** — Expected FAIL。

**Step 3: 实现**

`packages/streaming/src/client.ts`
```ts
import { SseParser } from "./parse-sse";
import { decodeAgentEvent } from "./events";
import { createEmptyRun, runReducer, type RunState } from "./run-reducer";

export interface StreamChatOptions {
  url: string;
  body: unknown;
  signal: AbortSignal;
  onUpdate: (state: RunState) => void;
  onError?: (err: Error) => void;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export async function streamChat(opts: StreamChatOptions): Promise<RunState> {
  const doFetch = opts.fetchImpl ?? fetch;
  let state = createEmptyRun();
  const parser = new SseParser();
  try {
    const res = await doFetch(opts.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...opts.headers },
      body: JSON.stringify(opts.body),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const raw of parser.push(decoder.decode(value, { stream: true }))) {
        const ev = decodeAgentEvent(raw);
        if (!ev) continue;
        state = runReducer(state, ev);
        opts.onUpdate(state);
        if (state.status === "finished" || state.status === "error" || state.status === "interrupted") {
          await reader.cancel();
          return state;
        }
      }
    }
    for (const raw of parser.flush()) {
      const ev = decodeAgentEvent(raw);
      if (!ev) continue;
      state = runReducer(state, ev);
      opts.onUpdate(state);
    }
  } catch (err) {
    opts.onError?.(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
  return state;
}
```

`packages/streaming/src/store.ts`
```ts
import { create } from "zustand";
import { createEmptyRun, runReducer, type RunState } from "./run-reducer";
import type { AgentEvent } from "./events";

interface RunStore {
  run: RunState;
  apply: (event: AgentEvent) => void;
  applyAll: (events: AgentEvent[]) => void;
  reset: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  run: createEmptyRun(),
  apply: (event) => set((s) => ({ run: runReducer(s.run, event) })),
  applyAll: (events) => set((s) => ({ run: events.reduce(runReducer, s.run) })),
  reset: () => set({ run: createEmptyRun() }),
}));
```

`packages/streaming/src/index.ts`
```ts
export * from "./parse-sse";
export * from "./events";
export * from "./run-reducer";
export * from "./client";
export * from "./store";
```

**Step 4: 通过** — Run: `pnpm --filter @hucoo/streaming test`；Expected PASS。

**Step 5: Commit**
```bash
git add packages/streaming/src
git commit -m "feat(streaming): add stream client and run store"
```

---

## Phase 2：应用外壳与路由

### Task 2.1：TanStack Router 根路由与三栏 Shell

**Files:**
- Create: `apps/web/src/routes/__root.tsx`
- Create: `apps/web/src/components/app-shell.tsx`
- Create: `apps/web/src/components/sidebar-nav.tsx`
- Create: `apps/web/src/components/topbar.tsx`
- Modify: `apps/web/src/main.tsx`

**Step 1: 结构与视觉**

`__root.tsx` 挂载 `AppShell`（左 `SidebarNav` + 顶 `Topbar` + `Outlet`）。侧栏用分组标题
（`工作区` / `场景` / `项目` / `设置`），分组标题样式 `text-[11px] uppercase tracking-wide text-[color:var(--section-label)]`；
激活项 `bg-card border border-border rounded-[10px] shadow-[var(--shadow-card)]`。图标用 `@phosphor-icons/react`。

`main.tsx` 组装 `QueryClientProvider` > `RouterProvider`，并在开发期 `if (import.meta.env.DEV) await worker.start()` 启动 MSW。

**Step 2: 手动验证**

Run: `pnpm --filter @hucoo/web dev`
Expected: 暖灰画布、白色侧栏、分组标题、无控制台报错；路由 `/` 渲染占位首页。

**Step 3: Commit**
```bash
git add apps/web/src
git commit -m "feat(web): add router and three-pane app shell"
```

---

### Task 2.2：路由页面骨架

**Files:**
- Create: `apps/web/src/routes/index.tsx`（Launchpad）
- Create: `apps/web/src/routes/t.$threadId.tsx`（对话⇄产物）
- Create: `apps/web/src/routes/artifacts.$artifactId.tsx`
- Create: `apps/web/src/routes/inbox.tsx`
- Create: `apps/web/src/routes/agents.tsx`
- Create: `apps/web/src/routes/projects.$projectId.tsx`

**Step 1:** 每个路由返回带标题的占位卡片，验证导航与面包屑。
**Step 2:** Run dev，逐个点击导航验证 URL/激活态。
**Step 3: Commit** `feat(web): add route skeletons`

---

## Phase 3：对话流与产物双表面

### Task 3.1：MSW SSE Mock

**Files:**
- Create: `apps/web/src/mocks/handlers.ts`
- Create: `apps/web/src/mocks/browser.ts`
- Create: `apps/web/src/mocks/fixtures/basic-run.ts`

**Step 1:** `basic-run.ts` 输出一段含 reasoning/text/tool 的完整事件序列（对齐契约顺序）。
`handlers.ts` 用 `http.post('/agent/v1/chat/stream', ...)` 返回 `ReadableStream` 并带小延迟，

**Step 2:** 在 dev 手动请求，确认事件逐条到达。
**Step 3: Commit** `feat(web): add msw sse mock`

---

### Task 3.2：对话渲染（StreamView）

**Files:**
- Create: `apps/web/src/features/chat/stream-view.tsx`
- Create: `apps/web/src/features/chat/reasoning-block.tsx`
- Create: `apps/web/src/features/chat/tool-timeline.tsx`
- Create: `apps/web/src/features/chat/interrupt-card.tsx`
- Create: `apps/web/src/features/chat/composer.tsx`
- Test: `apps/web/src/features/chat/stream-view.test.tsx`

**Step 1: 测试**

用 `useRunStore.applyAll` 灌注 fixture，断言渲染出 reasoning 折叠块、tool 时间线、文本、`interrupt` 审批卡。
`length` finish_reason 显示「回答被截断」。

**Step 2: 实现**

按 `run.steps[].blocks` 顺序渲染；`motion` 做进入动画（`initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}`）。
流式时底部显示光标；终止后根据 `finishReason` 显示本地化提示。

**Step 3:** Run: `pnpm --filter @hucoo/web test`；Expected PASS。
**Step 4: Commit** `feat(web): render streaming chat with reasoning and tools`

---

### Task 3.3：可拖拽分屏 + Artifact 渲染器

**Files:**
- Create: `apps/web/src/components/resizable-split.tsx`
- Create: `apps/web/src/features/artifact/artifact-panel.tsx`
- Create: `apps/web/src/features/artifact/renderers/markdown.tsx`
- Create: `apps/web/src/features/artifact/renderers/code.tsx`
- Create: `apps/web/src/features/artifact/renderers/table.tsx`
- Create: `apps/web/src/features/artifact/renderers/html.tsx`

**Step 1:** `resizable-split.tsx` 用 pointer 事件实现可拖拽分割（持久化宽度到 localStorage），产物出现时自动展开。
**Step 2:** 渲染器按 `artifact.kind` 分派；HTML 用受限 `sandbox` iframe。
**Step 3:** 在 `/t/:threadId` 串联：当 `run` 产出 artifact 时展开右侧。
**Step 4: Commit** `feat(web): add artifact split pane and renderers`

---

### Task 3.4：产物版本历史与 diff 接受/拒绝

**Files:**
- Create: `apps/web/src/features/artifact/artifact-store.ts`（Zustand + IndexedDB 持久化）
- Create: `apps/web/src/features/artifact/revision-history.tsx`
- Create: `apps/web/src/features/artifact/diff-review.tsx`
- Test: `apps/web/src/features/artifact/artifact-store.test.ts`

**Step 1:** 测试 store：追加 revision、接受/拒绝 pending revision 的状态迁移。
**Step 2:** 实现 `artifact-store`（用 `idb-keyval` 或原生 IndexedDB 封装）与 diff 视图。
**Step 3: Commit** `feat(web): add artifact revisions and diff review`

---

## Phase 4：⌘K 命令中心

### Task 4.1：Command Palette

**Files:**
- Create: `apps/web/src/features/command/command-palette.tsx`
- Create: `apps/web/src/features/command/registry.ts`
- Test: `apps/web/src/features/command/registry.test.ts`

**Step 1:** 测试 registry 的命令匹配（前缀 + 模糊）。
**Step 2:** 用 `cmdk` 或自研列表实现 overlay，`⌘K`/`Ctrl+K` 唤起，含导航与动词命令。
**Step 3: Commit** `feat(web): add command palette`

---

## Phase 5：右栏上下文与收件箱

### Task 5.1：上下文抽屉 + 收件箱

**Files:**
- Create: `apps/web/src/features/context/context-rail.tsx`
- Create: `apps/web/src/features/inbox/inbox-rail.tsx`
- Create: `apps/web/src/features/inbox/inbox-store.ts`

**Step 1:** 上下文抽屉展示来源/工具/用量（读 `run` 状态）。
**Step 2:** 收件箱用占位数据，卡片带来源/置信度/一键采纳（采纳后触发一次 run）。
**Step 3: Commit** `feat(web): add context rail and inbox`

---

## Phase 6：场景目录、Launchpad、项目

### Task 6.1：Launchpad 仪表盘

**Files:**
- Create: `apps/web/src/routes/index.tsx`（重写）
- Create: `apps/web/src/features/dashboard/stat-card.tsx`
- Create: `apps/web/src/features/dashboard/trend-chart.tsx`
- Create: `apps/web/src/features/dashboard/progress-row.tsx`
- Create: `apps/web/src/features/dashboard/recent-table.tsx`

**Step 1:** 复刻截图语言：统计卡（大写标签 + 大数字 `tabular-nums` + 迷你柱状）、面积图、进度条、可排序表格、状态胶囊。
**Step 2:** 数据先用 mock；图表可用轻量自绘 SVG（避免引入重库）或 `recharts`。
**Step 3: Commit** `feat(web): add dashboard launchpad`

---

### Task 6.2：场景目录与项目页

**Files:**
- Create: `apps/web/src/features/agents/agent-catalog.tsx`
- Create: `apps/web/src/features/projects/project-view.tsx`
- Create: `apps/web/src/lib/api/agents.ts`

**Step 1:** `agents.ts` 走 `@hucoo/sdk`（Phase 7）或先用 MSW mock `AgentTemplate`。
**Step 2:** 场景卡片网格（白卡 + 轻阴影 + 图标），点击进入新会话。
**Step 3: Commit** `feat(web): add agent catalog and project view`

---

## Phase 7：SDK 与鉴权

### Task 7.1：`packages/sdk` REST 客户端

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/src/client.ts`
- Create: `packages/sdk/src/types.ts`
- Test: `packages/sdk/src/client.test.ts`

**Step 1:** 测试：解包后端统一 `Result<T>`（`code`/`message`/`data`），非成功码抛 `ApiError`。
**Step 2:** 实现基于 fetch 的客户端，支持注入 token provider 与 baseUrl（默认经 gateway `http://localhost:8080`）。
**Step 3: Commit** `feat(sdk): add rest client`

---

### Task 7.2：登录壳与路由守卫

**Files:**
- Create: `apps/web/src/features/auth/auth-store.ts`
- Create: `apps/web/src/features/auth/login-page.tsx`
- Create: `apps/web/src/routes/login.tsx`
- Modify: `apps/web/src/routes/__root.tsx`（`beforeLoad` 守卫）

**Step 1:** 守卫：未登录跳 `/login`；token 存内存 + localStorage。
**Step 2:** 登录页调用 identity 登录接口（先 mock）。
**Step 3: Commit** `feat(web): add auth shell and route guard`

---

## Phase 8：打磨

### Task 8.1：动画与无障碍收尾

**Step 1:** motion 统一过渡 token，尊重 `prefers-reduced-motion`。
**Step 2:** 键盘可达：⌘K、列表虚拟化、焦点管理、图标 `aria-hidden`。
**Step 3:** 运行 `pnpm -r typecheck && pnpm -r test && pnpm -r lint` 全绿。
**Step 4: Commit** `chore(web): polish motion and accessibility`

---

## 验收标准

- `pnpm --filter @hucoo/web dev` 启动，三栏壳、绿色令牌、暗色切换正常。
- `/t/:threadId` 能消费 MSW SSE，正确渲染 reasoning / text / tool / interrupt，终止唯一。
- 产物以可拖拽分屏出现，支持至少 Markdown 与表格渲染 + 版本历史。
- ⌘K 可唤起并执行导航命令。
- `packages/streaming` 与 `packages/sdk` 单测通过，`pnpm -r typecheck` 无错误。
