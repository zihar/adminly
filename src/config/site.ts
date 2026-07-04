import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/config/rbac";
import { resourceRoutePermissions } from "@/config/rbac";
import { allResources } from "@/config/resources/index";

/**
 * Konfigurasi global aplikasi. Ganti nilai-nilai di sini saat memakai
 * starter ini untuk project baru — selebihnya UI ikut menyesuaikan.
 */
export const siteConfig = {
  name: "Adminly",
  description:
    "Generic internal-tool dashboard starter — fork it for each new project.",
};

/** Kunci label navigasi statis → dicocokkan ke kamus i18n (`t.nav[key]`). */
export type NavKey = "dashboard" | "users" | "analytics" | "settings";

export type NavItem = {
  /**
   * Untuk item statis: kunci i18n `t.nav[key]` (lihat `NavKey`).
   * Untuk item resource (dari registry): nama resource, mis. "items" —
   * di-render lewat `resolveNavLabel(t, key)` dari `@/locales` (lihat
   * `app-sidebar.tsx` / `site-header.tsx`).
   * Longgar ke `string` supaya nav bisa digabung dgn resource dinamis.
   */
  key: string;
  href: string;
  icon: LucideIcon;
  /** Permission yang dibutuhkan agar item ini tampil di sidebar. */
  permission?: Permission;
};

/** Item navigasi utama di sidebar. Label diambil dari kamus i18n via `key`. */
export const navMain: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { key: "users", href: "/users", icon: Users, permission: "users:manage" },
  { key: "analytics", href: "/analytics", icon: BarChart3, permission: "analytics:view" },
  { key: "settings", href: "/settings", icon: Settings, permission: "settings:manage" },
];

/**
 * Item navigasi turunan dari resource registry (`allResources()`), supaya
 * resource CRUD generik (mis. `items`) otomatis muncul di sidebar tanpa
 * perlu ditambahkan manual ke `navMain`.
 */
export function resourceNavItems(): NavItem[] {
  return allResources().map((r) => ({
    key: r.name,
    href: `/${r.name}`,
    icon: r.nav?.icon ?? LayoutDashboard,
    permission: r.permissions.view,
  }));
}

/**
 * Re-export dari `@/config/rbac` — didefinisikan di sana (modul pure, tanpa
 * import React/ikon) supaya `proxy.ts` bisa memakainya langsung tanpa ikut
 * menarik `lucide-react`. Diekspor ulang di sini agar konsumen nav (mis.
 * test, sidebar) bisa mengimpor `resourceNavItems` & `resourceRoutePermissions`
 * dari satu tempat yang sama: `@/config/site`.
 */
export { resourceRoutePermissions };
