"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Building2,
  Loader2,
  LockKeyhole,
  QrCode,
  RefreshCw,
  Smartphone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AuthErrorSummary, useErrorSummary } from "@/components/auth/form-error-summary";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthDivider, SsoButtons } from "@/components/auth/sso-buttons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tenants } from "@/lib/mock-data/tenants";
import { sleep } from "@/lib/utils";

const accountSchema = z.object({
  tenant: z.string().min(1, "请选择企业空间"),
  account: z.string().trim().min(3, "账号至少 3 个字符").max(64, "账号长度不能超过 64 个字符"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码长度不能超过 72 位"),
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

function AccountLoginForm() {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues: {
      tenant: tenants[0]?.id ?? "",
      account: "",
      password: "",
      remember: true,
    },
  });
  const summary = useErrorSummary<AccountFormValues>(form, formRef);

  const onSubmit = async () => {
    await sleep(600);
    toast.success("登录成功，正在进入控制台");
    router.push("/dashboard");
  };

  return (
    <Form {...form}>
      <form ref={formRef} noValidate onSubmit={form.handleSubmit(onSubmit, summary.handleInvalid)}>
        <div className="flex flex-col gap-4">
          <AuthErrorSummary items={summary.items} summaryRef={summary.summaryRef} />

          <FormField
            control={form.control}
            name="tenant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Building2 className="text-muted-foreground size-3.5" />
                  企业空间
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择企业空间" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  <Input autoComplete="username" placeholder="用户名或工作邮箱" {...field} />
                </FormControl>
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

          <AuthDivider label="其他登录方式" />
          <SsoButtons disabled={form.formState.isSubmitting} />
        </div>
      </form>
    </Form>
  );
}

function PhoneLoginForm() {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues: { phone: "", code: "" },
  });
  const summary = useErrorSummary<PhoneFormValues>(form, formRef);

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

    setSending(true);
    await sleep(500);
    setSending(false);
    setCountdown(60);
    toast.success("验证码已发送（演示环境固定为 123456）");
  };

  const onSubmit = async () => {
    await sleep(600);
    toast.success("登录成功，正在进入控制台");
    router.push("/dashboard");
  };

  return (
    <Form {...form}>
      <form ref={formRef} noValidate onSubmit={form.handleSubmit(onSubmit, summary.handleInvalid)}>
        <div className="flex flex-col gap-4">
          <AuthErrorSummary items={summary.items} summaryRef={summary.summaryRef} />

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

const QR_SIZE = 21;

/** 演示用占位二维码：确定性伪随机点阵 + 三个定位角，仅为视觉占位，不含真实编码。 */
function buildQrMatrix(seed: number) {
  const cells: boolean[] = [];
  let value = seed * 9301 + 49297;
  const next = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };

  for (let index = 0; index < QR_SIZE * QR_SIZE; index += 1) {
    cells.push(next() > 0.55);
  }

  const isFinder = (row: number, col: number, originRow: number, originCol: number) => {
    const rowOffset = row - originRow;
    const colOffset = col - originCol;
    if (rowOffset < 0 || rowOffset > 6 || colOffset < 0 || colOffset > 6) return null;
    const onBorder = rowOffset === 0 || rowOffset === 6 || colOffset === 0 || colOffset === 6;
    const inCenter = rowOffset >= 2 && rowOffset <= 4 && colOffset >= 2 && colOffset <= 4;
    return onBorder || inCenter;
  };

  for (let row = 0; row < QR_SIZE; row += 1) {
    for (let col = 0; col < QR_SIZE; col += 1) {
      const finder =
        isFinder(row, col, 0, 0) ??
        isFinder(row, col, 0, QR_SIZE - 7) ??
        isFinder(row, col, QR_SIZE - 7, 0);
      if (finder !== null) cells[row * QR_SIZE + col] = finder;
    }
  }

  return cells;
}

function QrLoginPanel() {
  const [seed, setSeed] = React.useState(1);
  const cells = React.useMemo(() => buildQrMatrix(seed), [seed]);

  return (
    <div className="flex flex-col items-center gap-4 py-1">
      <div
        role="img"
        aria-label="登录二维码（演示环境占位图形）"
        className="border-border bg-card rounded-xl border p-3 shadow-[var(--shadow-card)]"
      >
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${QR_SIZE}, minmax(0, 1fr))` }}
        >
          {cells.map((filled, index) => (
            <span
              key={index}
              className={
                filled ? "bg-foreground aspect-square rounded-[1px]" : "aspect-square rounded-[1px]"
              }
            />
          ))}
        </div>
      </div>

      <div className="text-center">
        <p className="text-foreground flex items-center justify-center gap-1.5 text-xs font-medium">
          <QrCode className="size-3.5" />
          使用「Agent 平台」移动端扫码登录
        </p>
        <p className="text-muted-foreground text-2xs mt-1">
          演示环境：二维码为占位图形，刷新后可重新生成
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setSeed((value) => value + 1);
          toast.info("二维码已刷新（演示环境）");
        }}
      >
        <RefreshCw className="size-3.5" />
        刷新二维码
      </Button>
    </div>
  );
}

export function LoginForm() {
  return (
    <Tabs defaultValue="account" className="gap-5">
      <TabsList className="h-9 w-full">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="h-8 flex-1 text-xs sm:text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

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
        ，演示数据不会离开本机。
      </p>
    </Tabs>
  );
}
