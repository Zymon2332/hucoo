import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 Agent 平台管理控制台，管理租户、权限、模型、工具与用量计费。",
};

/** `LoginForm` 依赖 useSearchParams 读取 next 参数，静态渲染时需要 Suspense 边界。 */
function LoginFormFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="bg-muted h-9 rounded-lg" />
      <div className="bg-muted h-16 rounded-lg" />
      <div className="bg-muted h-16 rounded-lg" />
      <div className="bg-muted h-10 rounded-lg" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthCard
      title="登录管理控制台"
      description="使用企业空间账号登录，或通过已配置的企业身份源免密进入。"
      footer={
        <>
          还没有账号？
          <Link
            href="/register"
            className="text-primary focus-visible:ring-ring/40 ml-1 rounded-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
          >
            立即注册
          </Link>
        </>
      }
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
