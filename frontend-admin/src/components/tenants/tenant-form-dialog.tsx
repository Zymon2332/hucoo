"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServerErrorAlert } from "@/components/auth/server-error-alert";
import { gapHint } from "@/components/tenants/missing-value";
import { useCreateTenant, useUpdateTenant } from "@/hooks/use-tenants";
import { describeApiError, traceIdOf } from "@/lib/api-client";
import { LABELS } from "@/lib/labels";
import {
  FORM_STATUS_OPTIONS,
  REGION_OPTIONS,
  TENANT_FORM_DEFAULTS,
  tenantFormSchema,
  toCreateRequest,
  toFormValues,
  type TenantFormValues,
} from "@/lib/tenants";
import type { TenantRow } from "@/types/tenant";

const PLAN_OPTIONS = Object.entries(LABELS)
  .filter(([key]) => ["free", "team", "business", "enterprise"].includes(key))
  .map(([value, label]) => ({ value, label }));

const FEATURE_FLAGS = [
  ["allowCustomModels", "允许自定义模型"],
  ["allowByok", "允许 BYOK"],
  ["allowLocalModels", "允许本地模型"],
  ["allowSharedModels", "允许共享模型"],
] as const;

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传租户表示编辑，传 null 表示新建 */
  tenant: TenantRow | null;
  onSaved?: () => void;
}

/**
 * 新建 / 编辑租户弹窗（列表页与详情页共用）。
 *
 * 表单保留区域、席位、负责人、功能开关等原有元素；这些字段后端暂未提供，
 * 会以「后端暂无该字段」明确标注且不进入请求体，等接口补齐后去掉标注即可生效。
 */
export function TenantFormDialog({ open, onOpenChange, tenant, onSaved }: TenantFormDialogProps) {
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const [serverError, setServerError] = React.useState<{
    message: string;
    traceId?: string;
  } | null>(null);

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    mode: "onBlur",
    defaultValues: TENANT_FORM_DEFAULTS,
  });

  // 每次打开时按当前租户重置，避免残留上一次编辑的值
  React.useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset(tenant ? toFormValues(tenant) : TENANT_FORM_DEFAULTS);
  }, [open, tenant, form]);

  /** 历史数据的套餐编码可能是后端自定义值，补进下拉避免选择框空掉。 */
  const planOptions = React.useMemo(() => {
    const current = tenant?.planCode;
    if (current && !PLAN_OPTIONS.some((option) => option.value === current)) {
      return [...PLAN_OPTIONS, { value: current, label: `${current}（后端自定义）` }];
    }
    return PLAN_OPTIONS;
  }, [tenant]);

  const pending = createTenant.isPending || updateTenant.isPending;

  const onSubmit = async (values: TenantFormValues) => {
    setServerError(null);
    const payload = toCreateRequest(values);
    try {
      if (tenant) {
        await updateTenant.mutateAsync({ id: tenant.id, payload });
        toast.success(`已更新租户「${payload.tenantName}」`);
      } else {
        await createTenant.mutateAsync(payload);
        toast.success(`已创建租户「${payload.tenantName}」`);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      setServerError({ message: describeApiError(error), traceId: traceIdOf(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tenant ? `编辑租户 · ${tenant.tenantName}` : "新建租户"}</DialogTitle>
          <DialogDescription>
            提交到
            /api/admin/v1/tenants；后端写接口是整体替换语义。标注「后端暂无该字段」的项不会提交，待接口补齐后自动生效。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError ? (
              <ServerErrorAlert
                title={tenant ? "更新失败" : "创建失败"}
                message={serverError.message}
                traceId={serverError.traceId}
              />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>租户名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：云启科技" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>租户标识</FormLabel>
                    <FormControl>
                      <Input placeholder="cloudnova" {...field} />
                    </FormControl>
                    <FormDescription>
                      对应后端 tenantCode，用于列表搜索；后端未加唯一约束。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>套餐</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {planOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>对应后端 planCode（自由文本）。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORM_STATUS_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      后端 status 目前只有 1 启用 / 0 停用，试用中、开通中等状态待接口补齐。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expireAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>到期时间</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>对应后端 expireAt；留空表示不修改。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>区域</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      后端暂无该字段，本次不会提交（{gapHint("region")}）。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="seats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>席位数量</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      后端暂无该字段，本次不会提交（{gapHint("seats")}）。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>负责人</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：陈立" {...field} />
                    </FormControl>
                    <FormDescription>
                      后端暂无该字段，本次不会提交（{gapHint("ownerName")}）。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>负责人邮箱</FormLabel>
                    <FormControl>
                      <Input placeholder="owner@example.com" {...field} />
                    </FormControl>
                    <FormDescription>对应后端 contactEmail；留空提交空串等于清空。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-border space-y-3 rounded-md border p-3">
              <div>
                <p className="text-xs font-medium">租户级功能开关</p>
                <p className="text-muted-foreground text-2xs">
                  页面开关保留；后端暂无对应字段，本次不会提交（{gapHint("featureFlags")}）。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {FEATURE_FLAGS.map(([name, labelText]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <div className="border-border flex items-center justify-between rounded-md border px-3 py-2">
                        <Label htmlFor={`switch-${name}`} className="text-xs font-normal">
                          {labelText}
                        </Label>
                        <Switch
                          id={`switch-${name}`}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {tenant ? "保存修改" : "创建租户"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
