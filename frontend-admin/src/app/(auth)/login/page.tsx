import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 Agent 平台管理控制台，管理租户、权限、模型、工具与用量计费。",
};

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
      <LoginForm />
    </AuthCard>
  );
}
