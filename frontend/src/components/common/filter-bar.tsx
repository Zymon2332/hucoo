"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  children: React.ReactNode;
  activeCount?: number;
  onReset?: () => void;
  className?: string;
}

export function FilterBar({ children, activeCount = 0, onReset, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2",
        className,
      )}
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-2xs font-medium">
        <SlidersHorizontal className="size-3.5" />
        筛选
      </span>
      {children}
      {activeCount > 0 ? (
        <Badge variant="secondary" className="num">
          {activeCount} 项生效
        </Badge>
      ) : null}
      {onReset ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onReset}
          disabled={activeCount === 0}
          className="ml-auto"
        >
          <X />
          清空筛选
        </Button>
      ) : null}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "全部",
  className,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className={cn("min-w-[8.5rem] text-2xs", className)} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FilterToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterToggle({ label, active, onClick }: FilterToggleProps) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className="text-2xs"
    >
      {label}
    </Button>
  );
}
