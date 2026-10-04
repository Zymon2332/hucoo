"use client";

import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * 服务端错误提示：展示后端 `message`，并附 traceId 方便与后端日志对齐。
 * 表单顶部的 {@link AuthErrorSummary} 只承载字段校验错误，两者分工不同。
 */
export function ServerErrorAlert({
  title,
  message,
  traceId,
}: {
  title: string;
  message: string;
  traceId?: string;
}) {
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <span>{message}</span>
        {traceId ? (
          <span className="text-2xs mt-1 block font-mono opacity-70">traceId: {traceId}</span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
