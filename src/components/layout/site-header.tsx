"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useI18n } from "@/components/providers/i18n-provider";
import { navMain } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const current = navMain.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>
              {t.nav[current?.key ?? "dashboard"]}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <LocaleSwitcher />
        <RoleSwitcher />
        <ModeToggle />
      </div>
    </header>
  );
}
