import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hucoo/ui/components/dialog";
import { Switch } from "@hucoo/ui/components/switch";
import { Separator } from "@hucoo/ui/components/separator";
import { cn } from "@hucoo/ui";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { usePrefsStore } from "./prefs-store";

const THEME_OPTIONS: { value: Theme | "system"; label: string }[] = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "亮色" },
  { value: "dark", label: "暗色" },
];

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "⌘ K", label: "命令面板 / 搜索" },
  { keys: "⌘ B", label: "收起 / 展开侧栏" },
  { keys: "⌘ N", label: "新建会话" },
  { keys: "⌘ ,", label: "偏好设置" },
  { keys: "Enter", label: "发送消息" },
  { keys: "Shift + Enter", label: "换行" },
];

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [theme, setThemeState] = useState<Theme | "system">(() =>
    getStoredTheme(),
  );
  const reduceMotion = usePrefsStore((s) => s.reduceMotion);
  const setReduceMotion = usePrefsStore((s) => s.setReduceMotion);

  function chooseTheme(value: Theme | "system") {
    setTheme(value);
    setThemeState(value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>偏好设置</DialogTitle>
          <DialogDescription>个性化你的工作台。</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <section>
            <h3 className="text-sm font-semibold">外观主题</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              选择亮色、暗色，或跟随系统设置。
            </p>
            <div className="mt-3 inline-flex rounded-[10px] border border-border p-1">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => chooseTheme(option.value)}
                  className={cn(
                    "h-8 rounded-[8px] px-3 text-sm font-medium transition-colors",
                    theme === option.value
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">减少动效</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                降低界面动画，适合对动效敏感的场景。
              </p>
            </div>
            <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold">快捷键</h3>
            <ul className="mt-2 space-y-1.5">
              {SHORTCUTS.map((item) => (
                <li
                  key={item.keys}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <kbd className="rounded border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium">
                    {item.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
