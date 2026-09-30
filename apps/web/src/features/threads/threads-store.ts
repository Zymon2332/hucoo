import { create } from "zustand";
import { repositories } from "./repo";
import { createId, type ChatMessage, type Thread } from "./types";

interface CreateThreadOptions {
  title?: string;
  scenarioId?: string;
}

interface ThreadsStore {
  threads: Thread[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (options?: CreateThreadOptions) => Thread;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  get: (id: string) => Thread | undefined;
  addMessage: (threadId: string, message: ChatMessage) => void;
  updateMessage: (
    threadId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
  ) => void;
  removeMessage: (threadId: string, messageId: string) => void;
  truncateAfter: (threadId: string, messageId: string) => void;
  restore: (thread: Thread) => void;
  setTitleIfEmpty: (threadId: string, title: string) => void;
  touch: (threadId: string) => void;
}

function persist(thread: Thread | undefined) {
  if (thread) void repositories.threads.save(thread);
}

function sortThreads(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
}

const DEFAULT_TITLE = "新会话";

export const useThreadsStore = create<ThreadsStore>((set, get) => ({
  threads: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const threads = await repositories.threads.list();
    set({ threads: sortThreads(threads), hydrated: true });
  },

  create: (options) => {
    const now = Date.now();
    const thread: Thread = {
      id: createId(),
      title: options?.title ?? DEFAULT_TITLE,
      scenarioId: options?.scenarioId,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    set((s) => ({ threads: sortThreads([thread, ...s.threads]) }));
    persist(thread);
    return thread;
  },

  rename: (id, title) => {
    set((s) => {
      const threads = s.threads.map((t) =>
        t.id === id ? { ...t, title, updatedAt: Date.now() } : t,
      );
      persist(threads.find((t) => t.id === id));
      return { threads: sortThreads(threads) };
    });
  },

  remove: (id) => {
    set((s) => ({ threads: s.threads.filter((t) => t.id !== id) }));
    void repositories.threads.remove(id);
  },

  get: (id) => get().threads.find((t) => t.id === id),

  addMessage: (threadId, message) => {
    set((s) => {
      const threads = s.threads.map((t) =>
        t.id === threadId
          ? { ...t, messages: [...t.messages, message], updatedAt: Date.now() }
          : t,
      );
      persist(threads.find((t) => t.id === threadId));
      return { threads: sortThreads(threads) };
    });
  },

  updateMessage: (threadId, messageId, patch) => {
    set((s) => {
      const threads = s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
              updatedAt: Date.now(),
            }
          : t,
      );
      persist(threads.find((t) => t.id === threadId));
      return { threads: sortThreads(threads) };
    });
  },

  removeMessage: (threadId, messageId) => {
    set((s) => {
      const threads = s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: t.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            }
          : t,
      );
      persist(threads.find((t) => t.id === threadId));
      return { threads: sortThreads(threads) };
    });
  },

  truncateAfter: (threadId, messageId) => {
    set((s) => {
      const threads = s.threads.map((t) => {
        if (t.id !== threadId) return t;
        const index = t.messages.findIndex((m) => m.id === messageId);
        if (index === -1) return t;
        return {
          ...t,
          messages: t.messages.slice(0, index + 1),
          updatedAt: Date.now(),
        };
      });
      persist(threads.find((t) => t.id === threadId));
      return { threads: sortThreads(threads) };
    });
  },

  restore: (thread) => {
    set((s) => {
      const exists = s.threads.some((t) => t.id === thread.id);
      const threads = exists
        ? s.threads.map((t) => (t.id === thread.id ? thread : t))
        : [thread, ...s.threads];
      persist(thread);
      return { threads: sortThreads(threads) };
    });
  },

  setTitleIfEmpty: (threadId, title) => {
    set((s) => {
      const thread = s.threads.find((t) => t.id === threadId);
      if (!thread || thread.title !== DEFAULT_TITLE) return s;
      const threads = s.threads.map((t) =>
        t.id === threadId ? { ...t, title, updatedAt: Date.now() } : t,
      );
      persist(threads.find((t) => t.id === threadId));
      return { threads: sortThreads(threads) };
    });
  },

  touch: (threadId) => {
    set((s) => {
      const threads = s.threads.map((t) =>
        t.id === threadId ? { ...t, updatedAt: Date.now() } : t,
      );
      persist(threads.find((t) => t.id === threadId));
      return { threads: sortThreads(threads) };
    });
  },
}));

export { DEFAULT_TITLE };
