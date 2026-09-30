import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@hucoo/ui/components/card";
import { cn } from "@hucoo/ui";

export function SectionCard({
  title,
  action,
  children,
  bodyClassName,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-[var(--shadow-card)]">
      <CardHeader className="flex h-12 flex-row items-center gap-2 border-b border-border px-4 py-0">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-section-label">
          {title}
        </CardTitle>
        {action && <div className="ml-auto">{action}</div>}
      </CardHeader>
      <CardContent className={cn("p-4", bodyClassName)}>{children}</CardContent>
    </Card>
  );
}
