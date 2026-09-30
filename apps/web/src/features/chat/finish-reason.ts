import type { FinishReason } from "@hucoo/streaming";

export function finishReasonNotice(reason?: FinishReason | null): string | null {
  switch (reason) {
    case "length":
      return "回答被截断（达到长度上限）";
    case "content_filter":
      return "内容被安全策略拦截";
    case "refusal":
      return "模型拒绝回答";
    case "error":
      return "该步骤发生错误";
    default:
      return null;
  }
}
