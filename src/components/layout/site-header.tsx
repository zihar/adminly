"use client";

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
import { ScopeSwitcher } from "@/components/layout/scope-switcher";
import { TemplateSwitcher } from "@/components/layout/template-switcher";
import { useI18n } from "@/components/providers/i18n-provider";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { resolveNavLabel } from "@/locales";

export function SiteHeader() {
  const { t } = useI18n();
  const { current } = useVisibleNav();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>
              {resolveNavLabel(t, current?.key ?? "dashboard")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <ScopeSwitcher />
        <LocaleSwitcher />
        <RoleSwitcher />
        <TemplateSwitcher />
        <ModeToggle />
      </div>
    </header>
  );
}
