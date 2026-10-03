"use client";

import {
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  statusActive?: boolean;
  extraItems?: { label: string; onSelect: () => void; destructive?: boolean }[];
  viewLabel?: string;
}

export function RowActions({
  onView,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
  disabled = false,
  statusActive = true,
  extraItems = [],
  viewLabel = "查看详情",
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="行操作"
          className="text-muted-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        {onView ? (
          <DropdownMenuItem onSelect={onView}>
            <Eye />
            {viewLabel}
          </DropdownMenuItem>
        ) : null}
        {onEdit ? (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            编辑
          </DropdownMenuItem>
        ) : null}
        {onDuplicate ? (
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy />
            复制
          </DropdownMenuItem>
        ) : null}
        {extraItems.length > 0 ? <DropdownMenuSeparator /> : null}
        {extraItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            variant={item.destructive ? "destructive" : "default"}
            onSelect={item.onSelect}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
        {onToggleStatus || onDelete ? <DropdownMenuSeparator /> : null}
        {onToggleStatus ? (
          <DropdownMenuItem onSelect={onToggleStatus}>
            {statusActive ? <PowerOff /> : <Power />}
            {statusActive ? "禁用" : "启用"}
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={disabled}
            onSelect={onDelete}
            className="text-destructive"
          >
            <Trash2 />
            删除
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
