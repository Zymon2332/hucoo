import { Badge } from "@/components/ui/badge";
import { getStatusMeta, TONE_DOT, TONE_STYLE } from "@/lib/status";
import { RISK_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, dot = true, className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const toneClass = TONE_STYLE[meta.tone];

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-2xs font-medium ring-1 ring-inset",
        toneClass,
        className,
      )}
    >
      {dot && (
        <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[meta.tone], meta.tone === "processing" && "animate-pulse")} />
      )}
      {label ?? meta.label}
    </span>
  );
}

const RISK_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

export function RiskBadge({ risk, className }: { risk: string; className?: string }) {
  return (
    <Badge variant={RISK_VARIANT[risk] ?? "neutral"} className={className}>
      {RISK_LABEL[risk] ?? risk}风险
    </Badge>
  );
}

export function CountBadge({ value, className }: { value: number; className?: string }) {
  return (
    <Badge variant={value > 0 ? "danger" : "neutral"} className={cn("num px-1.5", className)}>
      {value}
    </Badge>
  );
}
