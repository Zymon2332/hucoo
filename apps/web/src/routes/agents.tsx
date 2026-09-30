import { createFileRoute } from "@tanstack/react-router";
import { AgentCatalog } from "@/features/agents/agent-catalog";

export const Route = createFileRoute("/agents")({ component: Agents });

function Agents() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">场景目录</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          浏览并选择可用的 Agent 场景，快速开始任务。
        </p>
      </div>
      <AgentCatalog />
    </div>
  );
}
