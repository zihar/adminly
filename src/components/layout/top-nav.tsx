"use client";

import Link from "next/link";
import { BadgeCheck, Boxes, ChevronsUpDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ScopeSwitcher } from "@/components/layout/scope-switcher";
import { useI18n } from "@/components/providers/i18n-provider";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { siteConfig } from "@/config/site";
import { resolveNavLabel } from "@/locales";
import { cn } from "@/lib/utils";

type TopNavUserInfo = {
  name: string;
  email: string;
  avatar?: string;
};

/**
 * Menu akun untuk top-nav — sengaja BUKAN `NavUser` yang dipakai sidebar.
 * `NavUser` merender `SidebarMenuButton`, yang mewajibkan konteks
 * `SidebarProvider`; top-nav tidak dan tidak boleh punya konteks itu (lihat
 * `src/components/ui/sidebar.tsx`, tidak boleh diubah). Isi menu sengaja
 * disamakan dengan `NavUser` (avatar+inisial, nama, email, item Account/Sign
 * out, ikon & kunci i18n yang sama) supaya kedua shell menawarkan hal yang
 * sama — hanya triggernya dibuat kompak untuk bilah horizontal, bukan baris
 * selebar sidebar.
 */
function TopNavUser({ user }: { user: TopNavUserInfo }) {
  const { t } = useI18n();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-9 gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
          />
        }
      >
        <Avatar className="size-7 rounded-lg">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-lg text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <ChevronsUpDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" align="end" sideOffset={4}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            {t.user.account}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/login" />}>
          <LogOut />
          {t.user.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
          <TopNavUser
            user={{ name: "Admin", email: "admin@example.com", avatar: "" }}
          />
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
