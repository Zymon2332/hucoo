import { useNavigate } from "@tanstack/react-router";
import { Robot } from "@phosphor-icons/react";
import { Card } from "@hucoo/ui/components/card";
import { Badge } from "@hucoo/ui/components/badge";
import { Button } from "@hucoo/ui/components/button";
import { useThreadsStore } from "@/features/threads/threads-store";
import { SCENARIOS } from "./data";

export function AgentCatalog() {
  const create = useThreadsStore((s) => s.create);
  const navigate = useNavigate();

  function start(scenarioId: string, title: string) {
    const thread = create({ scenarioId, title });
    void navigate({ to: "/t/$threadId", params: { threadId: thread.id } });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SCENARIOS.map((scenario) => {
        const IconCmp = scenario.icon;
        return (
          <Card
            key={scenario.id}
            className="gap-4 p-5 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
                <IconCmp size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{scenario.name}</p>
                <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
                  {scenario.category}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {scenario.description}
            </p>
            <Button
              size="sm"
              className="w-fit"
              onClick={() => start(scenario.id, scenario.name)}
            >
              <Robot size={14} weight="bold" />
              开始
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
