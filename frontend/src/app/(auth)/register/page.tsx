import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "注册",
  description: "注册 Agent 平台企业空间，创建管理员账号并开始治理模型、工具与用量。",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="注册企业空间"
      description="填写管理员信息即可创建企业空间，后续可邀请成员并接入企业身份源。"
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
      <RegisterForm />
    </AuthCard>
  );
}
