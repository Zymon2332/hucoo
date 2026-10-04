"use client";

import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn("w-full gap-0 p-0 sm:max-w-2xl", className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-5">{children}</div>
        </ScrollArea>
        {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}

interface DetailSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailSection({ title, description, children, className }: DetailSectionProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="space-y-0.5">
        <h3 className="font-display text-xs font-semibold">{title}</h3>
        {description ? <p className="text-muted-foreground text-2xs">{description}</p> : null}
      </div>
      <Separator />
      {children}
    </section>
  );
}

interface DetailRowProps {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}

export function DetailRow({ label, children, mono = false, className }: DetailRowProps) {
  return (
    <div className={cn("grid grid-cols-[6.5rem_1fr] items-start gap-3 py-1", className)}>
      <span className="text-muted-foreground text-2xs leading-5">{label}</span>
      <div className={cn("min-w-0 text-xs leading-5 break-words", mono && "font-mono text-2xs")}>{children}</div>
    </div>
  );
}

interface DetailGridProps {
  children: React.ReactNode;
  columns?: 2 | 3;
  className?: string;
}

export function DetailGrid({ children, columns = 2, className }: DetailGridProps) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-1",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
