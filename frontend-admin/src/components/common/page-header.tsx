import type * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, badges, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {badges}
        </div>
        {description ? (
          <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn("flex flex-col gap-5 p-5 lg:p-7", className)}>{children}</div>;
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="space-y-0.5">
        <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
