"use client";

import { MessageCircle, Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthProviders } from "@/hooks/use-auth-providers";
import { authApi } from "@/lib/api/auth";
import { describeApiError } from "@/lib/api-client";
import type { AuthMethod } from "@/types/auth";

/** 后端目前只实现了这两个 OAuth 方式（见 `AuthenticationMethod`）。 */
const OAUTH_PROVIDERS: { id: string; label: string; method: AuthMethod; icon: LucideIcon }[] = [
  { id: "wechat", label: "微信", method: "WECHAT", icon: MessageCircle },
  { id: "qq", label: "QQ", method: "QQ", icon: Zap },
];

/**
 * 第三方登录入口。
 *
 * 只有 `/auth/providers` 标记为 enabled 的方式才可点击，点击后走
 * `GET /auth/oauth/{provider}/authorize` 取授权地址跳转；未启用的按钮直接禁用，不做假跳转。
 * 企业微信 / 飞书 / 钉钉 / OIDC 尚未接入，按钮不展示（避免误导）。
 */
export function SsoButtons({ disabled = false }: { disabled?: boolean }) {
  const providers = useAuthProviders();
  const enabledMethods = new Set(
    (providers.data ?? [])
      .filter((provider) => provider.enabled)
      .map((provider) => provider.method),
  );
  const anyAvailable = OAUTH_PROVIDERS.some((provider) => enabledMethods.has(provider.method));

  const startOAuth = async (method: AuthMethod, label: string) => {
    try {
      const result = await authApi.oauthAuthorize(method, `${window.location.origin}/login`);
      window.location.href = result.authorizationUrl;
    } catch (error) {
      toast.error(`无法发起「${label}」授权：${describeApiError(error)}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {OAUTH_PROVIDERS.map((provider) => {
          const available = enabledMethods.has(provider.method);
          return (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || !available}
              title={available ? `使用${provider.label}登录` : "后端未启用该认证方式"}
              className="justify-start gap-2 font-normal"
              onClick={() => void startOAuth(provider.method, provider.label)}
            >
              <provider.icon className="text-muted-foreground size-3.5" />
              <span className="truncate">{provider.label}</span>
            </Button>
          );
        })}
      </div>

      {!anyAvailable ? (
        <p className="text-muted-foreground text-2xs leading-relaxed">
          第三方登录尚未启用：后端 <span className="font-mono">/auth/providers</span> 未开启
          OAuth；企业微信、飞书、钉钉、统一身份认证还未接入。
        </p>
      ) : null}
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
