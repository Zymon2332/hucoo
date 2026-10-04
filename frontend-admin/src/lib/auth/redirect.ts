import { DEFAULT_AUTHENTICATED_PATH } from "@/lib/env";

/** 只接受站内相对路径，避免 `?next=` 被用作开放重定向。 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }
  return value;
}
