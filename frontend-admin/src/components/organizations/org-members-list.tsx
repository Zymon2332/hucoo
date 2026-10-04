"use client";

import * as React from "react";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { useDelayedFlag } from "@/hooks/use-delayed-flag";
import { useVirtualRows } from "@/hooks/use-virtual-rows";
import { getOrgMembers } from "@/lib/mock-data/org-members";
import { LABELS } from "@/lib/labels";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { OrgMember, Organization } from "@/types";

const ROW_HEIGHT = 40;
/** 窄屏只保留 3 列，xl 以上补全 MFA 与最近活跃时间，避免出现横向滚动。 */
const GRID =
  "grid-cols-[minmax(7rem,1.6fr)_minmax(5rem,1fr)_5rem] xl:grid-cols-[minmax(9rem,1.4fr)_minmax(7rem,1fr)_6.5rem_5.5rem_6.5rem]";

function MemberRow({ member, index }: { member: OrgMember; index: number }) {
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "hover:bg-accent/50 border-border/60 grid items-center gap-3 border-b px-3 text-xs transition-colors",
        GRID,
      )}
    >
      <div role="cell" className="min-w-0">
        <p className="truncate font-medium">{member.name}</p>
        <p className="text-muted-foreground text-2xs truncate">{member.email}</p>
      </div>
      <div role="cell" className="min-w-0">
        <p className="truncate">{member.title}</p>
        <p className="text-muted-foreground text-2xs truncate">
          {LABELS[member.source] ?? member.source}
        </p>
      </div>
      <div role="cell">
        <StatusBadge status={member.status} />
      </div>
      <div role="cell" className="text-muted-foreground text-2xs hidden xl:block">
        {member.mfaEnabled ? "已开启" : "未开启"}
      </div>
      <div role="cell" className="num text-muted-foreground text-2xs hidden xl:block">
        {formatDate(member.lastActiveAt, "MM-dd HH:mm")}
      </div>
    </div>
  );
}

interface OrgMembersListProps {
  org: Organization;
  subtreeMemberCount: number;
  canInvite: boolean;
  inviteDenyReason: string | null;
  onInvite: () => void;
}

export function OrgMembersList({
  org,
  subtreeMemberCount,
  canInvite,
  inviteDenyReason,
  onInvite,
}: OrgMembersListProps) {
  const [members, setMembers] = React.useState<OrgMember[] | null>(null);
  const [query, setQuery] = React.useState("");

  // 成员名单按需加载：切到“成员”标签页才拉取，并延迟显示骨架，避免闪烁
  React.useEffect(() => {
    let cancelled = false;
    setMembers(null);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setMembers(getOrgMembers(org));
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [org]);

  const filtered = React.useMemo(() => {
    if (!members) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      `${member.name} ${member.email} ${member.title}`.toLowerCase().includes(needle),
    );
  }, [members, query]);

  const showSkeleton = useDelayedFlag(members === null, 140);

  const { scrollRef, onScroll, totalHeight, offsetY, startIndex, endIndex } = useVirtualRows({
    count: filtered.length,
    rowHeight: ROW_HEIGHT,
    overscan: 6,
  });

  const directCount = members?.length ?? org.memberCount;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy={members === null}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-muted-foreground text-2xs flex items-center gap-1.5">
          <Users className="size-3.5" />
          直属成员
          <span className="num text-foreground font-medium">{formatNumber(directCount)}</span>
          <span className="hidden sm:inline">· 含下级 {formatNumber(subtreeMemberCount)}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="筛选成员姓名 / 邮箱 / 岗位"
            aria-label="筛选成员"
            className="h-8 w-full text-xs sm:w-56"
          />
          <Button
            type="button"
            size="sm"
            disabled={!canInvite}
            onClick={onInvite}
            title={canInvite ? undefined : (inviteDenyReason ?? undefined)}
            className={cn(!canInvite && "cursor-not-allowed")}
          >
            <UserPlus />
            邀请成员
          </Button>
        </div>
      </div>

      <div
        role="table"
        aria-label={`${org.name} 的成员名单`}
        aria-rowcount={filtered.length + 1}
        aria-colcount={5}
        className="border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border"
      >
        <div
          role="row"
          aria-rowindex={1}
          className={cn(
            "bg-muted/40 text-muted-foreground border-border text-2xs grid items-center gap-3 border-b px-3 py-2 font-medium",
            GRID,
          )}
        >
          <span role="columnheader">成员</span>
          <span role="columnheader">岗位 / 来源</span>
          <span role="columnheader">状态</span>
          <span role="columnheader" className="hidden xl:block">
            MFA
          </span>
          <span role="columnheader" className="hidden xl:block">
            最近活跃
          </span>
        </div>

        {showSkeleton ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="没有匹配的成员"
            description="换个关键词试试，或清空筛选查看全部直属成员。"
            className="m-3 border-0"
            action={
              query ? (
                <Button type="button" variant="outline" size="xs" onClick={() => setQuery("")}>
                  清空筛选
                </Button>
              ) : null
            }
          />
        ) : (
          <div
            ref={scrollRef}
            onScroll={onScroll}
            role="rowgroup"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div role="presentation" style={{ height: totalHeight, position: "relative" }}>
              <div role="presentation" style={{ transform: `translateY(${offsetY}px)` }}>
                {filtered.slice(startIndex, endIndex).map((member, position) => (
                  <MemberRow key={member.id} member={member} index={startIndex + position} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {members && filtered.length > 0 ? (
        <p className="text-muted-foreground text-2xs">
          虚拟滚动渲染 {Math.max(0, endIndex - startIndex)} / {formatNumber(filtered.length)} 行
          {members.length >= org.memberCount ? "" : "（已截断至上限）"}
        </p>
      ) : null}
    </div>
  );
}
