"use client";

import * as React from "react";
import { Check, Minus, Play, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { FilterBar, FilterSelect } from "@/components/common/filter-bar";
import { SearchInput } from "@/components/common/search-input";
import { StatusBadge } from "@/components/common/status-badge";
import { permissionModules, permissions, roles } from "@/lib/mock-data/roles";
import { users } from "@/lib/mock-data/users";
import { projects } from "@/lib/mock-data/capability";
import { useMockQuery } from "@/hooks/use-mock-query";
import type { Permission, PermissionSimulation, Project, Role, User } from "@/types";
import { cn, unique } from "@/lib/utils";

const MODULE_LABEL: Record<string, string> = {
  tenant: "租户",
  user: "成员与身份",
  model: "模型",
  tool: "工具",
  project: "项目",
  billing: "计费",
  audit: "审计",
  security: "安全",
  monitoring: "监控",
  integration: "集成",
  experiment: "实验",
  setting: "设置",
};

const MODULE_OPTIONS = permissionModules.map((module) => ({
  value: module,
  label: MODULE_LABEL[module] ?? module,
}));

function matrixKey(roleId: string, permissionId: string) {
  return `${roleId}|${permissionId}`;
}

function computeSimulation(user: User, project: Project): PermissionSimulation {
  const userRoles = roles.filter((role) => user.roles.includes(role.id));
  const allowedIds = new Set(userRoles.flatMap((role) => role.permissions));
  const allowed = permissions.filter((permission) => allowedIds.has(permission.id));
  const denied = permissions.filter((permission) => !allowedIds.has(permission.id));

  const restrictions: string[] = [];
  if (user.tenantName === "星辰银行" || project.type === "backend") {
    restrictions.push("生产环境需审批");
  }
  if (allowed.some((permission) => permission.sensitive)) {
    restrictions.push("敏感权限需双人复核");
  }
  if (project.type === "data") {
    restrictions.push("数据类项目导出需 DLP 扫描通过");
  }
  if (!user.mfaEnabled) {
    restrictions.push("未开启 MFA，登录后 30 分钟内需完成二次验证");
  }
  if (allowed.some((permission) => permission.action === "admin")) {
    restrictions.push("管理类操作全程录屏并写入审计");
  }

  return {
    userId: user.id,
    userName: user.name,
    roleNames: user.roleNames,
    allowed,
    denied,
    restrictions: unique(restrictions),
  };
}

export default function PermissionsPage() {
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [matrixSearch, setMatrixSearch] = React.useState("");
  const [matrix, setMatrix] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const role of roles) {
      for (const permission of permissions) {
        initial[matrixKey(role.id, permission.id)] = role.permissions.includes(permission.id);
      }
    }
    return initial;
  });

  const [simUserId, setSimUserId] = React.useState<string>(users[0]?.id ?? "");
  const [simProjectId, setSimProjectId] = React.useState<string>(projects[0]?.id ?? "");
  const [simParams, setSimParams] = React.useState<{ userId: string; projectId: string } | null>(null);

  const filteredPermissions = React.useMemo(() => {
    const needle = matrixSearch.trim().toLowerCase();
    return permissions.filter((permission) => {
      if (moduleFilter !== "all" && permission.module !== moduleFilter) return false;
      if (!needle) return true;
      return (
        permission.name.toLowerCase().includes(needle) ||
        permission.code.toLowerCase().includes(needle) ||
        permission.resource.toLowerCase().includes(needle)
      );
    });
  }, [moduleFilter, matrixSearch]);

  const groupedPermissions = React.useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of filteredPermissions) {
      const list = groups.get(permission.module) ?? [];
      list.push(permission);
      groups.set(permission.module, list);
    }
    return Array.from(groups.entries());
  }, [filteredPermissions]);

  const simulationData = React.useMemo(() => {
    if (!simParams) return null;
    const user = users.find((item) => item.id === simParams.userId);
    const project = projects.find((item) => item.id === simParams.projectId);
    if (!user || !project) return null;
    return computeSimulation(user, project);
  }, [simParams]);

  const { data: simulation, isFetching } = useMockQuery(
    ["permission-simulation", simParams?.userId ?? "-", simParams?.projectId ?? "-"],
    simulationData,
    420,
  );

  const toggleCell = (role: Role, permission: Permission) => {
    const key = matrixKey(role.id, permission.id);
    const next = !(matrix[key] ?? false);
    setMatrix((prev) => ({ ...prev, [key]: next }));
    toast.success(
      `已将「${role.name}」的「${permission.name}」临时${next ? "勾选" : "取消勾选"}（仅 UI 演示）`,
    );
  };

  const activeFilterCount = moduleFilter === "all" ? 0 : 1;
  const selectedUser = users.find((item) => item.id === simUserId);
  const selectedProject = projects.find((item) => item.id === simProjectId);

  return (
    <PageContainer>
      <PageHeader
        title="权限矩阵与模拟器"
        description="以角色视角核对权限分布，并用权限模拟器验证成员在具体项目下的最终授权结果。"
        badges={<Badge variant="secondary">矩阵为演示交互，不会持久化</Badge>}
      />

      <Card className="gap-0 py-4">
        <CardHeader className="pb-3">
          <SectionHeader title="权限矩阵" description="行 = 权限项，列 = 角色，点击单元格可临时切换勾选状态" />
        </CardHeader>
        <CardContent className="space-y-3">
          <FilterBar
            activeCount={activeFilterCount}
            onReset={() => {
              setModuleFilter("all");
              setMatrixSearch("");
            }}
          >
            <FilterSelect label="模块" value={moduleFilter} onChange={setModuleFilter} options={MODULE_OPTIONS} />
            <SearchInput
              value={matrixSearch}
              onChange={setMatrixSearch}
              placeholder="搜索权限名称或编码…"
              className="w-full sm:w-64"
            />
          </FilterBar>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="sticky left-0 min-w-[14rem] bg-muted/40">权限项</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.id} className="min-w-[6.5rem] text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-2xs font-medium">{role.name}</span>
                        <span className="text-muted-foreground font-mono text-2xs">{role.code}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={roles.length + 1} className="text-muted-foreground text-center text-xs">
                      没有匹配的权限项
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedPermissions.map(([module, items]) => (
                    <React.Fragment key={module}>
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={roles.length + 1}
                          className="bg-muted/20 text-muted-foreground text-2xs font-medium"
                        >
                          {MODULE_LABEL[module] ?? module}
                        </TableCell>
                      </TableRow>
                      {items.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="sticky left-0 bg-card">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{permission.name}</span>
                              {permission.sensitive ? <Badge variant="warning">敏感</Badge> : null}
                            </div>
                            <p className="text-muted-foreground font-mono text-2xs">{permission.code}</p>
                          </TableCell>
                          {roles.map((role) => {
                            const allowed = matrix[matrixKey(role.id, permission.id)] ?? false;
                            return (
                              <TableCell key={role.id} className="text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleCell(role, permission)}
                                  aria-label={`切换 ${role.name} 的 ${permission.name}`}
                                  className={cn(
                                    "inline-flex size-6 items-center justify-center rounded-md border transition-colors",
                                    allowed
                                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                      : "border-border text-muted-foreground hover:bg-accent",
                                  )}
                                >
                                  {allowed ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
                                </button>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardHeader className="pb-3">
          <SectionHeader title="权限模拟器" description="选择成员与项目，计算其最终权限集合与生效限制" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-2xs font-medium">选择用户</p>
              <Select value={simUserId} onValueChange={setSimUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}（{user.tenantName}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-2xs font-medium">选择项目</p>
              <Select value={simProjectId} onValueChange={setSimProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}（{project.tenantName}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                size="sm"
                disabled={!simUserId || !simProjectId || isFetching}
                onClick={() => setSimParams({ userId: simUserId, projectId: simProjectId })}
              >
                <Play />
                {isFetching ? "计算中…" : "模拟权限"}
              </Button>
            </div>
          </div>

          {selectedUser && selectedProject ? (
            <p className="text-muted-foreground text-2xs">
              模拟对象：{selectedUser.name} · {selectedProject.name} · {selectedProject.type} 项目
            </p>
          ) : null}

          {isFetching ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : simulation ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{simulation.userName}</Badge>
                {simulation.roleNames.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
                <span className="text-muted-foreground num text-2xs">
                  允许 {simulation.allowed.length} 项 / 拒绝 {simulation.denied.length} 项
                </span>
              </div>

              {simulation.restrictions.length > 0 ? (
                <Alert variant="warning">
                  <ShieldAlert />
                  <AlertTitle>生效限制条件</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-0.5 pl-4">
                      {simulation.restrictions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success">
                  <ShieldCheck />
                  <AlertTitle>无附加限制</AlertTitle>
                  <AlertDescription>该授权在所选项目下没有额外的审批或复核要求。</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/60 p-3 dark:bg-emerald-500/5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs font-medium">允许的权限</p>
                    <span className="num text-2xs text-muted-foreground">{simulation.allowed.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {simulation.allowed.map((permission) => (
                      <Badge key={permission.id} variant="success">
                        {permission.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-50/60 p-3 dark:bg-red-500/5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <ShieldX className="size-3.5 text-red-600 dark:text-red-400" />
                    <p className="text-xs font-medium">拒绝的权限</p>
                    <span className="num text-2xs text-muted-foreground">{simulation.denied.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {simulation.denied.map((permission) => (
                      <Badge key={permission.id} variant="neutral">
                        {permission.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-2xs text-muted-foreground">
                <StatusBadge status="success" label="模拟完成" />
                <span>结果基于本地角色与权限数据计算，仅用于演示。</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center text-xs">
              选择成员与项目后点击「模拟权限」，即可查看允许、拒绝与限制条件。
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
