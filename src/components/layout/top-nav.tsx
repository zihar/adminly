"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";

import { ModeToggle } from "@/components/layout/mode-toggle";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ScopeSwitcher } from "@/components/layout/scope-switcher";
import { NavUser } from "@/components/layout/nav-user";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useI18n } from "@/components/providers/i18n-provider";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { siteConfig } from "@/config/site";
import { resolveNavLabel } from "@/locales";
import { cn } from "@/lib/utils";

/**
 * Navigasi horizontal di atas bidang `--sidebar`. Dipakai template yang
 * mendeklarasikan `shell: "topnav"` — dashboard yang ditampilkan ke ruangan
 * butuh seluruh lebar layar, dan sidebar kiri memakan ruang paling mahal.
 *
 * Daftar menu & item aktif datang dari `useVisibleNav()`, hook yang sama
 * dipakai `AppSidebar` — menambah item menu tetap sekali kerja.
 */
export function TopNav() {
  const { t } = useI18n();
  const { items, current } = useVisibleNav();

  return (
    <header className="sticky top-0 z-10 bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-6 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Boxes className="size-5" />
          <span className="font-semibold">{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === current?.href ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.href === current?.href &&
                  "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              {resolveNavLabel(t, item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ScopeSwitcher />
          <LocaleSwitcher />
          <RoleSwitcher />
          <ModeToggle />
          {/* `NavUser` dipinjam dari sidebar dan bergantung pada konteks
              `SidebarProvider` (via `SidebarMenuButton`). `className="contents"`
              membuat provider tak menghasilkan kotak/markup sidebar apa pun —
              cuma menyuplai konteks yang dibutuhkan. */}
          <SidebarProvider className="contents">
            <NavUser
              user={{ name: "Admin", email: "admin@example.com", avatar: "" }}
            />
          </SidebarProvider>
        </div>
      </div>

      {/* Menu ringkas untuk layar sempit — top-nav tak punya laci samping. */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === current?.href ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/75",
              item.href === current?.href &&
                "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            )}
          >
            {resolveNavLabel(t, item.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
