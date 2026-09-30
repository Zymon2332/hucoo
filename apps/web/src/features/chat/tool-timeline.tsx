import {
  CaretDown,
  CheckCircle,
  Spinner,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react";
import type { ContentBlock } from "@hucoo/streaming";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hucoo/ui/components/collapsible";
import { Badge } from "@hucoo/ui/components/badge";
import { cn } from "@hucoo/ui";

type ToolBlock = Extract<ContentBlock, { kind: "tool" }>;

const STATUS: Record<
  ToolBlock["status"],
  { label: string; className: string; icon: typeof CheckCircle; spin?: boolean }
> = {
  starting: { label: "准备", className: "bg-secondary text-muted-foreground", icon: Wrench },
  args: { label: "生成参数", className: "bg-warning/15 text-warning", icon: Wrench },
  ready: { label: "执行中", className: "bg-accent text-accent-foreground", icon: Spinner, spin: true },
  done: { label: "完成", className: "bg-primary/10 text-primary", icon: CheckCircle },
  error: { label: "失败", className: "bg-destructive/10 text-destructive", icon: WarningCircle },
};

export function ToolTimeline({ block }: { block: ToolBlock }) {
  const status = STATUS[block.status];
  const StatusIcon = status.icon;
  const argsText =
    block.args !== undefined ? JSON.stringify(block.args, null, 2) : block.argsRaw;

  return (
    <Collapsible
      className={cn(
        "group/collapsible rounded-[10px] border bg-card",
        block.isError ? "border-destructive/40" : "border-border",
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <Wrench size={14} className="shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{block.name}</span>
        <Badge className={cn("ml-1", status.className)}>
          <StatusIcon size={11} className={status.spin ? "animate-spin" : undefined} />
          {status.label}
        </Badge>
        {block.durationMs !== undefined && (
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {block.durationMs}ms
          </span>
        )}
        <CaretDown
          size={12}
          className="ml-1 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180"
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 border-t border-border px-3 py-2.5">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-section-label">
              参数
            </p>
            <pre className="overflow-auto rounded-md bg-secondary p-2 text-xs">
              <code>{argsText || "—"}</code>
            </pre>
          </div>
          {block.content !== undefined && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-section-label">
                结果
              </p>
              <pre
                className={cn(
                  "overflow-auto rounded-md p-2 text-xs",
                  block.isError ? "bg-destructive/10 text-destructive" : "bg-secondary",
                )}
              >
                <code>{block.content}</code>
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
