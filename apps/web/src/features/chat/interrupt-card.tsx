import { useState } from "react";
import { Check, HandPalm, X } from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@hucoo/ui/components/alert";
import { Button } from "@hucoo/ui/components/button";

export function InterruptCard({
  value,
  onResolve,
}: {
  value: unknown;
  onResolve: (approved: boolean) => void;
}) {
  const [resolved, setResolved] = useState<boolean | null>(null);
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  if (resolved !== null) {
    return (
      <Alert>
        <Check className="size-4" />
        <AlertDescription>已{resolved ? "批准" : "拒绝"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-primary/30 bg-accent/40">
      <HandPalm className="size-4 text-primary" weight="fill" />
      <AlertTitle>需要你的确认</AlertTitle>
      <AlertDescription>
        <pre className="mt-2 overflow-auto rounded-md bg-card p-2 text-xs">
          <code>{text}</code>
        </pre>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setResolved(true);
              onResolve(true);
            }}
          >
            <Check className="size-3.5" weight="bold" />
            批准
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setResolved(false);
              onResolve(false);
            }}
          >
            <X className="size-3.5" />
            拒绝
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
