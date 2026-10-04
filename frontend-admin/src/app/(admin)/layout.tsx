import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { AdminLayout } from "@/components/layout/admin-layout";

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminLayout>{children}</AdminLayout>
    </RequireAuth>
  );
}
