"use client";

import * as React from "react";
import {
  KeyRound,
  RotateCcw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader, SectionHeader } from "@/components/common/page-header";
import { StatCard, StatCardGrid } from "@/components/common/stat-card";
import { settings as settingSeed, settingGroups } from "@/lib/mock-data/ops";
import { label } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { Setting } from "@/types";

const GLOBAL_POLICY_KEYS = ["allowCustomModels", "allowByok", "allowLocalModels", "allowSharedModels"];

const REQUIRES_RESTART_KEYS = new Set([
  "sessionTimeoutMinutes",
  "deploymentMode",
  "maintenanceMode",
  "enabledEnvironments",
]);

const GLOBAL_POLICY_GROUP = "全局策略";
const PRIVATE_GROUP = "私有化部署";

const LICENSE_NODES = 16;
const LICENSE_EXPIRES_AT = "2027-09-30";

type SettingValue = string | number | boolean;

type DraftMap = Record<string, SettingValue>;

function buildDraft(list: Setting[]): DraftMap {
  return list.reduce<DraftMap>((map, setting) => {
    map[setting.id] = setting.value;
    return map;
  }, {});
}

export default function SettingsPage() {
  const [settingsList, setSettingsList] = React.useState<Setting[]>(settingSeed);
  const [draft, setDraft] = React.useState<DraftMap>(() => buildDraft(settingSeed));

  const [pendingToggle, setPendingToggle] = React.useState<{ setting: Setting; next: boolean } | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [licenseOpen, setLicenseOpen] = React.useState(false);
  const [licenseInput, setLicenseInput] = React.useState("");
  const [licenseExpiry, setLicenseExpiry] = React.useState(LICENSE_EXPIRES_AT);

  const defaultMap = React.useMemo(() => buildDraft(settingSeed), []);

  const findSetting = React.useCallback(
    (key: string) => settingsList.find((setting) => setting.key === key),
    [settingsList],
  );

  const modifiedIds = React.useMemo(
    () => settingsList.filter((setting) => draft[setting.id] !== defaultMap[setting.id]).map((setting) => setting.id),
    [settingsList, draft, defaultMap],
  );

  const restartCount = React.useMemo(
    () =>
      settingsList.filter(
        (setting) => REQUIRES_RESTART_KEYS.has(setting.key) && draft[setting.id] !== defaultMap[setting.id],
      ).length,
    [settingsList, draft, defaultMap],
  );

  const deploymentMode = String(findSetting("deploymentMode")?.value ?? "多租户 SaaS");
  const licenseKey = String(findSetting("licenseKey")?.value ?? "");
  const upgradeChannel = String(findSetting("upgradeChannel")?.value ?? "");

  const globalPolicies = React.useMemo(
    () => settingsList.filter((setting) => GLOBAL_POLICY_KEYS.includes(setting.key)),
    [settingsList],
  );

  const setDraftValue = (id: string, value: SettingValue) => {
    setDraft((prev) => ({ ...prev, [id]: value }));
  };

  const applyBoolean = React.useCallback((setting: Setting, next: boolean) => {
    setDraft((prev) => ({ ...prev, [setting.id]: next }));
    setSettingsList((list) =>
      list.map((item) =>
        item.id === setting.id
          ? { ...item, value: next, updatedBy: "当前管理员", updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    toast.success(`已${next ? "开启" : "关闭"}「${setting.label}」`);
  }, []);

  const handleToggle = (setting: Setting, next: boolean) => {
    if (setting.key === "maintenanceMode" && next) {
      setPendingToggle({ setting, next });
      return;
    }
    if (GLOBAL_POLICY_KEYS.includes(setting.key) && !next) {
      setPendingToggle({ setting, next });
      return;
    }
    applyBoolean(setting, next);
  };

  const saveGroup = (group: string) => {
    const ids = new Set(settingsList.filter((setting) => setting.group === group).map((setting) => setting.id));
    setSettingsList((list) =>
      list.map((setting) =>
        ids.has(setting.id)
          ? {
              ...setting,
              value: draft[setting.id] ?? setting.value,
              updatedBy: "当前管理员",
              updatedAt: new Date().toISOString(),
            }
          : setting,
      ),
    );
    toast.success("保存成功");
  };

  const submitLicense = () => {
    const setting = findSetting("licenseKey");
    if (setting) {
      setDraftValue(setting.id, licenseInput);
      setSettingsList((list) =>
        list.map((item) =>
          item.id === setting.id
            ? { ...item, value: licenseInput, updatedBy: "当前管理员", updatedAt: new Date().toISOString() }
            : item,
        ),
      );
    }
    toast.success("License 更新成功，节点扩容将在下次心跳生效");
    setLicenseOpen(false);
  };

  const renderSetting = (setting: Setting) => {
    const value = draft[setting.id] ?? setting.value;
    return (
      <div key={setting.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium">{setting.label}</p>
            {draft[setting.id] !== defaultMap[setting.id] ? (
              <Badge variant="warning">已修改</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-2xs">{setting.description}</p>
          <p className="text-muted-foreground text-2xs">
            由 {setting.updatedBy} 更新于 {formatDate(setting.updatedAt, "yyyy-MM-dd HH:mm")}
          </p>
        </div>
        <div className="w-full shrink-0 sm:w-64">
          {setting.type === "boolean" ? (
            <div className="flex items-center justify-end">
              <Switch
                checked={Boolean(value)}
                onCheckedChange={(next) => handleToggle(setting, next)}
                aria-label={setting.label}
              />
            </div>
          ) : setting.type === "number" ? (
            <Input
              type="number"
              value={String(value)}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setDraftValue(setting.id, Number.isNaN(parsed) ? 0 : parsed);
              }}
              className="text-xs"
            />
          ) : setting.type === "select" ? (
            <Select value={String(value)} onValueChange={(next) => setDraftValue(setting.id, next)}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {setting.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {label(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={String(value)}
              onChange={(event) => setDraftValue(setting.id, event.target.value)}
              className="text-xs"
            />
          )}
        </div>
      </div>
    );
  };

  const renderGroup = (group: string) => {
    const groupSettings = settingsList.filter((setting) => setting.group === group);
    const modifiedInGroup = groupSettings.some((setting) => draft[setting.id] !== defaultMap[setting.id]);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader
            title={group}
            description={`${groupSettings.length} 个设置项${modifiedInGroup ? "，包含未保存修改" : ""}`}
          />
          <Button size="sm" variant="outline" onClick={() => saveGroup(group)}>
            <Save />
            保存
          </Button>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
          {groupSettings.map(renderSetting)}
        </div>
      </div>
    );
  };

  const genericGroups = settingGroups.filter((group) => group !== GLOBAL_POLICY_GROUP);

  return (
    <PageContainer>
      <PageHeader
        title="系统设置"
        description="按分组管理平台级配置项，包含全局策略、私有化部署、维护模式与 License 授权。"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
              <RotateCcw />
              重置为默认
            </Button>
            <Button size="sm" onClick={() => toast.success("已保存全部设置")}>
              <Save />
              保存全部
            </Button>
          </>
        }
        badges={<Badge variant="secondary">演示数据</Badge>}
      />

      <StatCardGrid className="xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="设置项数" value={settingsList.length} icon={Settings2} />
        <StatCard label="已修改" value={modifiedIds.length} icon={SlidersHorizontal} tone="warning" />
        <StatCard label="需重启项" value={restartCount} icon={RotateCcw} tone="danger" hint="修改后需重启服务生效" />
        <StatCard label="私有化模式" value={deploymentMode} icon={Server} tone="info" />
        <StatCard label="License 状态" value="有效" icon={ShieldCheck} tone="success" hint={`到期 ${LICENSE_EXPIRES_AT}`} />
        <StatCard label="授权节点数" value={LICENSE_NODES} icon={KeyRound} hint="私有化部署授权节点" />
      </StatCardGrid>

      <Card className="gap-0 border-primary/30 bg-primary/5 py-4">
        <CardHeader className="pb-3">
          <SectionHeader
            title="全局策略"
            description="影响所有租户的模型接入与共享能力，修改会立即下发到网关。"
            actions={
              <Button size="sm" variant="outline" onClick={() => saveGroup(GLOBAL_POLICY_GROUP)}>
                <Save />
                保存
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
            {globalPolicies.map(renderSetting)}
          </div>
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>修改影响提示</AlertTitle>
            <AlertDescription>
              关闭「允许自定义模型」或「允许 BYOK」后，相关租户的线上调用会在下一轮对话回退到平台模型；
              关闭「允许共享模型」会使已共享的模型立刻取消共享。请提前通知受影响租户。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue={genericGroups[0] ?? "全局设置"}>
        <TabsList className="flex-wrap">
          {genericGroups.map((group) => (
            <TabsTrigger key={group} value={group}>
              {group}
            </TabsTrigger>
          ))}
        </TabsList>

        {genericGroups.map((group) => (
          <TabsContent key={group} value={group} className="space-y-3">
            {group === PRIVATE_GROUP ? (
              <Card className="gap-0 py-4">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                        <KeyRound className="size-4" />
                      </span>
                      <div>
                        <CardTitle>License 授权</CardTitle>
                        <p className="text-muted-foreground text-2xs">
                          私有化部署授权，按节点数与功能授权
                        </p>
                      </div>
                    </div>
                    <StatusBadgeInline />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-muted-foreground text-2xs">License 密钥</p>
                      <p className="mt-1 font-mono text-xs">{licenseKey}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-muted-foreground text-2xs">到期时间</p>
                      <p className="num mt-1 text-xs font-medium">{LICENSE_EXPIRES_AT}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-muted-foreground text-2xs">授权节点数</p>
                      <p className="num mt-1 text-xs font-medium">{LICENSE_NODES} 个</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-muted-foreground text-2xs">升级通道</p>
                      <p className="mt-1 text-xs font-medium">{upgradeChannel}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLicenseInput(licenseKey);
                      setLicenseExpiry(LICENSE_EXPIRES_AT);
                      setLicenseOpen(true);
                    }}
                  >
                    <KeyRound />
                    更新 License
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {renderGroup(group)}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>更新 License</DialogTitle>
            <DialogDescription>粘贴新的 License 密钥并确认到期时间，提交后立即生效。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="license-key" className="text-xs font-medium">
                License 密钥
              </Label>
              <Input
                id="license-key"
                value={licenseInput}
                onChange={(event) => setLicenseInput(event.target.value)}
                className="font-mono text-xs"
                placeholder="AGT-ENT-2026-****-****"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license-expiry" className="text-xs font-medium">
                到期时间
              </Label>
              <Input
                id="license-expiry"
                type="date"
                value={licenseExpiry}
                onChange={(event) => setLicenseExpiry(event.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLicenseOpen(false)}>
              取消
            </Button>
            <Button size="sm" onClick={submitLicense} disabled={licenseInput.trim().length === 0}>
              更新 License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingToggle !== null}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
        title={
          pendingToggle?.setting.key === "maintenanceMode"
            ? "开启维护模式？"
            : `关闭「${pendingToggle?.setting.label ?? ""}」？`
        }
        description={
          pendingToggle?.setting.key === "maintenanceMode"
            ? "开启后仅超级管理员可访问控制台，所有租户与普通管理员的请求将被拒绝，请在低峰期操作。"
            : "关闭后所有租户将立即失去该能力，已在运行的调用会在下一轮对话回退到平台默认策略，请提前通知受影响租户。"
        }
        confirmLabel={pendingToggle?.setting.key === "maintenanceMode" ? "开启维护模式" : "确认关闭"}
        onConfirm={() => {
          if (!pendingToggle) return;
          applyBoolean(pendingToggle.setting, pendingToggle.next);
          setPendingToggle(null);
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="重置为默认设置？"
        description="所有设置项将恢复为平台默认值，包括全局策略、维护模式与私有化部署配置，此操作不可撤销。"
        confirmLabel="确认重置"
        onConfirm={() => {
          setSettingsList(settingSeed);
          setDraft(buildDraft(settingSeed));
          toast.success("已重置为默认设置");
          setResetOpen(false);
        }}
      />
    </PageContainer>
  );
}

function StatusBadgeInline() {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-2xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20">
      <ShieldCheck className="size-3" />
      授权有效
    </span>
  );
}
