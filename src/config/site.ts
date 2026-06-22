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
  description: "Starter dashboard untuk internal tool — siap di-fork tiap project baru.",
};

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permission yang dibutuhkan agar item ini tampil di sidebar. */
  permission?: Permission;
};

/** Item navigasi utama di sidebar. */
export const navMain: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { title: "Pengguna", href: "/users", icon: Users, permission: "users:manage" },
  { title: "Analitik", href: "/analytics", icon: BarChart3, permission: "analytics:view" },
  { title: "Pengaturan", href: "/settings", icon: Settings, permission: "settings:manage" },
];
