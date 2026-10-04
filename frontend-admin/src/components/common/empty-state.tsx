import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "暂无数据",
  description = "当前筛选条件下没有匹配记录，试试调整筛选或搜索关键词。",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <span className="text-muted-foreground/70 flex size-9 items-center justify-center">
        <Icon className="size-4.5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
