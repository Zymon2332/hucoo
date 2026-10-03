"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "搜索…",
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn("h-8 pl-8 text-xs", value ? "pr-8" : "", inputClassName)}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="清空搜索"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
