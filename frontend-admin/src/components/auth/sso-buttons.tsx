"use client";

import { MessageCircle, Send, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** 与其他登录方式对齐管理台「集成中心 / 身份源」中已支持的企业身份源类型。 */
const PROVIDERS = [
  { id: "wecom", label: "企业微信", icon: MessageCircle },
  { id: "feishu", label: "飞书", icon: Send },
  { id: "dingtalk", label: "钉钉", icon: Zap },
  { id: "oidc", label: "统一身份认证", icon: ShieldCheck },
] as const;

export function SsoButtons({ disabled = false }: { disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="justify-start gap-2 font-normal"
          onClick={() => toast.info(`演示环境：将跳转到「${provider.label}」授权页`)}
        >
          <provider.icon className="text-muted-foreground size-3.5" />
          <span className="truncate">{provider.label}</span>
        </Button>
      ))}
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-2xs">{label}</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
