"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useMemo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { findNavGroupByPath, findNavItemByPath } from "@/config/nav";

const DYNAMIC_LABELS: Record<string, string> = {
  tenants: "租户详情",
  users: "用户详情",
};

export function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const item = findNavItemByPath(pathname);
    const group = findNavGroupByPath(pathname);
    const result: { label: string; href?: string }[] = [];

    if (group) result.push({ label: group.label });

    if (item) {
      result.push({ label: item.label, href: pathname === item.href ? undefined : item.href });
    } else {
      result.push({ label: "控制台" });
    }

    const dynamicBase = segments[0];
    if (dynamicBase && DYNAMIC_LABELS[dynamicBase] && segments.length > 1) {
      result.push({ label: DYNAMIC_LABELS[dynamicBase] });
    }

    return result;
  }, [pathname]);

  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">首页</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.href && index < crumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
