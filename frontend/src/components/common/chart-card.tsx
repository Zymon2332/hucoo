import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  contentClassName?: string;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  footer,
  isLoading = false,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("min-w-0", contentClassName)}>
        {isLoading ? <Skeleton className="h-[220px] w-full" /> : children}
      </CardContent>
      {footer ? <div className="mt-3 border-t border-border px-4 pt-3">{footer}</div> : null}
    </Card>
  );
}
