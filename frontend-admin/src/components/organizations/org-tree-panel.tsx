"use client";

import * as React from "react";
import {
  Building2,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderTree,
  Layers,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVirtualRows } from "@/hooks/use-virtual-rows";
import {
  ORG_MATCH_FIELD_LABEL,
  type OrgRow,
  type OrgSearchResult,
  type OrgTreeIndex,
} from "@/lib/org-tree";
import type { OrganizationType } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

const ROW_HEIGHT = 34;
const INDENT = 14;
/** 虚化树的 typeahead 缓冲超时 */
const TYPEAHEAD_RESET = 700;

const TYPE_ICON: Record<OrganizationType, typeof Building2> = {
  company: Building2,
  department: Layers,
  team: FolderTree,
};

const TYPE_ICON_CLASS: Record<OrganizationType, string> = {
  company: "text-blue-600 dark:text-blue-400",
  department: "text-primary",
  team: "text-muted-foreground",
};

function treeItemId(id: string) {
  return `org-treeitem-${id}`;
}

/** 把命中搜索词的片段包成 <mark>，便于在长列表里快速定位。 */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-primary/20 text-foreground rounded-[3px] px-0.5">
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  );
}

interface OrgTreePanelProps {
  index: OrgTreeIndex;
  rows: OrgRow[];
  selectedId: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  search: OrgSearchResult | null;
  expandedIds: ReadonlySet<string>;
  loadingIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCreate: () => void;
  canCreate: boolean;
  createDenyReason: string | null;
  /** 供屏幕阅读器播报的即时状态（树操作反馈） */
  liveMessage: string;
  className?: string;
}

export function OrgTreePanel({
  index,
  rows,
  selectedId,
  query,
  onQueryChange,
  search,
  expandedIds,
  loadingIds,
  onSelect,
  onToggle,
  onExpandAll,
  onCollapseAll,
  onCreate,
  canCreate,
  createDenyReason,
  liveMessage,
  className,
}: OrgTreePanelProps) {
  const [focusedId, setFocusedId] = React.useState<string | null>(selectedId);
  const typeaheadRef = React.useRef({ buffer: "", at: 0 });

  const { scrollRef, onScroll, totalHeight, offsetY, startIndex, endIndex, scrollToIndex } =
    useVirtualRows({ count: rows.length, rowHeight: ROW_HEIGHT, overscan: 10 });

  const rowIndexOf = React.useCallback(
    (id: string | null) => (id ? rows.findIndex((row) => row.org.id === id) : -1),
    [rows],
  );

  // 外部选中变化（点面包屑、URL 直达、搜索结果）时同步焦点并滚动到可见区。
  // 用 center 对齐，保证选中节点上下都能看到它的兄弟与下级，而不是贴在边缘。
  React.useEffect(() => {
    if (!selectedId) return;
    setFocusedId(selectedId);
    const position = rowIndexOf(selectedId);
    if (position >= 0) scrollToIndex(position, "center");
  }, [selectedId, rowIndexOf, scrollToIndex]);

  React.useEffect(() => {
    if (focusedId && rowIndexOf(focusedId) >= 0) return;
    setFocusedId(rows[0]?.org.id ?? null);
  }, [focusedId, rowIndexOf, rows]);

  const moveFocus = React.useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(rows.length - 1, nextIndex));
      const row = rows[clamped];
      if (!row) return;
      setFocusedId(row.org.id);
      scrollToIndex(clamped, "auto");
      onSelect(row.org.id);
    },
    [onSelect, rows, scrollToIndex],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = rowIndexOf(focusedId);
      const current = currentIndex >= 0 ? rows[currentIndex] : undefined;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveFocus(currentIndex + 1);
          return;
        case "ArrowUp":
          event.preventDefault();
          moveFocus(currentIndex - 1);
          return;
        case "ArrowRight": {
          event.preventDefault();
          if (!current) return;
          if (
            current.hasChildren &&
            !expandedIds.has(current.org.id) &&
            !loadingIds.has(current.org.id)
          ) {
            onToggle(current.org.id);
            return;
          }
          if (
            current.hasChildren &&
            (expandedIds.has(current.org.id) || loadingIds.has(current.org.id))
          ) {
            moveFocus(currentIndex + 1);
          }
          return;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (!current) return;
          if (current.hasChildren && expandedIds.has(current.org.id)) {
            onToggle(current.org.id);
            return;
          }
          const parentId = index.parentById.get(current.org.id) ?? null;
          const parentIndex = rowIndexOf(parentId);
          if (parentIndex >= 0) moveFocus(parentIndex);
          return;
        }
        case "Home":
          event.preventDefault();
          moveFocus(0);
          return;
        case "End":
          event.preventDefault();
          moveFocus(rows.length - 1);
          return;
        case "Enter":
        case " ":
          event.preventDefault();
          if (current) onSelect(current.org.id);
          return;
        default:
          break;
      }

      // 首字母定位（typeahead）
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const now = Date.now();
        const buffer =
          now - typeaheadRef.current.at > TYPEAHEAD_RESET
            ? event.key
            : typeaheadRef.current.buffer + event.key;
        typeaheadRef.current = { buffer, at: now };
        const needle = buffer.toLowerCase();
        const found = rows.findIndex(
          (row, position) =>
            position > currentIndex && row.org.name.toLowerCase().startsWith(needle),
        );
        const fallback = rows.findIndex((row) => row.org.name.toLowerCase().startsWith(needle));
        const target = found >= 0 ? found : fallback;
        if (target >= 0) {
          event.preventDefault();
          moveFocus(target);
        }
      }
    },
    [expandedIds, focusedId, index, loadingIds, moveFocus, onSelect, onToggle, rowIndexOf, rows],
  );

  // 搜索时把命中结果滚动到可见区
  React.useEffect(() => {
    if (!search) return;
    const first = rows.findIndex((row) => row.matched);
    if (first > 0) scrollToIndex(first, "center");
  }, [rows, scrollToIndex, search]);

  const visibleRows = rows.slice(startIndex, endIndex);
  const activeId = focusedId && rowIndexOf(focusedId) >= 0 ? focusedId : (rows[0]?.org.id ?? null);

  return (
    <section
      aria-label="组织树"
      className={cn("border-border bg-card flex min-h-0 flex-col rounded-xl border", className)}
    >
      <header className="border-border flex flex-col gap-2 border-b p-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xs font-semibold">组织树</h2>
          <Badge variant="secondary" className="num">
            {formatNumber(index.nodeById.size)}
          </Badge>
          <div className="ml-auto flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="展开全部"
                  onClick={onExpandAll}
                >
                  <ChevronsUpDown />
                </Button>
              </TooltipTrigger>
              <TooltipContent>展开全部（含懒加载节点）</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="折叠全部"
                  onClick={onCollapseAll}
                >
                  <ChevronsDownUp />
                </Button>
              </TooltipTrigger>
              <TooltipContent>折叠全部</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-xs"
                  aria-label="新建组织"
                  disabled={!canCreate}
                  onClick={onCreate}
                  className={cn(!canCreate && "cursor-not-allowed")}
                >
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{canCreate ? "新建组织" : createDenyReason}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {search ? (
          <div
            className="border-primary/25 bg-primary/5 flex items-center gap-2 rounded-md border px-2 py-1.5"
            aria-live="polite"
          >
            <Search className="text-primary size-3.5 shrink-0" />
            <span className="text-2xs min-w-0 flex-1 truncate">
              {search.matchIds.size === 0 ? (
                <>没有匹配「{query.trim()}」的组织</>
              ) : (
                <>
                  匹配 <span className="num font-medium">{formatNumber(search.matchIds.size)}</span>{" "}
                  个组织，已自动展开命中路径
                </>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="清空搜索"
              onClick={() => onQueryChange("")}
            >
              <X />
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-2xs">
            ↑↓ 移动 · → 展开 · ← 折叠 · 输入字母快速定位
          </p>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Search className="text-muted-foreground/70 size-4" />
          <p className="text-xs font-medium">没有匹配的组织</p>
          <p className="text-muted-foreground text-2xs">试试组织名称、编码（ORG-）或负责人姓名。</p>
          <Button type="button" variant="outline" size="xs" onClick={() => onQueryChange("")}>
            清空搜索
          </Button>
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          role="tree"
          tabIndex={0}
          aria-label="组织架构树"
          aria-activedescendant={activeId ? treeItemId(activeId) : undefined}
          onKeyDown={handleKeyDown}
          className="focus-visible:ring-ring/40 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleRows.map((row, visibleIndex) => {
                const { org } = row;
                const Icon = TYPE_ICON[org.type];
                const isSelected = org.id === selectedId;
                const isActive = org.id === activeId;
                const isLoading = loadingIds.has(org.id);
                const isExpanded = expandedIds.has(org.id);
                const rowIndex = startIndex + visibleIndex;

                return (
                  <div
                    key={org.id}
                    id={treeItemId(org.id)}
                    role="treeitem"
                    aria-level={row.depth + 1}
                    aria-setsize={row.setSize}
                    aria-posinset={row.posInSet}
                    aria-selected={isSelected}
                    aria-expanded={row.hasChildren ? isExpanded : undefined}
                    aria-busy={isLoading || undefined}
                    data-row-index={rowIndex}
                    data-selected={isSelected || undefined}
                    className={cn(
                      "group relative flex items-center gap-1.5 rounded-md pr-2 text-xs transition-colors",
                      "hover:bg-accent/70",
                      isSelected && "bg-primary/10 text-foreground",
                      isActive && !isSelected && "bg-accent/50",
                    )}
                    style={{ height: ROW_HEIGHT, paddingLeft: 6 + row.depth * INDENT }}
                    onClick={(event) => {
                      setFocusedId(org.id);
                      onSelect(org.id);
                      // 点击行本身也把键盘焦点留在树上，保证方向键继续可用
                      if (event.detail === 1) scrollRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    {isSelected ? (
                      <span
                        aria-hidden
                        className="bg-primary absolute top-1 bottom-1 left-0 w-0.5 rounded-full"
                      />
                    ) : null}

                    {row.hasChildren ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${isExpanded ? "折叠" : "展开"}${org.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggle(org.id);
                        }}
                        className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-5 shrink-0 cursor-pointer items-center justify-center rounded"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ChevronRight
                            className={cn(
                              "size-3.5 transition-transform motion-reduce:transition-none",
                              isExpanded && "rotate-90",
                            )}
                          />
                        )}
                      </button>
                    ) : (
                      <span aria-hidden className="size-5 shrink-0" />
                    )}

                    <Icon
                      className={cn("size-3.5 shrink-0", TYPE_ICON_CLASS[org.type])}
                      aria-hidden
                    />

                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        org.status === "archived" && "text-muted-foreground",
                        isSelected && "font-medium",
                      )}
                      title={`${org.name} · ${org.code} · 负责人 ${org.owner}`}
                    >
                      <Highlight
                        text={org.name}
                        query={search?.matchIds.has(org.id) ? query : ""}
                      />
                    </span>

                    {row.matched && row.matchField && row.matchField !== "name" ? (
                      <Badge variant="outline" className="hidden shrink-0 gap-1 lg:inline-flex">
                        {ORG_MATCH_FIELD_LABEL[row.matchField]}
                      </Badge>
                    ) : null}

                    {org.status === "archived" ? (
                      <StatusBadge status="archived" dot={false} className="shrink-0" />
                    ) : null}

                    <span
                      className="text-muted-foreground num text-2xs hidden shrink-0 md:inline"
                      title={`${formatNumber(org.memberCount)} 名直属成员`}
                    >
                      {formatNumber(org.memberCount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <footer className="border-border text-muted-foreground text-2xs flex items-center gap-2 border-t px-3 py-2">
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
          {formatNumber(index.nodeById.size)} 个组织
        </span>
        <span className="truncate">
          {index.maxDepth + 1} 层 · 成员 {formatNumber(index.totalMembers)}
        </span>
        <span className="sr-only" aria-live="polite">
          {liveMessage}
        </span>
      </footer>
    </section>
  );
}
