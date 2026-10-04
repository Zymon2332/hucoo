"use client";

import * as React from "react";
import type { FieldErrors, FieldValues, UseFormReturn } from "react-hook-form";
import { AlertCircle } from "lucide-react";

export interface ErrorSummaryItem {
  /** 目标字段的 DOM id；无法定位时只展示文案。 */
  id: string | null;
  label: string;
  message: string;
}

/**
 * 校验失败摘要（WCAG 2.2「Focusable Error Summary」）：
 * 提交失败时在表单顶部给出可聚焦的 role="alert" 摘要，逐项链接到对应字段，
 * 同时保留每个字段下方的行内错误提示。
 */
export function useErrorSummary<T extends FieldValues>(
  form: UseFormReturn<T>,
  formRef: React.RefObject<HTMLFormElement | null>,
  fieldLabels: Record<string, string> = {},
) {
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [items, setItems] = React.useState<ErrorSummaryItem[]>([]);
  const labelsRef = React.useRef(fieldLabels);
  labelsRef.current = fieldLabels;

  const handleInvalid = React.useCallback(
    (errors: FieldErrors<T>) => {
      const root = formRef.current;
      if (!root) {
        setItems([]);
        return;
      }

      const next: ErrorSummaryItem[] = [];
      for (const name of Object.keys(errors)) {
        const field = root.querySelector<HTMLElement>(`[name="${name}"]`);
        const id = field?.id || null;
        const label =
          labelsRef.current[name] ??
          (id
            ? root.querySelector<HTMLLabelElement>(`label[for="${id}"]`)?.textContent?.trim()
            : undefined) ??
          field?.getAttribute("aria-label") ??
          name;

        next.push({
          id,
          label,
          message: String(errors[name]?.message ?? "请检查该项"),
        });
      }

      setItems(next);
    },
    [formRef],
  );

  const isSubmitSuccessful = form.formState.isSubmitSuccessful;
  React.useEffect(() => {
    if (isSubmitSuccessful) setItems([]);
  }, [isSubmitSuccessful]);

  // 提交失败后把焦点移到摘要容器：等 DOM 提交后再聚焦，否则元素尚未挂载。
  React.useEffect(() => {
    if (items.length > 0) summaryRef.current?.focus();
  }, [items]);

  return { summaryRef, items, handleInvalid };
}

export function AuthErrorSummary({
  items,
  summaryRef,
}: {
  items: ErrorSummaryItem[];
  summaryRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (items.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="auth-error-summary-title"
      className="border-destructive/30 bg-destructive/5 focus-visible:ring-ring/40 rounded-lg border px-3.5 py-3 focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <p
        id="auth-error-summary-title"
        className="text-destructive flex items-center gap-1.5 text-xs font-medium"
      >
        <AlertCircle className="size-3.5 shrink-0" />
        表单有 {items.length} 项需要修改
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li
            key={`${item.label}-${item.message}`}
            className="flex flex-wrap items-baseline gap-x-1.5"
          >
            {item.id ? (
              <a
                href={`#${item.id}`}
                className="text-destructive focus-visible:ring-ring/40 text-2xs rounded-sm font-medium underline underline-offset-2 focus-visible:ring-[3px] focus-visible:outline-none"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-destructive text-2xs font-medium">{item.label}</span>
            )}
            <span className="text-muted-foreground text-2xs">· {item.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
