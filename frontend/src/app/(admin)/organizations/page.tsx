import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationsWorkspace } from "@/components/organizations/organizations-workspace";

export const metadata: Metadata = {
  title: "组织架构",
  description: "以左侧组织树定位、右侧详情管理的方式维护公司 / 部门 / 团队层级。",
};

function WorkspaceFallback() {
  return (
    <div className="flex flex-col gap-3 p-5 lg:h-full lg:p-7" aria-busy>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid min-h-0 gap-3 lg:flex-1 lg:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)]">
        <Skeleton className="h-[34svh] rounded-xl lg:h-full" />
        <Skeleton className="h-[72svh] rounded-xl lg:h-full" />
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    // useSearchParams 需要 Suspense 边界，否则整页会退化为客户端渲染
    <Suspense fallback={<WorkspaceFallback />}>
      <OrganizationsWorkspace />
    </Suspense>
  );
}
