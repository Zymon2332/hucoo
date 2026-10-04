import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-md border border-border px-3 py-2.5 text-xs has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-2 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/30 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 [&>svg]:text-red-600",
        warning:
          "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 [&>svg]:text-amber-600",
        info: "border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 [&>svg]:text-blue-600",
        success:
          "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 [&>svg]:text-emerald-600",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 grid justify-items-start gap-1 text-xs text-muted-foreground [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
