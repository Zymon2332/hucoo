"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * 带「显示 / 隐藏」切换的密码输入框。
 * 切换按钮保留 aria-pressed 与可访问名称，且不禁用粘贴（WCAG 2.2 可访问性认证）。
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/40 absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  );
}
