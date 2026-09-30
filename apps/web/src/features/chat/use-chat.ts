import { useCallback, useRef, useState } from "react";
import { createEmptyRun, streamChat, useRunStore } from "@hucoo/streaming";
import { artifactFromEvent } from "@/features/artifact/artifact-types";
import { useArtifactsStore } from "@/features/artifact/artifact-store";
import { useThreadsStore } from "@/features/threads/threads-store";
import { createId, type Thread } from "@/features/threads/types";
import { extractText, isTerminalStatus } from "./run-utils";
import type { SendPayload } from "./composer-payload";

const STREAM_URL = "/agent/v1/chat/stream";

export interface UseChatResult {
  liveRun: ReturnType<typeof useRunStore.getState>["run"];
  isStreaming: boolean;
  send: (payload: SendPayload) => Promise<void>;
  regenerate: () => Promise<void>;
  editAndResend: (messageId: string, text: string) => Promise<void>;
  resume: (approved: boolean) => Promise<void>;
  stop: () => void;
}

export function useChat(thread: Thread | undefined): UseChatResult {
  const liveRun = useRunStore((s) => s.run);
  const setRun = useRunStore((s) => s.set);
  const resetRun = useRunStore((s) => s.reset);
  const addMessage = useThreadsStore((s) => s.addMessage);
  const updateMessage = useThreadsStore((s) => s.updateMessage);
  const truncateAfter = useThreadsStore((s) => s.truncateAfter);
  const setTitleIfEmpty = useThreadsStore((s) => s.setTitleIfEmpty);
  const applyArtifact = useArtifactsStore((s) => s.applyArtifact);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runStream = useCallback(
    async (threadId: string, body: Record<string, unknown>) => {
      resetRun();
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let finalState = createEmptyRun();
      try {
        finalState = await streamChat({
          url: STREAM_URL,
          body,
          signal: controller.signal,
          onUpdate: (state) => {
            setRun(state);
            finalState = state;
          },
          onEvent: (event) => {
            const artifact = artifactFromEvent(event);
            if (artifact) applyArtifact(threadId, artifact);
          },
        });
      } catch {
        // 错误已由 run.error 反映
      } finally {
        setIsStreaming(false);
        abortRef.current = null;

        if (isTerminalStatus(finalState.status)) {
          addMessage(threadId, {
            id: createId(),
            role: "assistant",
            createdAt: Date.now(),
            text: extractText(finalState),
            run: finalState,
          });
          resetRun();
        }
      }
    },
    [addMessage, applyArtifact, resetRun, setRun],
  );

  const send = useCallback(
    async (payload: SendPayload) => {
      if (!thread || (!payload.text.trim() && payload.attachments.length === 0) || isStreaming) {
        return;
      }
      const threadId = thread.id;
      addMessage(threadId, {
        id: createId(),
        role: "user",
        createdAt: Date.now(),
        text: payload.text,
      });
      setTitleIfEmpty(threadId, payload.text.slice(0, 24));
      await runStream(threadId, {
        thread_id: threadId,
        input: payload.text,
        tools: payload.tools,
        mentions: payload.mentions,
        attachments: payload.attachments,
      });
    },
    [addMessage, isStreaming, runStream, setTitleIfEmpty, thread],
  );

  const regenerate = useCallback(async () => {
    if (!thread || isStreaming) return;
    const lastUser = [...thread.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUser) return;
    truncateAfter(thread.id, lastUser.id);
    await runStream(thread.id, {
      thread_id: thread.id,
      input: lastUser.text,
      tools: [],
      mentions: [],
      attachments: [],
    });
  }, [isStreaming, runStream, thread, truncateAfter]);

  const editAndResend = useCallback(
    async (messageId: string, text: string) => {
      if (!thread || isStreaming || !text.trim()) return;
      updateMessage(thread.id, messageId, { text });
      truncateAfter(thread.id, messageId);
      await runStream(thread.id, {
        thread_id: thread.id,
        input: text,
        tools: [],
        mentions: [],
        attachments: [],
      });
    },
    [isStreaming, runStream, thread, truncateAfter, updateMessage],
  );

  const resume = useCallback(
    async (approved: boolean) => {
      if (!thread || isStreaming) return;
      await runStream(thread.id, {
        thread_id: thread.id,
        decision: approved ? "approve" : "reject",
      });
    },
    [isStreaming, runStream, thread],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { liveRun, isStreaming, send, regenerate, editAndResend, resume, stop };
}
