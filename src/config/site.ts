import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/config/rbac";

/**
 * Konfigurasi global aplikasi. Ganti nilai-nilai di sini saat memakai
 * starter ini untuk project baru — selebihnya UI ikut menyesuaikan.
 */
export const siteConfig = {
  name: "Adminly",
  description:
    "Generic internal-tool dashboard starter — fork it for each new project.",
};

/** Kunci label navigasi → dicocokkan ke kamus i18n (`t.nav[key]`). */
export type NavKey = "dashboard" | "users" | "analytics" | "settings";

export type NavItem = {
  /** Kunci i18n untuk judul (lihat `t.nav`). */
  key: NavKey;
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
