import { SseParser } from "./parse-sse";
import { decodeAgentEvent, type AgentEvent } from "./events";
import { createEmptyRun, runReducer, type RunState } from "./run-reducer";

export interface StreamChatOptions {
  url: string;
  body: unknown;
  signal: AbortSignal;
  onUpdate: (state: RunState) => void;
  onEvent?: (event: AgentEvent) => void;
  onError?: (err: Error) => void;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

function isTerminal(state: RunState): boolean {
  return (
    state.status === "finished" ||
    state.status === "error" ||
    state.status === "interrupted"
  );
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
        opts.onEvent?.(ev);
        state = runReducer(state, ev);
        opts.onUpdate(state);
        if (isTerminal(state)) {
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
