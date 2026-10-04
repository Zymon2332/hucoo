"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Cpu,
  FileSearch,
  Gauge,
  Plus,
  ScrollText,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navGroups } from "@/config/nav";
import { tenants } from "@/lib/mock-data/tenants";
import { users } from "@/lib/mock-data/users";
import { customModels } from "@/lib/mock-data/models";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="搜索页面、租户、用户、模型或输入操作…" />
      <CommandList>
        <CommandEmpty>没有找到匹配结果</CommandEmpty>

        <CommandGroup heading="快捷操作">
          <CommandItem onSelect={() => go("/tenants")} value="新建租户 创建租户 tenant create">
            <Plus />
            新建租户
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/users")} value="邀请用户 添加成员 invite user">
            <UserPlus />
            邀请用户
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/approvals")} value="审批中心 待审批 approval">
            <FileSearch />
            处理待审批事项
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/models/custom")} value="自定义模型接入审核 byok">
            <Cpu />
            审核模型接入申请
          </CommandItem>
          <CommandItem onSelect={() => go("/security")} value="安全检查 dlp kms ip">
            <ShieldCheck />
            查看安全策略
          </CommandItem>
          <CommandItem onSelect={() => go("/alerts")} value="告警 值班 alert oncall">
            <Gauge />
            查看实时告警
          </CommandItem>
          <CommandItem onSelect={() => go("/audit")} value="审计日志 audit log">
            <ScrollText />
            查询审计日志
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="租户">
          {tenants.slice(0, 6).map((tenant) => (
            <CommandItem
              key={tenant.id}
              value={`tenant ${tenant.name} ${tenant.slug} ${tenant.plan}`}
              onSelect={() => go(`/tenants/${tenant.id}`)}
            >
              <Building2 />
              {tenant.name}
              <span className="text-muted-foreground ml-auto text-2xs">
                {tenant.region} · {tenant.userCount} 成员
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="用户">
          {users.slice(0, 5).map((user) => (
            <CommandItem
              key={user.id}
              value={`user ${user.name} ${user.email} ${user.tenantName}`}
              onSelect={() => go(`/users/${user.id}`)}
            >
              <UserPlus />
              {user.name}
              <span className="text-muted-foreground ml-auto text-2xs">{user.tenantName}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="自定义模型">
          {customModels.slice(0, 5).map((model) => (
            <CommandItem
              key={model.id}
              value={`model ${model.name} ${model.tenantName} ${model.status}`}
              onSelect={() => go("/models/custom")}
            >
              <Cpu />
              {model.name}
              <span className="text-muted-foreground ml-auto text-2xs">{model.tenantName}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {navGroups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.keywords.join(" ")}`}
                onSelect={() => go(item.href)}
              >
                <item.icon />
                {item.label}
                <ArrowRight className="text-muted-foreground ml-auto size-3" />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
