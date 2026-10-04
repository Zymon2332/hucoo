"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORG_TYPE_LABEL, ORG_TYPE_OPTIONS, type OrgTreeIndex } from "@/lib/org-tree";
import { tenants } from "@/lib/mock-data/tenants";
import { cn } from "@/lib/utils";
import type { Organization, OrganizationType } from "@/types";

export const orgFormSchema = z.object({
  name: z.string().trim().min(2, "组织名称至少 2 个字符").max(40, "组织名称不超过 40 个字符"),
  owner: z.string().trim().min(2, "请填写负责人姓名").max(20, "负责人姓名不超过 20 个字符"),
  tenantId: z.string().min(1, "请选择所属租户"),
  type: z.enum(["company", "department", "team"]),
  parentId: z.string(),
});

export type OrgFormValues = z.infer<typeof orgFormSchema>;

const TENANT_OPTIONS = tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }));

/** 子组织类型跟随父组织类型收敛，避免出现「公司挂在团队下」这类非法层级。 */
function defaultChildType(parent: Organization | null): OrganizationType {
  if (!parent) return "department";
  if (parent.type === "company") return "department";
  return "team";
}

interface OrgFormDialogProps {
  open: boolean;
  editing: Organization | null;
  /** 新建时预设的上级组织 */
  parentForCreate: Organization | null;
  index: OrgTreeIndex;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrgFormValues) => void;
}

export function OrgFormDialog({
  open,
  editing,
  parentForCreate,
  index,
  pending,
  onOpenChange,
  onSubmit,
}: OrgFormDialogProps) {
  const [parentOpen, setParentOpen] = React.useState(false);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      owner: "",
      tenantId: tenants[0]?.id ?? "",
      type: "department",
      parentId: "",
    },
  });

  const presetParent = editing
    ? editing.parentId
      ? (index.nodeById.get(editing.parentId) ?? null)
      : null
    : parentForCreate;
  const tenantLocked = Boolean(presetParent) || Boolean(editing);

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      name: editing?.name ?? "",
      owner: editing?.owner ?? "",
      tenantId: editing?.tenantId ?? presetParent?.tenantId ?? tenants[0]?.id ?? "",
      type: editing?.type ?? defaultChildType(presetParent),
      parentId: presetParent?.id ?? "",
    });
  }, [open, editing, presetParent, form]);

  /** 可选上级：排除自身与其所有下级，避免形成环。 */
  const parentCandidates = React.useMemo(() => {
    if (!editing) return [...index.nodeById.values()];
    const blocked = new Set<string>();
    const stack = [editing.id];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (blocked.has(id)) continue;
      blocked.add(id);
      for (const child of index.childrenByParent.get(id) ?? []) stack.push(child.id);
    }
    return [...index.nodeById.values()].filter((org) => !blocked.has(org.id));
  }, [editing, index]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `编辑组织 · ${editing.name}`
              : presetParent
                ? `新建下级组织 · 上级「${presetParent.name}」`
                : "新建组织"}
          </DialogTitle>
          <DialogDescription>
            数据仅保存在本地状态，用于演示组织层级的创建与编辑流程。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-busy={pending}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>组织名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：智能引擎事业部" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>负责人</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：陈立" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>组织类型</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ORG_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属租户</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={tenantLocked}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full" aria-describedby="org-tenant-hint">
                          <SelectValue placeholder="选择租户" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TENANT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {tenantLocked ? (
                      <p id="org-tenant-hint" className="text-muted-foreground text-2xs">
                        下级组织必须与上级同租户，不支持跨租户移动。
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => {
                  const selected = field.value ? index.nodeById.get(field.value) : null;
                  return (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>上级组织</FormLabel>
                      <Popover open={parentOpen} onOpenChange={setParentOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={parentOpen}
                              aria-label="选择上级组织"
                              className="w-full justify-between rounded-lg font-normal"
                            >
                              <span className="truncate">
                                {selected
                                  ? `${selected.name}（${ORG_TYPE_LABEL[selected.type]}）`
                                  : "无（顶层组织）"}
                              </span>
                              <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-(--radix-popover-trigger-width) min-w-72 p-0"
                        >
                          <Command>
                            <CommandInput placeholder="搜索组织名称或编码…" />
                            <CommandList>
                              <CommandEmpty>没有匹配的组织</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="__none__ 顶层组织"
                                  onSelect={() => {
                                    field.onChange("");
                                    setParentOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "size-3.5",
                                      field.value === "" ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  无（顶层组织）
                                </CommandItem>
                                {parentCandidates.map((candidate) => (
                                  <CommandItem
                                    key={candidate.id}
                                    value={`${candidate.name} ${candidate.code} ${candidate.id}`}
                                    onSelect={() => {
                                      field.onChange(candidate.id);
                                      setParentOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "size-3.5 shrink-0",
                                        field.value === candidate.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    <span className="truncate">{candidate.name}</span>
                                    <span className="text-muted-foreground text-2xs ml-auto shrink-0 font-mono">
                                      {candidate.code}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        共 {parentCandidates.length}{" "}
                        个可选上级，已自动排除自身及其下级组织以避免层级成环。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {editing ? "保存修改" : "创建组织"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
