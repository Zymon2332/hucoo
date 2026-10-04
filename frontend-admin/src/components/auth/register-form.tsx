"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AuthErrorSummary, useErrorSummary } from "@/components/auth/form-error-summary";
import { PasswordInput } from "@/components/auth/password-input";
import { ServerErrorAlert } from "@/components/auth/server-error-alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { describeApiError, traceIdOf } from "@/lib/api-client";
import { safeNextPath } from "@/lib/auth/redirect";
import { registerAccount, signIn } from "@/lib/auth/session";
import { isApiError } from "@/types/api";
import { cn } from "@/lib/utils";

const ACCOUNT_PATTERN = /^[A-Za-z0-9._@-]+$/;

const registerSchema = z
  .object({
    account: z
      .string()
      .trim()
      .min(3, "账号至少 3 个字符")
      .max(64, "账号长度不能超过 64 个字符")
      .regex(ACCOUNT_PATTERN, "账号仅支持字母、数字与 . _ - @"),
    name: z.string().trim().max(24, "姓名不能超过 24 个字符"),
    password: z
      .string()
      .min(8, "密码至少 8 位")
      .max(128, "密码长度不能超过 128 位")
      .regex(/[A-Za-z]/, "密码需包含字母")
      .regex(/\d/, "密码需包含数字"),
    confirmPassword: z.string().min(1, "请再次输入密码"),
    agreement: z.boolean().refine((value) => value, "请先阅读并同意服务条款与隐私政策"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/** 强度只用于提示，不参与校验：长度、字母、数字、符号各计 1 分。 */
function scorePassword(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 3);
}

const STRENGTH_LABELS = ["太弱", "较弱", "中等", "较强"] as const;
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-emerald-500",
] as const;

function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value);
  const label = value ? STRENGTH_LABELS[score] : "等待输入";

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              value && score > index ? STRENGTH_COLORS[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <span aria-live="polite" className="text-muted-foreground text-2xs">
        强度：{label}
      </span>
    </div>
  );
}

interface ServerError {
  title: string;
  message: string;
  traceId?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues: { account: "", name: "", password: "", confirmPassword: "", agreement: false },
  });
  const summary = useErrorSummary<RegisterFormValues>(form, formRef, {
    account: "登录账号",
    name: "姓名",
    password: "登录密码",
    confirmPassword: "确认密码",
    agreement: "服务条款",
  });
  const passwordValue = form.watch("password");
  const [serverError, setServerError] = React.useState<ServerError | null>(null);

  React.useEffect(() => {
    const subscription = form.watch(() => setServerError(null));
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const result = await registerAccount({
        identifier: values.account,
        password: values.password,
        displayName: values.name,
      });

      // 注册即激活的账号直接登录进入控制台；需要管理员激活的账号回落到登录页。
      try {
        await signIn({
          identifier: values.account,
          credential: values.password,
          remember: true,
        });
        toast.success(`账号「${result.username}」已创建，正在进入控制台`);
        router.replace(safeNextPath(searchParams.get("next")));
      } catch {
        toast.success(`账号「${result.username}」已创建，请使用该账号登录`);
        router.push("/login");
      }
    } catch (error) {
      setServerError({
        title: isApiError(error) && error.status === 409 ? "该账号已被注册" : "注册失败",
        message: describeApiError(error),
        traceId: traceIdOf(error),
      });
    }
  };

  return (
    <Form {...form}>
      <form ref={formRef} noValidate onSubmit={form.handleSubmit(onSubmit, summary.handleInvalid)}>
        <div className="flex flex-col gap-4">
          <AuthErrorSummary items={summary.items} summaryRef={summary.summaryRef} />
          {serverError ? (
            <ServerErrorAlert
              title={serverError.title}
              message={serverError.message}
              traceId={serverError.traceId}
            />
          ) : null}

          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <UserRound className="text-muted-foreground size-3.5" />
                  登录账号
                </FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    autoFocus
                    placeholder="用户名或工作邮箱"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  登录时使用，不区分大小写；可用字母、数字与 . _ - @。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <ShieldCheck className="text-muted-foreground size-3.5" />
                  姓名
                </FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="用于审批与审计留痕" {...field} />
                </FormControl>
                <FormDescription>可留空，留空时展示登录账号。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <LockKeyhole className="text-muted-foreground size-3.5" />
                  登录密码
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="至少 8 位，含字母与数字"
                    {...field}
                  />
                </FormControl>
                <PasswordStrength value={passwordValue ?? ""} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <LockKeyhole className="text-muted-foreground size-3.5" />
                  确认密码
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="再次输入登录密码"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agreement"
            render={({ field }) => (
              <FormItem className="gap-1.5">
                <div className="flex items-start gap-2">
                  <FormControl>
                    <Checkbox
                      aria-label="我已阅读并同意服务条款与隐私政策"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-2xs leading-relaxed">
                    我已阅读并同意
                    <button
                      type="button"
                      onClick={() => toast.info("演示环境：服务条款内容未提供")}
                      className="text-primary focus-visible:ring-ring/40 mx-0.5 cursor-pointer rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                      《服务条款》
                    </button>
                    与
                    <button
                      type="button"
                      onClick={() => toast.info("演示环境：隐私政策内容未提供")}
                      className="text-primary focus-visible:ring-ring/40 mx-0.5 cursor-pointer rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
                    >
                      《隐私政策》
                    </button>
                    ，并同意平台创建该账号。
                  </p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                正在创建…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                创建管理员账号
              </>
            )}
          </Button>

          <p className="text-muted-foreground text-2xs leading-relaxed">
            注册即激活，成功后会自动登录；演示环境的数据保存在后端内存，后端重启后失效。
          </p>
        </div>
      </form>
    </Form>
  );
}
