import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "注册",
  description: "注册 Agent 平台管理端账号，注册后即可登录管理租户、权限、模型、工具与用量计费。",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="注册管理端账号"
      description="创建账号后即可登录；企业空间与成员权限由平台管理员分配。"
      footer={
        <>
          已有账号？
          <Link
            href="/login"
            className="text-primary focus-visible:ring-ring/40 ml-1 rounded-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
          >
            返回登录
          </Link>
        </>
      }
    >
      <Suspense fallback={<RegisterFormFallback />}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}

/** `RegisterForm` 依赖 useSearchParams 读取 next 参数，静态渲染时需要 Suspense 边界。 */
function RegisterFormFallback() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="bg-muted h-16 rounded-lg" />
      <div className="bg-muted h-16 rounded-lg" />
      <div className="bg-muted h-16 rounded-lg" />
      <div className="bg-muted h-10 rounded-lg" />
    </div>
  );
}
