"use client";

import { cn } from "@/lib/utils";
import { TENANT_FIELD_GAPS, TENANT_FIELD_GAP_HINT } from "@/types/tenant";

/**
 * 页面保留、后端暂未提供字段的统一占位。
 *
 * 这里刻意不显示 0 或空字符串：`—` + 悬停说明既能保留原有页面结构，
 * 又不会把「接口没返回」伪装成真实数据。
 */
export function MissingValue({
  hint = TENANT_FIELD_GAP_HINT,
  className,
}: {
  hint?: string;
  className?: string;
}) {
  return (
    <span className={cn("text-muted-foreground text-2xs", className)} title={hint}>
      —
    </span>
  );
}

/** 取「字段缺口」的标准提示文案。 */
export function gapHint(key: keyof typeof TENANT_FIELD_GAPS): string {
  return `后端暂未提供：${TENANT_FIELD_GAPS[key]}`;
}

/** 区块级的「待接口补齐」说明，用在图表、配额等整块缺失的位置。 */
export function MissingBlock({
  title,
  hint,
  className,
}: {
  title: string;
  hint: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-8 text-center",
        className,
      )}
    >
      <p className="text-xs font-medium">{title}</p>
      <p className="text-muted-foreground text-2xs max-w-sm leading-relaxed">{hint}</p>
    </div>
  );
}
