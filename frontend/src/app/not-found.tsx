import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="text-2xl font-semibold">页面不存在</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        你访问的管理端页面不存在或已被移动，请从控制台重新进入。
      </p>
      <Button asChild>
        <Link href="/dashboard">返回总览</Link>
      </Button>
    </div>
  );
}
