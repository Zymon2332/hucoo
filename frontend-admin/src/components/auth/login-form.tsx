"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, LockKeyhole, QrCode, Smartphone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AuthErrorSummary, useErrorSummary } from "@/components/auth/form-error-summary";
import { PasswordInput } from "@/components/auth/password-input";
import { ServerErrorAlert } from "@/components/auth/server-error-alert";
import { AuthDivider, SsoButtons } from "@/components/auth/sso-buttons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthProviders, methodEnabled } from "@/hooks/use-auth-providers";
import { authApi } from "@/lib/api/auth";
import { describeApiError, traceIdOf } from "@/lib/api-client";
import { safeNextPath } from "@/lib/auth/redirect";
import { signIn } from "@/lib/auth/session";

const accountSchema = z.object({
  account: z.string().trim().min(3, "账号至少 3 个字符").max(64, "账号长度不能超过 64 个字符"),
  password: z.string().min(1, "请输入登录密码").max(128, "密码长度不能超过 128 位"),
  remember: z.boolean(),
});

const phoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入 11 位中国大陆手机号"),
  code: z.string().regex(/^\d{6}$/, "验证码为 6 位数字"),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

const TABS = [
  { value: "account", label: "账号登录" },
  { value: "phone", label: "手机登录" },
  { value: "qr", label: "扫码登录" },
] as const;

interface ServerError {
  message: string;
  traceId?: string;
}

function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues: { account: "", password: "", remember: true },
  });
  const summary = useErrorSummary<AccountFormValues>(form, formRef);
  const [serverError, setServerError] = React.useState<ServerError | null>(null);

  // 重新输入时清掉上一次的服务端报错，避免旧提示误导
  React.useEffect(() => {
    const subscription = form.watch(() => setServerError(null));
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: AccountFormValues) => {
    setServerError(null);
    try {
      await signIn({
        identifier: values.account,
        credential: values.password,
        remember: values.remember,
      });
      toast.success("登录成功，正在进入控制台");
      router.replace(safeNextPath(searchParams.get("next")));
    } catch (error) {
      setServerError({ message: describeApiError(error), traceId: traceIdOf(error) });
    }
  };

  return (
    <Form {...form}>
      <form ref={formRef} noValidate onSubmit={form.handleSubmit(onSubmit, summary.handleInvalid)}>
        <div className="flex flex-col gap-4">
          <AuthErrorSummary items={summary.items} summaryRef={summary.summaryRef} />
          {serverError ? (
            <ServerErrorAlert
              title="登录失败"
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
                  账号
                </FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    autoFocus
                    placeholder="用户名或工作邮箱"
                    {...field}
                  />
                </FormControl>
                <FormDescription>企业空间由账号决定，登录后可切换有权限的空间。</FormDescription>
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
                  密码
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="请输入登录密码"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-3">
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">记住我</FormLabel>
                </FormItem>
              )}
            />
            <button
              type="button"
              onClick={() => toast.info("演示环境：请联系企业空间管理员重置密码")}
              className="text-primary focus-visible:ring-ring/40 cursor-pointer rounded-sm text-xs font-medium hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
            >
              忘记密码？
            </button>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                正在登录…
              </>
            ) : (
              "立即登录"
            )}
          </Button>

          <p className="text-muted-foreground text-2xs leading-relaxed">
            后端内置演示账号：<span className="font-mono">admin</span> /{" "}
            <span className="font-mono">Admin@12345</span>
            （注册的账号使用注册时设置的密码）。
          </p>

          <AuthDivider label="其他登录方式" />
          <SsoButtons disabled={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}

function PhoneLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues: { phone: "", code: "" },
  });
  const summary = useErrorSummary<PhoneFormValues>(form, formRef);
  const [serverError, setServerError] = React.useState<ServerError | null>(null);

  const [countdown, setCountdown] = React.useState(0);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    const valid = await form.trigger("phone");
    if (!valid) return;

    setServerError(null);
    setSending(true);
    try {
      await authApi.sendVerificationCode({
        channel: "SMS",
        purpose: "LOGIN",
        destination: form.getValues("phone"),
      });
      setCountdown(60);
      toast.success("验证码已发送");
    } catch (error) {
      // 校验用 toast 提示，提交用顶部 Alert，避免重复占用焦点
      toast.error(describeApiError(error));
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (values: PhoneFormValues) => {
    setServerError(null);
    try {
      await signIn({
        method: "SMS",
        identifier: values.phone,
        credential: values.code,
        remember: true,
      });
      toast.success("登录成功，正在进入控制台");
      router.replace(safeNextPath(searchParams.get("next")));
    } catch (error) {
      setServerError({ message: describeApiError(error), traceId: traceIdOf(error) });
    }
  };

  return (
    <Form {...form}>
      <form ref={formRef} noValidate onSubmit={form.handleSubmit(onSubmit, summary.handleInvalid)}>
        <div className="flex flex-col gap-4">
          <AuthErrorSummary items={summary.items} summaryRef={summary.summaryRef} />
          {serverError ? (
            <ServerErrorAlert
              title="登录失败"
              message={serverError.message}
              traceId={serverError.traceId}
            />
          ) : null}

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Smartphone className="text-muted-foreground size-3.5" />
                  手机号
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="11 位手机号"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>验证码</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6 位数字验证码"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="shrink-0 px-3"
                    disabled={sending || countdown > 0 || form.formState.isSubmitting}
                    onClick={handleSendCode}
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    <span aria-live="polite">
                      {countdown > 0 ? `重新发送 ${countdown}s` : "发送验证码"}
                    </span>
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                正在登录…
              </>
            ) : (
              "立即登录"
            )}
          </Button>

          <AuthDivider label="其他登录方式" />
          <SsoButtons disabled={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}

/** 扫码登录：后端尚未提供二维码接口，这里如实说明，不再展示占位二维码。 */
function QrLoginPanel() {
  return (
    <Alert variant="info">
      <QrCode />
      <AlertTitle>扫码登录尚未接入</AlertTitle>
      <AlertDescription>
        后端未提供二维码登录接口（可用认证方式见 <span className="font-mono">/auth/providers</span>
        ），接入后会在此展示二维码。
      </AlertDescription>
    </Alert>
  );
}

export function LoginForm() {
  const providers = useAuthProviders();
  const smsEnabled = methodEnabled(providers.data, "SMS");

  return (
    <Tabs defaultValue="account" className="gap-5">
      <TabsList className="h-9 w-full">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.value === "phone" && smsEnabled === false}
            className="h-8 flex-1 text-xs sm:text-sm"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {smsEnabled === false ? (
        <p className="text-muted-foreground text-2xs -mt-2 leading-relaxed">
          后端当前只启用了账号密码登录，手机号登录未启用。
        </p>
      ) : null}

      <TabsContent value="account">
        <AccountLoginForm />
      </TabsContent>
      <TabsContent value="phone">
        <PhoneLoginForm />
      </TabsContent>
      <TabsContent value="qr">
        <QrLoginPanel />
      </TabsContent>

      <p className="text-muted-foreground text-2xs leading-relaxed">
        登录即表示同意
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
        ，登录凭证仅保存在本机浏览器。
      </p>
    </Tabs>
  );
}
