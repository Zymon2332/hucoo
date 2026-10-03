import * as React from "react";
import Link from "next/link";
import { Boxes, Building2, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";

const HIGHLIGHTS = [
  {
    icon: Building2,
    title: "多租户与权限治理",
    description: "租户、组织架构、角色与权限矩阵统一收口",
  },
  {
    icon: Boxes,
    title: "模型与工具治理",
    description: "平台模型、BYOK 密钥、MCP 工具目录与路由策略",
  },
  {
    icon: ReceiptText,
    title: "用量与计费",
    description: "套餐定价、账单核销、预算与成本告警",
  },
  {
    icon: ShieldCheck,
    title: "安全与合规",
    description: "审计日志、DLP 策略、审批流与合规证据",
  },
] as const;

const TRUST_TAGS = ["等保三级", "SSO / SAML", "审计留痕"] as const;

function BrandMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Sparkles className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="font-display text-foreground block text-sm font-semibold">Agent 平台</span>
        <span className="text-muted-foreground text-2xs block">管理控制台</span>
      </span>
    </span>
  );
}

/** 认证页外壳：左侧品牌面板 + 右侧表单区，沿用管理台的设计令牌与字体。 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="bg-background flex min-h-svh flex-col lg:flex-row">
      <aside className="bg-card border-border relative hidden shrink-0 overflow-hidden border-r lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12 xl:w-[44%] xl:p-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-primary/10 absolute -top-32 -left-24 size-[28rem] rounded-full blur-3xl" />
          <div className="bg-primary/5 absolute -right-24 -bottom-32 size-[24rem] rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)] bg-[size:44px_44px] opacity-60" />
        </div>

        <div className="relative flex flex-col gap-10">
          <BrandMark />

          <div className="max-w-md">
            <p className="font-display text-foreground text-3xl leading-tight font-semibold tracking-tight xl:text-[2.1rem]">
              把 Agent 从沙箱送进生产
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              一个入口管住租户、权限、模型、工具与账单：从沙箱实验到规模化上线，全程可观测、可审计、可计量。
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="text-foreground block text-xs font-medium">{item.title}</span>
                  <span className="text-muted-foreground text-2xs mt-0.5 block leading-relaxed">
                    {item.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <ul className="relative flex flex-wrap items-center gap-2">
          {TRUST_TAGS.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary">{tag}</Badge>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col lg:min-h-0">
        <header className="flex items-center justify-between gap-3 px-5 py-4 lg:justify-end lg:px-8">
          <Link
            href="/login"
            className="focus-visible:ring-ring/40 rounded-lg focus-visible:ring-[3px] focus-visible:outline-none lg:hidden"
          >
            <BrandMark />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-6 lg:px-10">
          <div className="w-full max-w-[27rem]">{children}</div>
        </main>

        <footer className="text-muted-foreground text-2xs px-5 pb-6 text-center lg:px-8">
          © {year} Agent 平台 · 演示环境，页面数据为本地模拟
        </footer>
      </div>
    </div>
  );
}

/** 认证表单卡片：标题 + 说明 + 表单 + 底部切换链接。 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="bg-card border-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 rounded-xl border p-6 shadow-[var(--shadow-card)] motion-safe:duration-500 sm:p-7">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
        ) : null}
      </header>

      <div className="mt-6">{children}</div>

      {footer ? (
        <div className="border-border text-muted-foreground mt-6 border-t pt-4 text-center text-xs">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
