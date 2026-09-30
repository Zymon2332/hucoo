import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LockSimple, Robot, Spinner } from "@phosphor-icons/react";
import { ApiError } from "@hucoo/sdk";
import { Card } from "@hucoo/ui/components/card";
import { Button } from "@hucoo/ui/components/button";
import { Input } from "@hucoo/ui/components/input";
import { Label } from "@hucoo/ui/components/label";
import {
  Alert,
  AlertDescription,
} from "@hucoo/ui/components/alert";
import { sdk } from "@/lib/sdk";
import { useAuthStore, type AuthSession } from "./auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState("admin@hucoo.dev");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const session = await sdk.post<AuthSession>("/api/v1/auth/login", {
        username,
        password,
      });
      setSession(session);
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <Card className="w-full max-w-sm gap-0 p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Robot size={20} weight="fill" />
          </div>
          <div>
            <p className="text-sm font-semibold">Hucoo 工作台</p>
            <p className="text-xs text-muted-foreground">登录以继续</p>
          </div>
        </div>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="username">账号</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <Alert className="border-destructive/40 bg-destructive/10">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Spinner size={16} className="animate-spin" />
            ) : (
              <LockSimple size={16} weight="bold" />
            )}
            登录
          </Button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          演示环境：任意非空账号密码即可登录
        </p>
      </Card>
    </div>
  );
}
