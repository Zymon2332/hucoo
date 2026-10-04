import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDelta, formatNumber } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "danger" | "info";

const TONE_ICON: Record<StatTone, string> = {
  default: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

interface StatCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  invertDelta?: boolean;
  tone?: StatTone;
  hint?: string;
  footer?: React.ReactNode;
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  deltaLabel = "较上期",
  invertDelta = false,
  tone = "default",
  hint,
  footer,
  valueFormatter,
  className,
}: StatCardProps) {
  const displayValue =
    typeof value === "number" ? (valueFormatter ? valueFormatter(value) : formatNumber(value)) : value;

  const positive = delta !== undefined ? (invertDelta ? delta < 0 : delta > 0) : null;
  const DeltaIcon = delta === undefined ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className={cn("gap-0 py-5", className)}>
      <CardContent className="flex flex-col gap-2">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {Icon ? <Icon className={cn("size-3.5 shrink-0", TONE_ICON[tone])} /> : null}
          <span className="truncate">{label}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="font-display num text-3xl font-semibold tracking-tight">{displayValue}</span>
          {unit ? <span className="text-muted-foreground text-sm">{unit}</span> : null}
        </div>

        {delta !== undefined ? (
          <div className="flex items-center gap-1.5 text-xs">
            <DeltaIcon
              className={cn(
                "size-3.5 shrink-0",
                positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
              )}
            />
            <span
              className={cn(
                "num font-medium",
                positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
              )}
            >
              {formatDelta(delta)}
            </span>
            <span className="text-muted-foreground">{deltaLabel}</span>
          </div>
        ) : hint ? (
          <p className="text-muted-foreground text-xs">{hint}</p>
        ) : null}

        {footer ? <div className="mt-1 border-t border-border pt-3">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function StatCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
