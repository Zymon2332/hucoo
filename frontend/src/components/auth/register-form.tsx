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
  Mail,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { AuthErrorSummary, useErrorSummary } from "@/components/auth/form-error-summary";
import { PasswordInput } from "@/components/auth/password-input";
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
import { cn, sleep } from "@/lib/utils";

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

const registerSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(2, "企业名称至少 2 个字符")
      .max(48, "企业名称不能超过 48 个字符"),
    name: z.string().trim().min(2, "请输入管理员姓名").max(24, "姓名不能超过 24 个字符"),
    email: z.string().trim().email("请输入有效的工作邮箱"),
    phone: z.string().regex(PHONE_PATTERN, "请输入 11 位中国大陆手机号"),
    password: z
      .string()
      .min(8, "密码至少 8 位")
      .max(72, "密码长度不能超过 72 位")
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

export function RegisterForm() {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    shouldFocusError: false,
    defaultValues: {
      company: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agreement: false,
    },
  });
  const summary = useErrorSummary<RegisterFormValues>(form, formRef, {
    company: "企业名称",
    name: "管理员姓名",
    email: "工作邮箱",
    phone: "手机号",
    password: "登录密码",
    confirmPassword: "确认密码",
    agreement: "服务条款",
  });
  const passwordValue = form.watch("password");

  const onSubmit = async (values: RegisterFormValues) => {
    await sleep(700);
    toast.success(`已为「${values.company}」创建管理员账号，请登录`);
    router.push("/login");
  };

  return (
    <Form {...form}>
      <form ref={formRef} noValidate onSubmit={form.handleSubmit(onSubmit, summary.handleInvalid)}>
        <div className="flex flex-col gap-4">
          <AuthErrorSummary items={summary.items} summaryRef={summary.summaryRef} />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Building2 className="text-muted-foreground size-3.5" />
                  企业名称
                </FormLabel>
                <FormControl>
                  <Input autoComplete="organization" placeholder="例如：云启科技" {...field} />
                </FormControl>
                <FormDescription>注册后将自动创建同名企业空间，可稍后邀请成员。</FormDescription>
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
                  <UserRound className="text-muted-foreground size-3.5" />
                  管理员姓名
                </FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="用于审批与审计留痕" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Mail className="text-muted-foreground size-3.5" />
                  工作邮箱
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    ，并同意平台按演示规则创建账号。
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
            演示环境：提交后立即创建本地账号，不会向任何服务端发送数据。
          </p>
        </div>
      </form>
    </Form>
  );
}
