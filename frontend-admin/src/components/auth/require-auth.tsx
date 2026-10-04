"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { bootstrapSession, useAuthStatus } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/env";

/**
 * 管理台路由守卫：挂载时恢复登录态，未登录则带 `next` 跳回登录页。
 *
 * 会话校验完成前只渲染过渡屏，避免先闪一下管理台骨架再跳走。
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStatus();

  React.useEffect(() => {
    void bootstrapSession();
  }, []);

  React.useEffect(() => {
    if (status !== "anonymous") return;
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`${LOGIN_PATH}${next}`);
  }, [pathname, router, status]);

  if (status === "authenticated") return <>{children}</>;

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-3">
      <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
        <Sparkles className="size-4" />
      </span>
      <p className="text-muted-foreground flex items-center gap-2 text-xs" role="status">
        <Loader2 className="size-3.5 animate-spin" />
        正在校验登录状态…
      </p>
    </div>
  );
}
