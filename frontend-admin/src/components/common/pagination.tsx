"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <p className="text-muted-foreground num text-2xs">
        共 {total} 条 · 当前 {start}-{end}
      </p>
      <div className="flex items-center gap-1.5">
        {onPageSizeChange ? (
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger size="sm" className="h-7 w-[5.5rem] text-2xs" aria-label="每页条数">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} 条/页
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          aria-label="第一页"
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="上一页"
        >
          <ChevronLeft />
        </Button>
        <span className="text-muted-foreground num px-1 text-2xs">
          {safePage} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= pageCount}
          aria-label="下一页"
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(pageCount)}
          disabled={safePage >= pageCount}
          aria-label="最后一页"
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  );
}
