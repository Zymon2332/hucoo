import { Brain, CaretDown } from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hucoo/ui/components/collapsible";

export function ReasoningBlock({
  text,
  durationMs,
  streaming,
}: {
  text: string;
  durationMs?: number;
  streaming: boolean;
}) {
  return (
    <Collapsible className="group/collapsible rounded-[10px] border border-border bg-secondary/50">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <Brain size={14} className="shrink-0" />
        <span>
          思考
          {streaming ? "中…" : durationMs ? ` · ${(durationMs / 1000).toFixed(1)}s` : ""}
        </span>
        <CaretDown
          size={12}
          className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
          {text}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
