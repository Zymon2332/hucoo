import type { SendPayload } from "./composer-payload";

const pending = new Map<string, SendPayload>();

export function setPendingInput(threadId: string, payload: SendPayload): void {
  pending.set(threadId, payload);
}

export function takePendingInput(threadId: string): SendPayload | undefined {
  const payload = pending.get(threadId);
  if (payload) pending.delete(threadId);
  return payload;
}
