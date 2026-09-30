import { create } from "zustand";
import { createEmptyRun, runReducer, type RunState } from "./run-reducer";
import type { AgentEvent } from "./events";

interface RunStore {
  run: RunState;
  apply: (event: AgentEvent) => void;
  applyAll: (events: AgentEvent[]) => void;
  set: (run: RunState) => void;
  reset: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  run: createEmptyRun(),
  apply: (event) => set((s) => ({ run: runReducer(s.run, event) })),
  applyAll: (events) =>
    set((s) => ({ run: events.reduce(runReducer, s.run) })),
  set: (run) => set({ run }),
  reset: () => set({ run: createEmptyRun() }),
}));
