import {
  createRootRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { Button } from "@hucoo/ui/components/button";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/features/auth/auth-store";

function NotFound() {
  return (
    <div className="mx-auto grid max-w-3xl place-items-center pt-24 text-center">
      <p className="text-4xl font-bold tabular-nums text-muted-foreground/40">
        404
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        页面不存在或已被移除。
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link to="/">返回工作台</Link>
      </Button>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
  beforeLoad: ({ location }) => {
    const { token } = useAuthStore.getState();
    if (location.pathname === "/login") {
      if (token) throw redirect({ to: "/" });
      return;
    }
    if (!token) throw redirect({ to: "/login" });
  },
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/login") return <Outlet />;
  return <AppShell />;
}
