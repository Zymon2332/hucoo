import {
  CheckCircle,
  GitBranch,
  WarningCircle,
} from "@phosphor-icons/react";
import { SectionCard } from "@/components/section-card";

const REPOS = [
  { name: "hucoo/backend", branch: "main" },
  { name: "hucoo/core-agent", branch: "dev" },
];

const ENV_VARS = [
  { key: "MODEL_API_BASE", set: true },
  { key: "VECTOR_DB_URL", set: true },
  { key: "WEBHOOK_SECRET", set: false },
];

const MEMBERS = [
  { name: "Admin User", role: "Owner" },
  { name: "Jane Smith", role: "Maintainer" },
  { name: "John Doe", role: "Member" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProjectView({ projectId }: { projectId: string }) {
  return (
    <div className="mx-auto max-w-6xl space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">项目工作区</h1>
        <p className="mt-1 text-sm text-muted-foreground">项目 {projectId}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="仓库绑定">
          <ul className="space-y-2.5">
            {REPOS.map((repo) => (
              <li key={repo.name} className="flex items-center gap-2 text-sm">
                <GitBranch size={16} className="text-muted-foreground" />
                <span className="font-medium">{repo.name}</span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {repo.branch}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="环境变量">
          <ul className="space-y-2.5">
            {ENV_VARS.map((env) => (
              <li key={env.key} className="flex items-center gap-2 text-sm">
                {env.set ? (
                  <CheckCircle size={16} className="text-primary" />
                ) : (
                  <WarningCircle size={16} className="text-warning" />
                )}
                <code className="font-mono text-xs">{env.key}</code>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {env.set ? "已配置" : "缺失"}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="成员">
          <ul className="space-y-2.5">
            {MEMBERS.map((member) => (
              <li key={member.name} className="flex items-center gap-2 text-sm">
                <span className="grid size-7 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                  {initials(member.name)}
                </span>
                <span>{member.name}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="工作区策略">
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">出网策略</span>
              <span className="font-medium">仅白名单</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">沙箱镜像</span>
              <span className="font-medium">python:3.11</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">资源配额</span>
              <span className="font-medium tabular-nums">4 vCPU / 8 GB</span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
