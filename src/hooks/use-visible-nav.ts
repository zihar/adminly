"use client";

import { usePathname } from "next/navigation";

import { useRbac } from "@/components/providers/rbac-provider";
import { navMain, resourceNavItems, type NavItem } from "@/config/site";
import { ensureResourcesRegistered } from "@/config/resources/register";

/**
 * Satu sumber logika navigasi untuk semua shell dan breadcrumb: gabungkan
 * menu statis dengan menu turunan resource registry, saring lewat permission
 * role aktif, dan tentukan item yang cocok dengan URL sekarang.
 *
 * `current` sengaja dihitung dari daftar SEBELUM disaring — supaya breadcrumb
 * halaman yang aksesnya ditolak tetap menyebut halaman itu, persis perilaku
 * `site-header.tsx` sebelum hook ini ada.
 */
export function useVisibleNav(): {
  items: NavItem[];
  current: NavItem | undefined;
} {
  const pathname = usePathname();
  const { can } = useRbac();
  // Registry resource CRUD generik (mis. `items`) — idempotent.
  ensureResourcesRegistered();

  const all: NavItem[] = [...navMain, ...resourceNavItems()];
  const items = all.filter((item) => !item.permission || can(item.permission));
  const current = all.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return { items, current };
}
